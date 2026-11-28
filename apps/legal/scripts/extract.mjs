#!/usr/bin/env node
/**
 * Extract https://legal.mistral.ai into this app.
 *
 *  - crawls every internal link from `/` (BFS, including hidden tab/accordion
 *    links and `?language=` variants), recording status, redirects and metadata
 *  - snapshots the raw server HTML per route under reference/legal/source/
 *  - downloads the complete asset graph (page assets, CSS url(), recursive JS
 *    imports, the search index, favicons) into public/, preserving original
 *    paths and `?dpl=` query strings
 *  - writes typed content JSON per route under src/content/pages/
 *  - writes reference/legal/site-map.json
 *
 * `--check` re-extracts from the live site and diffs against the stored copy,
 * reporting upstream changes without writing anything.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'node-html-parser'

const here = dirname(fileURLToPath(import.meta.url))
const appDir = join(here, '..')
const repo = join(appDir, '..', '..')
const ORIGIN = (process.env.LEGAL_ORIGIN || 'https://legal.mistral.ai').replace(/\/$/, '')
const CHECK = process.argv.includes('--check')
const REF = join(repo, 'reference', 'legal')
const SOURCE = join(REF, 'source')
const PUBLIC = join(appDir, 'public')
const CONTENT = join(appDir, 'src', 'content', 'pages')

const SKIP_EXT = /\.(css|js|mjs|png|jpe?g|svg|webp|gif|avif|ico|pdf|xml|txt|json|woff2?|ttf|otf|mp4|webm|zip)$/i
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
const decode = (s) => {
  try {
    return decodeURI(s)
  } catch {
    return s
  }
}

function safeName(pathname) {
  const clean = decode(pathname).replace(/^\/+|\/+$/g, '')
  if (!clean) return '_root'
  return clean.replace(/[^a-zA-Z0-9._-]+/g, '__')
}

async function get(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; legal-clone study replica)' } })
  const buf = Buffer.from(await res.arrayBuffer())
  return { res, buf }
}

/* ------------------------------------------------------------------ crawl */
async function crawl() {
  const seen = new Map()
  const queue = ['/', '/terms', '/ai-governance/models', '/ai-governance/ai-systems']
  while (queue.length) {
    const path = queue.shift()
    if (seen.has(path)) continue
    const url = new URL(path, ORIGIN)
    if (url.origin !== ORIGIN) continue
    let res, buf
    try {
      ;({ res, buf } = await get(url.href))
    } catch (err) {
      seen.set(path, { status: 'ERR', error: String(err) })
      continue
    }
    const isHtml = (res.headers.get('content-type') || '').includes('text/html')
    const html = isHtml ? buf.toString('utf8') : ''
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''
    const description = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''
    const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || ''
    const links = html ? [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]) : []
    const localLinks = [
      ...new Set(
        links
          .map((href) => {
            try {
              const u = new URL(href, url)
              if (u.origin !== ORIGIN) return null
              return u.pathname + u.search
            } catch {
              return null
            }
          })
          .filter(Boolean),
      ),
    ]
    seen.set(path, {
      path,
      status: res.status,
      location: res.headers.get('location') || undefined,
      contentType: res.headers.get('content-type') || undefined,
      bytes: buf.length,
      hash: sha(buf),
      title,
      description,
      canonical,
      html: res.status === 200 && isHtml ? html : undefined,
      links: localLinks,
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const loc = new URL(res.headers.get('location'), url)
      if (loc.origin === ORIGIN && !seen.has(loc.pathname + loc.search)) queue.push(loc.pathname + loc.search)
    }
    for (const link of localLinks) {
      if (SKIP_EXT.test(new URL(link, ORIGIN).pathname)) continue
      if (!seen.has(link)) queue.push(link)
    }
  }
  return seen
}

/* ---------------------------------------------------------------- assets */
function collectCssUrls(css) {
  const urls = []
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) urls.push(m[2])
  return urls
}

function collectJsImports(js) {
  const out = []
  for (const m of js.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) out.push(m[1])
  return out
}

function collectPageAssets(html) {
  const urls = new Set()
  // `component-url` / `renderer-url` carry the hydrated island chunks and never
  // appear as src/href attributes.
  for (const m of html.matchAll(/(?:src|href|poster|data-src|component-url|renderer-url)="([^"]+)"/g)) urls.add(m[1])
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const candidate = part.trim().split(/\s+/)[0]
      if (candidate) urls.add(candidate)
    }
  }
  for (const m of html.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) urls.add(m[2])
  return [...urls]
}

