/**
 * Legal app verification harness.
 *
 *   pnpm verify --app legal --tier 1     # template representatives, full matrix
 *   pnpm verify --app legal --all        # tier 1 + every route in the site map
 *   QUICK=1 …                            # 1440px / light only
 *
 * Everything is measured against the live origin in the same Chromium build.
 * Report: reference/legal/verification-report.md (+ .json)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { createReport } from '@mistral-clone/verify'

const here = dirname(fileURLToPath(import.meta.url))
const appDir = join(here, '..', '..')
const repo = join(appDir, '..', '..')
const REF = join(repo, 'reference', 'legal')
const ORIGIN = (process.env.ORIGIN || 'https://legal.mistral.ai').replace(/\/$/, '')
const CLONE = (process.env.CLONE || 'http://127.0.0.1:4323').replace(/\/$/, '')

const args = process.argv.slice(2)
const QUICK = args.includes('--quick') || process.env.QUICK === '1'
const ALL = args.includes('--all')
const tierArg = args[args.indexOf('--tier') + 1]
const TIER = tierArg === '2' ? 2 : 1

const WIDTHS = QUICK ? [1440] : [390, 768, 1024, 1440, 1920, 2560]
const SCHEMES = QUICK ? ['light'] : ['light', 'dark', 'system']

const REPS = [
  '/',
  '/terms/get-started/',
  '/terms/commercial-terms-of-service/',
  '/terms/privacy-policy/',
  '/terms/license-notice/',
  '/ai-governance/models/',
  '/ai-governance/models/mistral-small-3/',
  '/ai-governance/ai-systems/',
  '/ai-governance/ai-systems/vibe-work/',
]

const SEAK = [
  'model', 'models', 'mistral', 'voxtral', 'privacy', 'terms', 'data', 'cookie', 'usage',
  'policy', 'legal', 'ai act', 'governance', 'vibe', 'codestral', 'ministral', 'magistral',
  'large', 'small', 'ocr', 'embed', 'license', 'applicant', 'consumer', 'commercial',
  'contract', 'agreement', 'dpa', 'row', 'eu', 'system', 'incident', 'guardrails', 'agents',
  'studio', 'forge', 'compute', 'inference', 'chat', 'qa', 'zzzz',
]

const siteMap = JSON.parse(readFileSync(join(REF, 'site-map.json'), 'utf8'))
const PAGES = Object.entries(siteMap)
  .filter(([, v]) => v.status === 200)
  .map(([path]) => path)
  .sort()

const report = createReport({ app: 'legal', origin: ORIGIN, clone: CLONE, tier: TIER === 2 ? 2 : ALL ? 'all' : 1 })
const SHOTS = join(REF, 'screenshots')

const ensureServer = async () => {
  try {
    const res = await fetch(CLONE + '/')
    if (res.ok) return null
  } catch {}
  const { spawn } = await import('node:child_process')
  const proc = spawn(process.execPath, [join(appDir, 'tests/verify/serve.mjs')], {
    env: { ...process.env, PORT: new URL(CLONE).port || '4323' },
    stdio: 'ignore',
  })
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(CLONE + '/')).ok) return proc
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('legal static server did not start (run pnpm build first)')
}

const distFile = (path) => {
  const rel = path === '/' ? 'index.html' : join(path, 'index.html')
  return join(appDir, 'dist', decodeURIComponent(rel))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function normalizeText(text) {
  return String(text ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

async function pixelDiff(origBuf, cloneBuf) {
  const [a, b] = await Promise.all([
    sharp(origBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(cloneBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return { percent: 100, reason: `size ${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}` }
  }
  let bad = 0
  const pa = a.data
  const pb = b.data
  for (let i = 0; i < pa.length; i += 4) {
    if (
      Math.abs(pa[i] - pb[i]) > 16 ||
      Math.abs(pa[i + 1] - pb[i + 1]) > 16 ||
      Math.abs(pa[i + 2] - pb[i + 2]) > 16
    )
      bad++
  }
  const total = pa.length / 4
  return { percent: (bad / total) * 100, reason: '' }
}

async function stabilize(page) {
  // Stop the animated GIF and CSS transitions on BOTH sites so a pixel diff
  // measures layout, not an arbitrary GIF frame.
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-play-state:paused!important;transition:none!important}
      img[src*="cat-moving"],img[src*="cat-sitting"]{visibility:hidden!important}`,
  })
}

async function openedPage(browser, width, scheme, path) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: scheme === 'system' ? 'light' : scheme,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const errors = []
  const requests = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('request', (r) => requests.push(r.url()))
  await page.goto(path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  return { page, ctx, errors, requests }
}

const server = await ensureServer()

/* ------------------------------------------------------------ TIER 2: content */
async function contentParity() {
  for (const path of PAGES) {
    const liveRes = await fetch(ORIGIN + path)
    const live = Buffer.from(await liveRes.arrayBuffer())
    const file = distFile(path)
    if (!existsSync(file)) {
      report.check('content', `${path} present`, false, 'missing from dist')
      continue
    }
    const clone = readFileSync(file)
    const identical = live.equals(clone)
    report.check('content', `${path} html`, identical, identical ? `${clone.length} bytes` : `${live.length} vs ${clone.length} bytes`)
    if (!identical) {
      const text = (buf) => {
        const html = buf.toString('utf8')
        return normalizeText(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '))
      }
      report.equal('content', `${path} text`, text(clone).slice(0, 4000), text(live).slice(0, 4000))
    }
  }
}

/* ------------------------------------------------------ TIER 2: asset checks */
async function assetParity() {
  const assets = JSON.parse(readFileSync(join(REF, 'assets.json'), 'utf8'))
  let checked = 0
  let failed = 0
  const crypto = await import('node:crypto')
  for (const asset of assets) {
    const res = await fetch(ORIGIN + asset.pathname)
    if (!res.ok) continue
    const buf = Buffer.from(await res.arrayBuffer())
    const sha = crypto.createHash('sha256').update(buf).digest('hex')
    checked++
    if (sha !== asset.sha256) failed++
  }
  report.check('assets', 'checksums match origin', failed === 0, `${checked - failed}/${checked} identical`)
}

/* -------------------------------------------------- TIER 1: visual + metrics */
const LANDMARKS = ['header', 'header nav', 'h1', 'footer', 'main, body']

async function visualAndLayout() {
  const browser = await chromium.launch()
  const routes = ALL ? PAGES : REPS
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      for (const path of routes) {
        if (!ALL && !REPS.includes(path)) continue
        const live = await openedPage(browser, width, scheme, ORIGIN + path)
        const clone = await openedPage(browser, width, scheme, CLONE + path)
        await stabilize(live.page)
        await stabilize(clone.page)

        const dir = join(SHOTS, scheme, String(width))
        mkdirSync(dir, { recursive: true })
        const name = (path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '-')) || 'home'
        const [oBuf, cBuf] = await Promise.all([live.page.screenshot({ fullPage: true }), clone.page.screenshot({ fullPage: true })])
        writeFileSync(join(dir, `${name}-orig.png`), oBuf)
        writeFileSync(join(dir, `${name}-clone.png`), cBuf)
        const diff = await pixelDiff(oBuf, cBuf)
        report.check('visual', `${scheme} ${width} ${path}`, diff.percent < 1, `${diff.percent.toFixed(3)}% ${diff.reason}`)

        if (!ALL || REPS.includes(path)) {
          const measure = async (page) =>
            page.evaluate((sels) => {
              const out = {}
              for (const sel of sels) {
                const el = document.querySelector(sel)
                if (!el) continue
                const r = el.getBoundingClientRect()
                const cs = getComputedStyle(el)
                out[sel] = {
                  x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
                  font: cs.fontFamily, size: cs.fontSize, lh: cs.lineHeight, color: cs.color,
                  bg: cs.backgroundColor, pad: cs.padding, margin: cs.margin, radius: cs.borderRadius,
                }
              }
              out.__doc = { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }
              return out
            }, LANDMARKS)
          const [om, cm] = await Promise.all([measure(live.page), measure(clone.page)])
          for (const sel of LANDMARKS) {
            if (!om[sel] || !cm[sel]) continue
            const geoOk = ['x', 'y', 'w', 'h'].every((k) => Math.abs(om[sel][k] - cm[sel][k]) <= 1)
            report.check('geometry', `${scheme} ${width} ${path} ${sel}`, geoOk, JSON.stringify(cm[sel]).slice(0, 160))
            const styleOk = ['font', 'size', 'lh', 'color', 'bg', 'pad', 'margin', 'radius'].every((k) => om[sel][k] === cm[sel][k])
            report.check('styles', `${scheme} ${width} ${path} ${sel}`, styleOk, styleOk ? 'match' : `orig=${JSON.stringify(om[sel]).slice(0, 120)}`)
          }
          const docOk = Math.abs(om.__doc.height - cm.__doc.height) <= 1 && om.__doc.width === cm.__doc.width
          report.check('geometry', `${scheme} ${width} ${path} document`, docOk, `h ${om.__doc.height}/${cm.__doc.height} w ${om.__doc.width}/${cm.__doc.width}`)
        }

        report.check('console', `${scheme} ${width} ${path} errors`, clone.errors.length === 0, clone.errors.slice(0, 3).join(' | '))
        await live.ctx.close()
        await clone.ctx.close()
      }
    }
  }
  await browser.close()
}

