// Shared browser helpers for the verification harness.
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

export const ORIGIN = process.env.ORIGIN ?? 'https://mistral.ai'
export const CLONE = process.env.CLONE ?? 'http://127.0.0.1:4322'
export const WIDTHS = (process.env.WIDTHS ?? '390,768,1024,1440,1920,2560').split(',').map(Number)
export const SCHEMES = (process.env.SCHEMES ?? 'light,dark').split(',')
export const SHOTS = 'reference/screenshots'

export async function launch() {
  return chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
}

export async function openPage(browser, { width = 1440, height = 900, scheme = 'light' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: scheme,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log('   [pageerror]', e.message))
  // Measurement-only shim: this Chromium build rejects the legacy
  // `format("woff2-variations")` hint used by the site's stylesheet, so the
  // variable Inter face never decodes here. Both sites get the same shim so the
  // comparison stays fair and text is measured with the real font.
  await page.addInitScript(() => {
    const add = () => {
      try {
        const face = new FontFace('Inter', 'url(/fonts/inter/Inter-VariableFont.woff2) format("woff2")', {
          weight: '100 900',
          display: 'swap',
        })
        face.load().then((f) => document.fonts.add(f)).catch(() => {})
      } catch {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, { once: true })
    else add()
  })
  return { context, page }
}

/** Navigate and settle: fonts, images, lazy reveals, marquee start. */
export async function settle(page, url, scheme) {
  await page.goto(url, { waitUntil: 'load', timeout: 90000 })
  await page.evaluate((s) => {
    try {
      localStorage.setItem('theme', s)
    } catch {}
  }, scheme)
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 90))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(1200)
  try {
    await page.evaluate(() => document.fonts.ready)
  } catch {}
  // Wait until layout stops changing (late images, fonts, lazy reveals).
  await page.evaluate(async () => {
    let last = -1
    let stable = 0
    for (let i = 0; i < 60; i++) {
      const h = document.documentElement.scrollHeight
      stable = h === last ? stable + 1 : 0
      last = h
      if (stable >= 6) break
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
}

export const GEOMETRY = [
  ['header', '[data-header]'],
  ['nav-logo', '[data-header] a[data-mobile-logo]'],
  ['hero', 'mistral-section-hero-home-sentence-center'],
  ['hero-title', '.js-title'],
  ['hero-flag', '.js-title img'],
  // The route registry points uncloned routes at https://mistral.ai, so the
  // link is matched by its tail rather than an exact root-relative href.
  ['vibe-pill', 'a[href$="/products/vibe"]'],
  ['logo-strip', 'mistral-section-slider-logo-scrolling'],
  ['logo-item', 'mistral-block-slider-infinite-scrolling img'],
  ['strings-section', 'mistral-section-strings'],
  ['strings-heading', 'section > p.text-h2'],
  ['strings-word-0', 'mistral-section-strings article'], // position is physics-animated: size only

  ['feature-headline', 'mistral-section-editorial-headline'],
  ['feature-nav', 'mistral-atom-navigation-summary'],
  ['feature-spoiler-0', 'mistral-atom-spoiler'],
  ['feature-image-0', 'mistral-block-slideshow-media-feature img'],
  ['customers-tabs', 'mistral-block-slideshow-media-feature'],
  ['customers-tab-0', 'mistral-block-slideshow-media-feature h3'],
  ['deeper', 'mistral-section-cards-service'],
  ['deeper-card-0', 'mistral-section-cards-service .js-slider-item'],
  ['footer', 'footer'],
  ['footer-cat', '#footer-m'],
  ['footer-lang', '[data-nav-index], .js-theme-option'],
]

export const STYLE_PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'color',
  'backgroundColor',
  'borderRadius',
  'paddingTop',
  'paddingLeft',
  'marginTop',
  'gap',
  'textTransform',
]

export async function measure(page, selectors, index = 0) {
  return page.evaluate(
    ({ selectors, index, props }) => {
      const out = {}
      for (const [name, sel] of selectors) {
        const el = document.querySelectorAll(sel)[index]
        if (!el) {
          out[name] = null
          continue
        }
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        out[name] = {
          x: +r.x.toFixed(2),
          y: +(r.y + window.scrollY).toFixed(2),
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
          style: Object.fromEntries(props.map((p) => [p, cs[p]])),
        }
      }
      return out
    },
    { selectors, index, props: STYLE_PROPS },
  )
}

export async function fullShot(page, file) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await page.screenshot({ path: file, fullPage: true })
}

export async function clipShot(page, selector, file) {
  const el = await page.$(selector)
  if (!el) return null
  await fs.mkdir(path.dirname(file), { recursive: true })
  await el.screenshot({ path: file })
  return file
}