function localAssetPath(raw, basePath = '/') {
  try {
    const u = new URL(raw.replaceAll('&amp;', '&'), ORIGIN + basePath)
    if (u.origin !== ORIGIN) return null
    if (!/^\/(?:_astro|images|fonts|icons|documents|files|media|assets|ckeditor|uploads)\//.test(u.pathname) &&
        !/^\/(favicon\.(svg|ico)|search-index\.json|robots\.txt|site\.webmanifest)$/.test(u.pathname)) {
      return null
    }
    return decode(u.pathname)
  } catch {
    return null
  }
}

async function downloadAssets(pages) {
  const files = new Map() // pathname -> buffer
  const failed = []
  const queue = []

  const enqueue = (pathname, from) => {
    if (!pathname || files.has(pathname) || queue.some((q) => q.pathname === pathname)) return
    queue.push({ pathname, from })
  }

  for (const page of pages) {
    for (const raw of collectPageAssets(page.html)) {
      const pathname = localAssetPath(raw, page.path)
      if (pathname) enqueue(pathname, page.path)
    }
  }
  for (const extra of ['/search-index.json', '/favicon.svg', '/favicon.ico', '/images/og-image.png']) enqueue(extra, 'seed')

  while (queue.length) {
    const { pathname } = queue.shift()
    let buf
    try {
      const { res, buf: body } = await get(ORIGIN + pathname)
      if (!res.ok) {
        failed.push({ pathname, status: res.status })
        continue
      }
      buf = body
    } catch (err) {
      failed.push({ pathname, status: String(err) })
      continue
    }
    files.set(pathname, buf)
    const ext = posix.extname(pathname).toLowerCase()
    if (ext === '.css') {
      for (const ref of collectCssUrls(buf.toString('utf8'))) {
        const p = localAssetPath(ref, pathname)
        if (p) enqueue(p, pathname)
      }
    } else if (ext === '.js' || ext === '.mjs') {
      for (const ref of collectJsImports(buf.toString('utf8'))) {
        if (!ref.startsWith('.')) continue
        const resolved = posix.normalize(posix.join(posix.dirname(pathname), ref.split('?')[0]))
        enqueue(resolved, pathname)
      }
    }
  }
  return { files, failed }
}

/* --------------------------------------------------------------- content */
function extractStructured(html, path) {
  const root = parse(html)
  const body = root.querySelector('body')
  const head = root.querySelector('head')
  const main = root.querySelector('main') || body
  const headings = [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
    level: Number(h.tagName.slice(1)),
    id: h.getAttribute('id') || '',
    text: h.text.replace(/\s+/g, ' ').trim(),
  }))
  const links = [...main.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: a.text.replace(/\s+/g, ' ').trim() }))
  const images = [...main.querySelectorAll('img')].map((img) => ({
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || '',
  }))
  const islands = [...root.querySelectorAll('astro-island')].map((el) => ({
    name: el.getAttribute('opts') ? (JSON.parse(el.getAttribute('opts').replaceAll('&quot;', '"')).name ?? '') : '',
    component: el.getAttribute('component-url') || '',
    client: el.getAttribute('client') || '',
    ssr: el.hasAttribute('ssr'),
  }))
  const text = (main?.text || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
  const meta = (name) => head?.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? ''
  const og = (prop) => head?.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ?? ''
  return {
    path,
    title: (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '',
    description: meta('description'),
    generator: meta('generator'),
    viewport: meta('viewport'),
    ogTitle: og('og:title'),
    ogDescription: og('og:description'),
    ogUrl: og('og:url'),
    ogImage: og('og:image'),
    twitterCard: head?.querySelector('meta[name="twitter:card"]')?.getAttribute('content') ?? '',
    headings,
    links,
    images,
    islands,
    text,
    html,
  }
}

/* ------------------------------------------------------------------ main */
const map = await crawl()
const pages = [...map.values()].filter((p) => p.status === 200 && p.html)

if (CHECK) {
  let drift = 0
  for (const page of pages) {
    const file = join(SOURCE, safeName(page.path) + '.html')
    if (!existsSync(file)) {
      console.log(`MISSING SOURCE  ${page.path}`)
      drift++
      continue
    }
    if (sha(readFileSync(file)) !== page.hash) {
      console.log(`CHANGED         ${page.path}`)
      drift++
    }
  }
  console.log(drift ? `${drift} route(s) drifted upstream` : 'no upstream drift')
  process.exit(drift ? 1 : 0)
}

rmSync(SOURCE, { recursive: true, force: true })
mkdirSync(SOURCE, { recursive: true })
mkdirSync(CONTENT, { recursive: true })

const { files, failed } = await downloadAssets(pages)

for (const [pathname, buf] of files) {
  const dest = join(PUBLIC, pathname)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, buf)
}