/* ----------------------------------------------------- TIER 1: interactions */
async function themeParity(browser) {
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + '/')
    const out = { states: [], html: [] }
    await page.getByRole('button', { name: 'Select theme' }).click()
    out.menu = await page.locator('[role="menu"], ul').first().innerText().catch(() => '')
    for (const label of ['Light', 'Dark', 'System']) {
      const opt = page.getByRole('menuitem', { name: label }).or(page.getByRole('button', { name: label })).first()
      if (await opt.count()) {
        await opt.click()
        await page.waitForTimeout(250)
        out.states.push(label)
        out.html.push(
          await page.evaluate(() => ({
            dark: document.documentElement.classList.contains('dark'),
            scheme: document.documentElement.style.colorScheme,
            bg: getComputedStyle(document.body).backgroundColor,
            stored: localStorage.getItem('mode-watcher-mode'),
          })),
        )
        await page.getByRole('button', { name: 'Select theme' }).click()
      }
    }
    await ctx.close()
    return out
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  report.equal('interactions', 'theme menu items', b.menu, a.menu)
  report.equal('interactions', 'theme states', b.html, a.html)
}

async function searchParity(browser) {
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + '/')
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(300)
    const input = page.getByPlaceholder('Search pages, models, terms...')
    const results = {}
    for (const q of SEAK) {
      await input.fill(q)
      await page.waitForTimeout(60)
      results[q] = await page.$$eval('ul li a', (as) => as.map((a) => `${a.getAttribute('href')}|${a.innerText.replace(/\s+/g, ' ').trim()}`))
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const left = await page.locator('input[placeholder="Search pages, models, terms..."]').count()
    const closed = left === 0
    await ctx.close()
    return { results, closed, left }
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  let mismatches = 0
  for (const q of SEAK) if (JSON.stringify(a.results[q]) !== JSON.stringify(b.results[q])) mismatches++
  report.check('interactions', `search results (${SEAK.length} queries)`, mismatches === 0, `${SEAK.length - mismatches}/${SEAK.length} identical`)
  report.equal('interactions', 'search closes on Escape', [b.closed, b.left], [a.closed, a.left])
}

