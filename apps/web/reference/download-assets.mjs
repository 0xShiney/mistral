/**
 * Download every media asset referenced by the captured routes into public/,
 * preserving the original paths.
 *
 *   node reference/download-assets.mjs
 *
 * Sources of truth, combined: the network responses of the live page (which
 * catches lazy images after a full scroll), the DOM (img/source/video/style)
 * and the page's own stylesheets (background images). Astro-transformed media
 * under /_astro/ is stored in public/media/ with the original hashed filename,
 * exactly like the existing homepage clone.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const ORIGIN = 'https://mistral.ai'
const PAGES = [
  '/products/',
  '/products/vibe/',
  '/products/studio/',
  '/products/forge/',
  '/cloud/inference/',
  '/cloud/compute/',
  '/our-method/',
  '/use-cases/',
  '/sovereign-ai/',
  '/customers/',
  '/industry/',
  ...['cybersecurity', 'energy', 'financial-services', 'manufacturing', 'public-sector'].map(
    (slug) => `/industry/${slug}/`,
  ),
  ...[
    'airbus',
    'ardian',
    'asml',
    'austrian-academy-of-sciences',
    'axa',
    'belfius',
    'bigdatacorp',
    'bmw',
    'bnp-paribas',
    'capgemini',
    'cisco',
    'cma-cgm',
    'dso',
    'epo',
    'ericsson',
    'france-travail',
    'french-ministry-of-defense',
    'gojob',
    'government-of-luxembourg',
    'groupe-mutuel',
    'harvey',
    'hsbc',
    'htx',
    'ibm',
    'knowunity',
    'mars',
    'ministry-of-high-tech-industry-of-armenia',
    'mongodb',
    'naver-cloud',
    'orange',
    'pierre-fabre',
    'pretto',
    'sap',
    'singapores-ministry-of-defence-mindef',
    'sncf',
    'snowflake',
    'stellantis',
    'superinsight',
    'synapse-medicine',
    'totalenergies',
    'university-of-groningen',
    'veolia',
  ].map((slug) => `/customers/${slug}/`),
  ...[
    'ai-fact-checking-for-live-broadcasts',
    'ai-for-cad-workflows',
    'ai-for-code-review',
    'ai-for-credit-analysis',
    'ai-for-customer-support',
    'ai-for-deal-sourcing',
    'ai-for-industrial-site-monitoring',
    'ai-for-kyc-onboarding',
    'ai-for-logistics-document-extraction',
    'ai-for-pandid-analysis',
    'ai-for-penetration-testing',
    'ai-for-rfp-responses',
    'ai-guardrails-for-chatbots',
    'physics-ai-for-aerodynamic-optimization',
    'physics-ai-for-injection-molding-simulation',
    'voice-ai-for-customer-support',
  ].map((slug) => `/use-cases/${slug}/`),
]
const MEDIA_EXT = /\.(webp|avif|jpe?g|png|gif|svg|mp4|webm|woff2?|ttf|otf|json)(\?|$)/i
const IGNORE = /(^|\/)(rss|sitemap)|_next|gtm|axeptio|hubspot|contentsquare/i

function localPath(url) {
  const u = new URL(url)
  let p = decodeURIComponent(u.pathname)
  if (p.startsWith('/_astro/')) p = '/media/' + p.slice('/_astro/'.length)
  return path.join('public', p)
}

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

const browser = await chromium.launch()
const found = new Set()

for (const route of PAGES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('response', (res) => {
    const url = res.url()
    if (!url.startsWith(ORIGIN)) return
    if (MEDIA_EXT.test(url) && !IGNORE.test(url)) found.add(url)
  })
  await page.goto(ORIGIN + route, { waitUntil: 'load', timeout: 90000 })
  // walk the page so lazy images, sliders and scroll-triggered media mount
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.7)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 500))
  })
  await page.waitForTimeout(1500)
  const dom = await page.evaluate(() => {
    const urls = new Set()
    const add = (v) => {
      if (!v) return
      for (const part of String(v).split(',')) {
        const candidate = part.trim().split(/\s+/)[0]
        if (candidate) urls.add(new URL(candidate, location.href).href)
      }
    }
    for (const el of document.querySelectorAll('img')) {
      add(el.getAttribute('src'))
      add(el.getAttribute('srcset'))
      add(el.getAttribute('data-src'))
    }
    for (const el of document.querySelectorAll('source')) {
      add(el.getAttribute('src'))
      add(el.getAttribute('srcset'))
    }
    for (const el of document.querySelectorAll('video')) {
      add(el.getAttribute('src'))
      add(el.getAttribute('poster'))
    }
    for (const el of document.querySelectorAll('[style*="url("]')) {
      const m = /url\(["']?([^"')]+)/g
      let x
      while ((x = m.exec(el.getAttribute('style')))) add(x[1])
    }
    for (const sheet of document.styleSheets) {
      let rules
      try {
        rules = sheet.cssRules
      } catch {
        continue
      }
      for (const rule of rules) {
        const text = rule.cssText || ''
        const m = /url\(["']?([^"')]+)/g
        let x
        while ((x = m.exec(text))) add(x[1])
      }
    }
    return [...urls]
  })
  for (const url of dom) if (url.startsWith(ORIGIN) && MEDIA_EXT.test(url) && !IGNORE.test(url)) found.add(url)
  console.log(`${route}: ${found.size} unique assets so far`)
  await context.close()
}
await browser.close()

let downloaded = 0
let skipped = 0
for (const url of [...found].sort()) {
  const file = localPath(url)
  if (await exists(file)) {
    skipped++
    continue
  }
  const res = await fetch(url)
  if (!res.ok) {
    console.log(`FAIL ${res.status} ${url}`)
    continue
  }
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()))
  downloaded++
  console.log(`GET  ${url.replace(ORIGIN, '')} -> ${file}`)
}
console.log(`\n${downloaded} downloaded, ${skipped} already present, ${found.size} referenced`)