const siteMap = {}
for (const [path, entry] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const { html, ...rest } = entry
  siteMap[path] = {
    ...rest,
    links: rest.links ?? [],
    source: html ? `source/${safeName(path)}.html` : undefined,
    islands: html ? (html.match(/<astro-island/g) || []).length : 0,
  }
  if (html) {
    const structured = extractStructured(html, path)
    writeFileSync(join(SOURCE, safeName(path) + '.html'), html)
    writeFileSync(join(CONTENT, safeName(path) + '.json'), JSON.stringify(structured))
    // Astro cannot prerender a dynamic param containing a space, so this route
    // (the origin's real `/ai-governance/models/lidstral arabic/`) is served as
    // a static file with its exact canonical path.
    if (/\s|%20/i.test(path)) {
      // Write both the decoded directory (normal static-server behaviour) and
      // the literal %20 form (servers that do not decode before lookup).
      for (const name of new Set([decode(path), path])) {
        const dest = join(PUBLIC, name, 'index.html')
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, html)
      }
    }
  }
}

// The 404 document is served by the host (not linked, so the crawl never sees it).
let notFound = ''
try {
  const { res, buf } = await get(ORIGIN + '/this-route-does-not-exist')
  if (res.status === 404) notFound = buf.toString('utf8')
} catch {
  /* ignore */
}
if (notFound) {
  writeFileSync(join(SOURCE, '404.html'), notFound)
  writeFileSync(join(CONTENT, '_not-found.json'), JSON.stringify({ path: '/404', status: 404, html: notFound, text: parse(notFound).querySelector('body')?.text.trim() ?? '' }))
}

// ------------------------------------------------------- host configuration
// The origin normalises every extensionless route to a trailing slash and
// 301s `/terms` to the Get started document. Reproduce those redirects for
// static hosts (`_redirects`) and Astro's dev server (`redirects` in config).
const redirectLines = ['# Generated by scripts/extract.mjs from the origin crawl.']
for (const entry of [...map.values()]) {
  if (entry.status >= 300 && entry.status < 400 && entry.location) {
    const targetUrl = new URL(entry.location, ORIGIN)
    let target = targetUrl.pathname + targetUrl.search
    // Collapse chains (`/terms` → `/terms/get-started` → `/terms/get-started/`)
    // to the final canonical document for a single redirect hop.
    if (!target.endsWith('/') && pages.some((p) => p.path === target + '/')) target += '/'
    redirectLines.push(`${entry.path.split('?')[0]}  ${target}  301`)
  }
}
for (const page of pages) {
  if (page.path === '/' || !page.path.endsWith('/')) continue
  const bare = page.path.replace(/\/$/, '')
  if (!redirectLines.some((line) => line.startsWith(`${bare}  `))) redirectLines.push(`${bare}  ${page.path}  301`)
}
writeFileSync(join(PUBLIC, '_redirects'), [...new Set(redirectLines)].join('\n') + '\n')

// Hard safeguard: this study replica must never be indexed as the real Legal Center.
writeFileSync(
  join(PUBLIC, 'robots.txt'),
  [
    '# Unofficial non-authoritative study replica of legal.mistral.ai.',
    '# It is not the authoritative Legal Center and is not legal advice.',
    'User-agent: *',
    'Disallow: /',
    '',
  ].join('\n'),
)

mkdirSync(REF, { recursive: true })
writeFileSync(join(REF, 'site-map.json'), JSON.stringify(siteMap, null, 2))
writeFileSync(
  join(REF, 'assets.json'),
  JSON.stringify(
    [...files.entries()].map(([pathname, buf]) => ({ pathname, bytes: buf.length, sha256: sha(buf) })).sort((a, b) => a.pathname.localeCompare(b.pathname)),
    null,
    2,
  ),
)

console.log(`routes: ${map.size} (${pages.length} rendered, ${[...map.values()].filter((p) => p.status >= 300 && p.status < 400).length} redirects)${notFound ? ', 404 captured' : ''}`)
console.log(`assets: ${files.size} downloaded${failed.length ? `, ${failed.length} failed` : ''}`)
if (failed.length) for (const f of failed.slice(0, 20)) console.log(`  FAILED ${f.status} ${f.pathname}`)