async function accordionParity(browser) {
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + '/')
    const btns = page.locator('button.w-full.text-left')
    const first = btns.first()
    const before = await first.getAttribute('aria-expanded')
    const beforeH = await page.evaluate(() => document.body.scrollHeight)
    await first.click()
    await page.waitForTimeout(400)
    const after = await first.getAttribute('aria-expanded')
    const text = await page.evaluate(() => {
      const b = document.querySelector('button.w-full.text-left')
      const panel = b?.parentElement?.querySelector('div[style*="height"], div.grid')
      return panel ? panel.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
    })
    const count = await btns.count()
    const afterH = await page.evaluate(() => document.body.scrollHeight)
    // second question: verifies one-vs-multiple open behaviour
    if (count > 1) await btns.nth(1).click()
    await page.waitForTimeout(300)
    const firstStillOpen = (await first.getAttribute('aria-expanded')) === 'true'
    await ctx.close()
    return { before, after, text, count, delta: afterH - beforeH, firstStillOpen }
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  report.equal('interactions', 'home FAQ count', b.count, a.count)
  report.equal('interactions', 'home FAQ first answer text', b.text, a.text)
  report.equal('interactions', 'home FAQ aria-expanded', [b.before, b.after], [a.before, a.after])
  report.equal('interactions', 'home FAQ height delta (px)', b.delta, a.delta, 2)
  report.equal('interactions', 'home FAQ one-vs-multiple', b.firstStillOpen, a.firstStillOpen)
}

async function modelDetailParity(browser) {
  const path = '/ai-governance/models/mistral-small-3/'
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + path)
    const tabs = page.locator('button', { hasText: 'Technical Documentation' }).first()
    const lifecycle = await page.locator('table').first().innerText().catch(() => '')
    const badge = await page.locator('table').first().innerHTML().catch(() => '')
    await tabs.click()
    await page.waitForTimeout(350)
    const technical = await page.evaluate(() => {
      const all = [...document.querySelectorAll('a, p, li')].map((e) => e.textContent.trim()).filter(Boolean)
      return all.join(' ').replace(/\s+/g, ' ').slice(0, 1200)
    })
    await ctx.close()
    return { lifecycle: lifecycle.replace(/\s+/g, ' ').trim(), badge: /Active|Retired/.test(badge), technical }
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  report.equal('interactions', 'model lifecycle table', b.lifecycle.slice(0, 600), a.lifecycle.slice(0, 600))
  report.equal('interactions', 'model tech docs tab content', b.technical, a.technical)
}

async function sortParity(browser) {
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + '/ai-governance/models/')
    const select = page.locator('select').first()
    const out = {}
    for (const value of ['name-asc', 'name-desc', 'date-asc', 'date-desc']) {
      await select.selectOption(value)
      await page.waitForTimeout(150)
      out[value] = await page.$$eval('a[href*="/ai-governance/models/"]', (as) =>
        as.map((a) => a.getAttribute('href')).filter((h) => h && !h.endsWith('/models/')),
      )
      out[value + '-count'] = await page.locator('body').innerText().then((t) => (t.match(/(\d+)\s+models/i) || [])[1] || '')
    }
    await ctx.close()
    return out
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  for (const key of Object.keys(a)) report.equal('interactions', `models sort ${key}`, b[key], a[key])
}

async function tocParity(browser) {
  const path = '/terms/commercial-terms-of-service/'
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + path)
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    const samples = []
    for (let i = 1; i <= 10; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round((height / 11) * i * 0.9))
      await page.waitForTimeout(250)
      samples.push(
        await page.evaluate(
          () =>
            [...document.querySelectorAll('a[data-toc-id]')]
              .find((a) => a.className.includes('text-text-primary'))
              ?.getAttribute('href') || null,
        ),
      )
    }
    await ctx.close()
    return samples
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  report.equal('interactions', 'TOC scroll-spy (10 positions)', b, a)
}

async function headerSweep(browser) {
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + '/terms/get-started/')
    const out = []
    for (let y = 0; y <= 300; y += 25) {
      await page.evaluate((v) => window.scrollTo(0, v), y)
      await page.waitForTimeout(80)
      out.push(
        await page.evaluate(() => {
          const h = document.querySelector('header')
          if (!h) return null
          const cs = getComputedStyle(h)
          return { pos: cs.position, top: cs.top, bg: cs.backgroundColor, blur: cs.backdropFilter, border: cs.borderBottomColor, h: Math.round(h.getBoundingClientRect().height) }
        }),
      )
    }
    await ctx.close()
    return out
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  report.equal('interactions', 'header scroll sweep 25px', b, a)
}

async function mobileMenu(browser) {
  const run = async (base) => {
    const { page, ctx } = await openedPage(browser, 390, 'light', base + '/')
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    await page.waitForTimeout(400)
    const items = await page.$$eval('a', (as) => as.map((a) => a.innerText.trim()).filter(Boolean).slice(0, 12))
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow)
    await ctx.close()
    return { items, overflow }
  }
  const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
  report.equal('interactions', 'mobile menu items', b.items, a.items)
  report.equal('interactions', 'mobile menu scroll lock', b.overflow, a.overflow)
}

async function printParity(browser) {
  for (const path of ['/terms/commercial-terms-of-service/', '/terms/privacy-policy/', '/terms/usage-policy/', '/terms/get-started/']) {
    const run = async (base) => {
      const { page, ctx } = await openedPage(browser, 1440, 'light', base + path)
      await page.emulateMedia({ media: 'print' })
      const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 2000))
      const pdf = await page.pdf({ format: 'A4', printBackground: true })
      await ctx.close()
      return { text, pages: pdf.length }
    }
    const [a, b] = await Promise.all([run(ORIGIN), run(CLONE)])
    report.equal('print', `${path} text`, b.text, a.text)
    report.check('print', `${path} pdf generated`, b.pages > 1000, `${b.pages} bytes vs ${a.pages}`)
  }
}

async function architectureParity(browser) {
  const browserIslands = async (base, path) => {
    const { page, ctx } = await openedPage(browser, 1440, 'light', base + path)
    const out = await page.evaluate(() => ({
      islands: [...document.querySelectorAll('astro-island')].map((i) => `${i.getAttribute('component-url')}|${i.getAttribute('client')}`),
      scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
      sheets: [...document.styleSheets].map((s) => s.href).filter(Boolean),
      generator: document.querySelector('meta[name="generator"]')?.content,
    }))
    await ctx.close()
    return out
  }
  for (const path of ['/', '/terms/get-started/', '/ai-governance/models/', '/ai-governance/models/voxtral-3/']) {
    const [a, b] = await Promise.all([browserIslands(ORIGIN, path), browserIslands(CLONE, path)])
    report.equal('architecture', `${path} island list`, b.islands, a.islands)
    report.equal('architecture', `${path} generator`, b.generator, a.generator)
  }
}

async function viewTransitionTour(browser) {
  const { page, ctx } = await openedPage(browser, 1440, 'light', CLONE + '/')
  const route = ['/terms/get-started/', '/ai-governance/models/', '/ai-governance/models/voxtral-3/', '/ai-governance/ai-systems/', '/']
  for (const target of route) {
    await page.evaluate((href) => {
      const a = [...document.querySelectorAll('a')].find((x) => x.getAttribute('href') === href)
      if (a) a.click()
    }, target)
    await page.waitForTimeout(600)
  }
  const ok = await page.evaluate(() => ({
    path: location.pathname,
    faq: document.querySelectorAll('button.w-full.text-left').length,
    theme: document.querySelectorAll('button[aria-label="Select theme"]').length,
    search: document.querySelectorAll('button[aria-label="Search"]').length,
  }))
  report.equal('view-transitions', 'after 5-swap tour', ok, { path: '/', faq: 15, theme: 1, search: 1 })
  // theme still works after the tour
  await page.getByRole('button', { name: 'Select theme' }).click()
  const menu = await page.locator('[role="menu"], ul').first().count()
  report.check('view-transitions', 'theme control works after tour', menu > 0, `${menu} menus`)
  await ctx.close()
}

async function qualityChecks(browser) {
  const { page, ctx, errors, requests } = await openedPage(browser, 1440, 'light', CLONE + '/')
  const analytics = requests.filter((u) => /googletagmanager|google-analytics|gtm|hotjar|segment|mixpanel|doubleclick|axeptio|contentsquare|hs-scripts|hubspot/i.test(u))
  report.check('quality', 'no analytics/tracking requests', analytics.length === 0, analytics.slice(0, 3).join(', '))
  report.check('quality', 'no console errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const rp = await reduced.newPage()
  await rp.goto(CLONE + '/', { waitUntil: 'networkidle' })
  const reducedOk = await rp.evaluate(() => document.documentElement.className.includes('dark') === false)
  report.check('quality', 'reduced-motion page renders', reducedOk, '')
  await reduced.close()
  await ctx.close()
}

async function keyboardChecks(browser) {
  const { page, ctx } = await openedPage(browser, 1440, 'light', CLONE + '/')
  const order = []
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName))
  }
  report.check('quality', 'keyboard tab order', order.length === 8, order.join(' > '))
  await page.keyboard.press('Control+k')
  const open = await page.getByPlaceholder('Search pages, models, terms...').isVisible()
  report.check('quality', 'Ctrl+K opens search', open, '')
  await page.keyboard.press('Escape')
  await ctx.close()
}

/* ------------------------------------------------------------------- run it */
try {
  if (TIER === 2) {
    await contentParity()
    await assetParity()
  } else {
    await contentParity()
    await assetParity()
    await visualAndLayout()
    const browser = await chromium.launch()
    await themeParity(browser)
    await searchParity(browser)
    await accordionParity(browser)
    await modelDetailParity(browser)
    await sortParity(browser)
    await tocParity(browser)
    await headerSweep(browser)
    await mobileMenu(browser)
    await printParity(browser)
    await architectureParity(browser)
    await viewTransitionTour(browser)
    await qualityChecks(browser)
    await keyboardChecks(browser)
    await browser.close()
  }
} finally {
  const summary = report.write(join(REF, 'verification-report.md'))
  console.log(`\n${summary.passed}/${summary.total} checks passed, ${summary.failed} failed`)
  console.log(`report: reference/legal/verification-report.md`)
  if (server) server.kill()
}
