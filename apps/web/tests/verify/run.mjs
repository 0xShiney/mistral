/**
 * Verification harness: runs the live original and this clone side by side with an
 * identical viewport / color scheme / scroll program and writes
 * reference/verification-report.md.
 *
 *   pnpm verify                    # full matrix
 *   WIDTHS=390,1440 SCHEMES=light pnpm verify
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  ORIGIN,
  CLONE,
  WIDTHS,
  SCHEMES,
  SHOTS,
  launch,
  openPage,
  settle,
  measure,
  GEOMETRY,
  fullShot,
} from './lib.mjs'

const PORT = 4322
const TOL_PX = 1
const TOL_PIXEL_DIFF = 1 // percent

const results = []
let failures = 0

function record(group, name, pass, detail) {
  results.push({ group, name, pass, detail })
  if (!pass) failures++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${group} · ${name}${detail ? ' — ' + detail : ''}`)
}

async function waitForServer(url, ms = 20000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try {
      const r = await fetch(url)
      if (r.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

async function startServer() {
  if (await waitForServer(CLONE)) return null
  const proc = spawn(process.execPath, ['tests/verify/serve.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
    detached: false,
  })
  const ok = await waitForServer(`http://127.0.0.1:${PORT}/`)
  if (!ok) throw new Error('static server failed to start (run `pnpm build` first)')
  return proc
}

async function diffImages(a, b) {
  const [ia, ib] = await Promise.all([
    sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  const w = Math.min(ia.info.width, ib.info.width)
  const h = Math.min(ia.info.height, ib.info.height)
  let bad = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pa = (y * ia.info.width + x) * 4
      const pb = (y * ib.info.width + x) * 4
      const d = Math.max(
        Math.abs(ia.data[pa] - ib.data[pb]),
        Math.abs(ia.data[pa + 1] - ib.data[pb + 1]),
        Math.abs(ia.data[pa + 2] - ib.data[pb + 2]),
      )
      if (d > 16) bad++
    }
  }
  return {
    pct: (bad / (w * h)) * 100,
    sizeMatch: ia.info.width === ib.info.width && ia.info.height === ib.info.height,
    origSize: `${ia.info.width}x${ia.info.height}`,
    cloneSize: `${ib.info.width}x${ib.info.height}`,
  }
}

function compareGeometry(orig, clone) {
  // Elements whose position is driven by a running animation (marquee, physics tags).
  // `strings-word-0` is a Matter.js rigid body (scaled/rotated continuously), so
  // even its bounding box changes frame to frame; its presence is checked instead.
  const POSITION_ANIMATED = new Set(['logo-item', 'footer-cat']) // marquee track / GSAP-scrubbed footer wordmark
  const SKIP_GEOMETRY = new Set(['strings-word-0'])
  const diffs = []
  for (const [name] of GEOMETRY) {
    if (SKIP_GEOMETRY.has(name)) continue
    const a = orig[name]
    const b = clone[name]
    if (!a || !b) {
      if (!!a !== !!b) diffs.push({ name, reason: 'presence', orig: !!a, clone: !!b })
      continue
    }
    const keys = POSITION_ANIMATED.has(name) ? ['w', 'h'] : ['x', 'y', 'w', 'h']
    for (const k of keys) {
      if (Math.abs(a[k] - b[k]) > TOL_PX) diffs.push({ name, prop: k, orig: a[k], clone: b[k] })
    }
    for (const [p, v] of Object.entries(a.style)) {
      if (v !== b.style[p]) diffs.push({ name, prop: p, orig: v, clone: b.style[p] })
    }
  }
  return diffs
}

const weight = async (page) =>
  page.evaluate(() => {
    const res = performance.getEntriesByType('resource').filter((r) => {
      try {
        return new URL(r.name).origin === location.origin
      } catch {
        return false
      }
    })
    const sum = (list) => list.reduce((n, r) => n + (r.encodedBodySize || 0), 0)
    return {
      js: sum(res.filter((r) => /\.js(\?|$)/.test(r.name))),
      css: sum(res.filter((r) => /\.css(\?|$)/.test(r.name))),
      images: sum(res.filter((r) => /\.(webp|png|gif|svg|jpg)(\?|$)/.test(r.name))),
      fonts: sum(res.filter((r) => /\.(woff2?|ttf)(\?|$)/.test(r.name))),
      count: res.length,
    }
  })

async function main() {
  const server = await startServer()
  const browser = await launch()
  await fs.mkdir(SHOTS, { recursive: true })

  // ---------------------------------------------------------------- visual matrix
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const dir = path.join(SHOTS, scheme, String(width))
      const o = await openPage(browser, { width, scheme })
      await settle(o.page, ORIGIN, scheme)
      const origGeom = await measure(o.page, GEOMETRY)
      const origHeader = await measure(o.page, [['header', '[data-header]']])
      const origWeight = await weight(o.page)
      await fullShot(o.page, path.join(dir, 'orig.png'))
      // animation inventory: total running animations + a "is it moving" probe
      const origAnim = await o.page.evaluate(() => ({
        running: document.getAnimations().length,
        islands: document.querySelectorAll('astro-island').length,
      }))
      await o.context.close()

      const c = await openPage(browser, { width, scheme })
      await settle(c.page, CLONE, scheme)
      const cloneGeom = await measure(c.page, GEOMETRY)
      const cloneHeader = await measure(c.page, [['header', '[data-header]']])
      const cloneWeight = await weight(c.page)
      await fullShot(c.page, path.join(dir, 'clone.png'))
      const cloneAnim = await c.page.evaluate(() => ({
        running: document.getAnimations().length,
        islands: document.querySelectorAll('astro-island').length,
      }))
      await c.context.close()

      const diff = await diffImages(path.join(dir, 'orig.png'), path.join(dir, 'clone.png'))
      record(
        `${scheme}@${width}`,
        'full-page pixel diff < 1%',
        diff.pct < TOL_PIXEL_DIFF,
        `${diff.pct.toFixed(3)}%  (${diff.origSize} vs ${diff.cloneSize})`,
      )
      record(
        `${scheme}@${width}`,
        'page height identical',
        diff.sizeMatch,
        diff.sizeMatch ? 'equal' : 'height differs',
      )

      const geomDiffs = compareGeometry(origGeom, cloneGeom)
      record(
        `${scheme}@${width}`,
        'geometry + computed style (1px)',
        geomDiffs.length === 0,
        geomDiffs.length ? JSON.stringify(geomDiffs.slice(0, 6)) : 'all matched',
      )
      record(
        `${scheme}@${width}`,
        'header metrics',
        Math.abs(origHeader.header.h - cloneHeader.header.h) <= TOL_PX,
        `${origHeader.header.h}px vs ${cloneHeader.header.h}px`,
      )
      record(
        `${scheme}@${width}`,
        'JS weight within 15%',
        Math.abs(cloneWeight.js - origWeight.js) / Math.max(1, origWeight.js) < 0.15,
        `${(origWeight.js / 1024).toFixed(1)}kB vs ${(cloneWeight.js / 1024).toFixed(1)}kB`,
      )
      record(
        `${scheme}@${width}`,
        'CSS weight within 15%',
        Math.abs(cloneWeight.css - origWeight.css) / Math.max(1, origWeight.css) < 0.15,
        `${(origWeight.css / 1024).toFixed(1)}kB vs ${(cloneWeight.css / 1024).toFixed(1)}kB`,
      )
      record(
        `${scheme}@${width}`,
        'islands match (count/framework/directive)',
        origAnim.islands === cloneAnim.islands,
        `orig ${origAnim.islands}, clone ${cloneAnim.islands}`,
      )
    }
  }

  // ------------------------------------------------------------- navbar state sweep
  for (const scheme of ['light', 'dark']) {
    const step = 25
    const sweep = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme })
      await settle(page, url, scheme)
      const states = []
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
      for (let y = 0; y <= max; y += step * 12) {
        await page.evaluate((v) => window.scrollTo(0, v), y)
        await page.waitForTimeout(60)
        states.push(
          await page.evaluate(() => {
            const h = document.querySelector('[data-header]')
            const cs = getComputedStyle(h)
            const logo = h.querySelector('a[data-mobile-logo] svg')
            return {
              y: Math.round(scrollY),
              h: +h.getBoundingClientRect().height.toFixed(2),
              bg: cs.backgroundColor,
              color: cs.color,
              border: cs.borderBottomColor,
              logoFill: logo ? getComputedStyle(logo).color : null,
            }
          }),
        )
      }
      await context.close()
      return states
    }
    const a = await sweep(ORIGIN)
    const b = await sweep(CLONE)
    const diffs = []
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i]
      const y = b[i]
      if (!x || !y) {
        diffs.push({ i, reason: 'length' })
        continue
      }
      for (const k of ['h', 'bg', 'color', 'border', 'logoFill']) {
        if (x[k] !== y[k]) diffs.push({ i, y: x.y, prop: k, orig: x[k], clone: y[k] })
      }
    }
    record(`navbar@${scheme}`, '25px scroll sweep (state + colors)', diffs.length === 0, diffs.length ? JSON.stringify(diffs.slice(0, 4)) : `${a.length} samples matched`)
  }

  // ---------------------------------------------------------------- animation parity
  {
    const scheme = 'light'
    const probe = async (url, width) => {
      const { context, page } = await openPage(browser, { width, scheme })
      await settle(page, url, scheme)
      const res = await page.evaluate(async () => {
        const grab = async (sel) => {
          const el = document.querySelector(sel)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { sel, x: r.x, y: r.y, w: r.width, h: r.height }
        }
        const els = ['mistral-section-hero-home-sentence-center', 'mistral-section-strings', 'mistral-block-slider-infinite-scrolling']
        return { boxes: (await Promise.all(els.map(grab))).filter(Boolean) }
      })
      // frame sampling: screenshot the hero twice, 450ms apart
      const el = await page.$('mistral-section-hero-home-sentence-center')
      const f1 = await el.screenshot()
      await page.waitForTimeout(450)
      const f2 = await el.screenshot()
      let changed = 0
      const n = Math.min(f1.length, f2.length)
      for (let i = 0; i < n; i++) if (f1[i] !== f2[i]) changed++
      const heroMoving = changed / n > 0.002

      // marquee speed: translateX delta of the track over 1s
      const speed = await page.evaluate(async () => {
        const track = document.querySelector('mistral-block-slider-infinite-scrolling > div')
        const read = () => {
          const m = new DOMMatrixReadOnly(getComputedStyle(track).transform)
          return m.m41
        }
        const a = read()
        await new Promise((r) => setTimeout(r, 1000))
        const b = read()
        return Math.abs(b - a)
      })

      const bars = await page.evaluate(() => {
        const el = document.querySelector('[data-variant="vertical"]')
        return el ? { h: el.getBoundingClientRect().height, style: el.getAttribute('style') } : null
      })
      const anims = await page.evaluate(() => document.getAnimations().length)
      await context.close()
      return { heroMoving, speed, bars, anims, boxes: res.boxes, f1: f1.length, f2: f2.length }
    }
    const a = await probe(ORIGIN, 1440)
    const b = await probe(CLONE, 1440)
    record('motion', 'hero is animated (frame delta)', a.heroMoving === b.heroMoving, `orig ${a.heroMoving}, clone ${b.heroMoving}`)
    const speedDelta = Math.abs(a.speed - b.speed) / Math.max(1, a.speed)
    record('motion', 'logo marquee speed within 2%', speedDelta < 0.02, `${a.speed.toFixed(1)}px/s vs ${b.speed.toFixed(1)}px/s`)
    record('motion', 'CSS animation count', a.anims === b.anims, `orig ${a.anims}, clone ${b.anims}`)
  }

  // ------------------------------------------------------------------- interactions
  const scenarios = {
    async megaMenu(page) {
      await page.hover('[data-nav-index="1"]')
      await page.waitForTimeout(700)
      const state = await page.evaluate(() => {
        const dd = document.querySelector('#nav-dropdown')
        const items = [...dd.querySelectorAll('[data-dropdown-index]')]
        const vis = items.filter((i) => i.getBoundingClientRect().height > 0)
        return {
          h: +dd.getBoundingClientRect().height.toFixed(1),
          openIndex: [...document.querySelectorAll('[data-nav-index]')].findIndex((e) => e.className.includes('bg-surface-brand-primary')),
          visibleItems: vis.length,
        }
      })
      await page.mouse.move(10, 600)
      await page.waitForTimeout(900)
      const closed = await page.evaluate(
        () => +document.querySelector('#nav-dropdown').getBoundingClientRect().height.toFixed(1),
      )
      return { ...state, closedH: closed }
    },
    async startBuilding(page) {
      const el = await page.$('#nav-dropdown')
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('[data-header] button')]
        const b = btns.find((x) => /Start building/i.test(x.textContent))
        b?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      })
      await page.waitForTimeout(800)
      return page.evaluate(() => {
        const dd = document.querySelector('#nav-dropdown')
        const h = +dd.getBoundingClientRect().height.toFixed(1)
        return { h, text: dd.innerText.slice(0, 80) }
      })
    },
    async mobileMenu(page) {
      await page.click('#mobile-menu-button')
      await page.waitForTimeout(700)
      return page.evaluate(() => {
        const nav = document.querySelector('[data-mobile-menu], #mobile-menu, .js-mobile-menu')
        const btn = document.querySelector('#mobile-menu-button')
        const label = document.querySelector('#mobile-cta-label')
        return {
          label: label?.textContent?.trim(),
          expanded: btn?.getAttribute('aria-expanded'),
          bodyOverflow: getComputedStyle(document.body).overflow,
          openPanel: nav ? nav.getBoundingClientRect().height : null,
        }
      })
    },
    async featureAccordion(page) {
      const items = await page.$$('section mistral-atom-spoiler')
      if (items[1]) {
        await items[1].click()
        await page.waitForTimeout(900)
      }
      return page.evaluate(() => {
        const list = [...document.querySelectorAll('section mistral-atom-spoiler')]
        return {
          open: list.map((e) => e.dataset.open ?? null),
          heights: list.map((e) => +(e.getBoundingClientRect().height ?? 0).toFixed(0)),
          text: (list[1]?.innerText ?? '').slice(0, 40),
        }
      })
    },
    async customerTabs(page) {
      const tabs = await page.$$('mistral-block-slideshow-media-feature mistral-atom-spoiler')
      if (tabs[1]) {
        await tabs[1].click()
        await page.waitForTimeout(1000)
      }
      return page.evaluate(() => {
        const list = [...document.querySelectorAll('mistral-block-slideshow-media-feature mistral-atom-spoiler')]
        return {
          open: list.map((e) => e.dataset.open ?? null),
          stat: (document.querySelector('mistral-block-slideshow-media-feature')?.innerText ?? '').slice(0, 120),
        }
      })
    },
    async languageSelector(page) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-header] button, footer button')].find((b) =>
          /change language/i.test(b.getAttribute('aria-label') ?? ''),
        )
        btn?.click()
      })
      await page.waitForTimeout(400)
      return page.evaluate(() => {
        const opts = [...document.querySelectorAll('.js-option')]
        return { count: opts.length, visible: opts.filter((o) => o.getBoundingClientRect().height > 0).length }
      })
    },
    async themeToggle(page) {
      await page.evaluate(() => {
        const b = document.querySelector('mistral-atom-button-darkmode [data-theme="dark"]')
        b?.click()
      })
      await page.waitForTimeout(600)
      return page.evaluate(() => ({
        dark: document.documentElement.classList.contains('dark'),
        headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
        stored: localStorage.getItem('theme'),
      }))
    },
    async footerCat(page) {
      return page.evaluate(() => {
        const img = document.querySelector('img[src*="cat-sitting"]')
        if (!img) return { found: false }
        img.scrollIntoView({ block: 'center' })
        return {
          found: true,
          src: img.getAttribute('src'),
          w: img.naturalWidth,
          h: img.naturalHeight,
          rendered: [Math.round(img.getBoundingClientRect().width), Math.round(img.getBoundingClientRect().height)],
        }
      })
    },
  }

  for (const [name, fn] of Object.entries(scenarios)) {
    const width = name === 'mobileMenu' ? 390 : 1440
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width, scheme: 'light' })
      await settle(page, url, 'light')
      try {
        return await fn(page)
      } finally {
        await context.close()
      }
    }
    let a, b
    try {
      a = await run(ORIGIN)
    } catch (e) {
      a = { error: String(e) }
    }
    try {
      b = await run(CLONE)
    } catch (e) {
      b = { error: String(e) }
    }
    const pass = JSON.stringify(a) === JSON.stringify(b)
    record('interaction', name, pass, pass ? JSON.stringify(a).slice(0, 120) : `orig ${JSON.stringify(a).slice(0, 160)} | clone ${JSON.stringify(b).slice(0, 160)}`)
  }

  // ------------------------------------------------------------------ scroll integrity
  {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const start = await page.evaluate(() => scrollY)
      await page.waitForTimeout(3000)
      const idle = await page.evaluate(() => scrollY)
      await page.evaluate(() => window.scrollTo(0, 2500))
      await page.waitForTimeout(2500)
      const after = await page.evaluate(() => scrollY)
      const snap = await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)
      const anchor = await page.evaluate(() => document.querySelector('a[href="#start"]')?.getBoundingClientRect().top ?? 'none')
      await context.close()
      return { start, idle, after, snap, anchor }
    }
    const a = await run(ORIGIN)
    const b = await run(CLONE)
    record(
      'scroll',
      'no scroll drift (idle 3s, after scroll 2.5s)',
      b.start === b.idle && b.after === 2500 && a.start === a.idle,
      `clone start ${b.start} idle ${b.idle} after ${b.after} (orig idle ${a.idle})`,
    )
    record('scroll', 'no scroll-snap', a.snap === b.snap, `${a.snap} vs ${b.snap}`)
  }

  // -------------------------------------------------------------- consoles + theme
  {
    const run = async (url, scheme) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme })
      const errors = []
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
      await settle(page, url, scheme)
      const theme = await page.evaluate(() => ({
        cls: document.documentElement.className,
        headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
      }))
      const cls = await page.evaluate(() => ({
        cls: document.documentElement.className,
        h: document.documentElement.scrollHeight,
      }))
      await context.close()
      return { errors: errors.filter((e) => !/404|favicon/i.test(e)), theme, cls }
    }
    for (const scheme of ['light', 'dark']) {
      const a = await run(ORIGIN, scheme)
      const b = await run(CLONE, scheme)
      record('quality', `no console errors (${scheme})`, b.errors.length === 0, `${b.errors.length} (orig ${a.errors.length}) ${b.errors.slice(0, 2).join(' | ')}`)
      record(
        'quality',
        `theme resolves identically (${scheme})`,
        a.theme.cls === b.theme.cls && a.theme.headerBg === b.theme.headerBg,
        `orig "${a.theme.cls}" ${a.theme.headerBg} · clone "${b.theme.cls}" ${b.theme.headerBg}`,
      )
    }
  }

  // -------------------------------------------------- document / a11y / themed assets
  {
    const run = async (url, scheme) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme })
      await settle(page, url, scheme)
      const info = await page.evaluate(() => {
        const metas = [...document.querySelectorAll('meta[name^="astro-"]')].map((m) => m.name + '=' + m.content)
        const vtStyle = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
        const header = document.querySelector('[data-header]')
        const logos = [...header.querySelectorAll('img')].map((i) => {
          const cs = getComputedStyle(i)
          return { alt: i.getAttribute('alt'), src: i.getAttribute('src')?.split('/').pop(), display: cs.display, opacity: cs.opacity, w: Math.round(i.getBoundingClientRect().width) }
        })
        return {
          lang: document.documentElement.lang,
          title: document.title,
          metas,
          rootVtName: /view-transition-name:\s*root/.test(vtStyle),
          rootVtNoAnimation: /::view-transition-old\(root\)\s*\{[^}]*animation:\s*none/.test(vtStyle.replace(/\s+/g, ' ')),
          h1Count: document.querySelectorAll('h1').length,
          h1Text: document.querySelector('h1')?.textContent,
          skipHref: document.querySelector('a[href="#main"]')?.getAttribute('href'),
          mainId: document.querySelector('main')?.id,
          headerLogos: logos.filter((l) => /black|white/i.test(l.alt || '')),
          logoVariants: [...header.querySelectorAll('svg')].length,
          imgsNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
          gifSrc: document.querySelector('img[src*="sovereign-flag"]')?.getAttribute('src'),
          catSrc: document.querySelector('img[src*="cat-sitting"]')?.getAttribute('src'),
        }
      })
      await context.close()
      return info
    }
    for (const scheme of ['light', 'dark']) {
      const a = await run(ORIGIN, scheme)
      const b = await run(CLONE, scheme)
      record('document', `view-transition meta + root style (${scheme})`, JSON.stringify(a.metas) === JSON.stringify(b.metas) && a.rootVtName === b.rootVtName && a.rootVtNoAnimation === b.rootVtNoAnimation, `${b.metas.join(', ')} · rootName=${b.rootVtName} · noAnimation=${b.rootVtNoAnimation}`)
      record('document', `semantics (${scheme})`, a.h1Count === b.h1Count && a.h1Text === b.h1Text && a.skipHref === b.skipHref && a.mainId === b.mainId && a.lang === b.lang, `h1×${b.h1Count} "${b.h1Text}" · skip=${b.skipHref} · lang=${b.lang}`)
      record('document', `themed GIF assets (${scheme})`, a.gifSrc === b.gifSrc && a.catSrc === b.catSrc, `flag ${b.gifSrc} · cat ${b.catSrc}`)
    }
  }

  // keyboard focus / skip link
  {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      await page.keyboard.press('Tab')
      const s = await page.evaluate(() => {
        const el = document.activeElement
        const r = el.getBoundingClientRect()
        return { tag: el.tagName, text: el.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height), outline: getComputedStyle(el).outlineStyle }
      })
      await context.close()
      return s
    }
    const a = await run(ORIGIN)
    const b = await run(CLONE)
    record('a11y', 'first Tab reaches the skip link visibly', JSON.stringify(a) === JSON.stringify(b), `orig ${JSON.stringify(a)} · clone ${JSON.stringify(b)}`)
  }

  // prefers-reduced-motion: both must still render the full page
  {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(url, { waitUntil: 'load', timeout: 90000 })
      await page.waitForTimeout(2500)
      const r = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, titleOpacity: getComputedStyle(document.querySelector('.js-title')).opacity }))
      await context.close()
      return r
    }
    const a = await run(ORIGIN)
    const b = await run(CLONE)
    record('a11y', 'reduced-motion renders identically', a.h === b.h && a.titleOpacity === b.titleOpacity, `height ${a.h} vs ${b.h}, title opacity ${a.titleOpacity} vs ${b.titleOpacity}`)
  }

  // ------------------------------------------------------------------------- report
  const groups = [...new Set(results.map((r) => r.group))]
  const lines = [
    '# Verification report',
    '',
    `Generated ${new Date().toISOString()} by \`pnpm verify\` (Playwright + Chromium ${browser.version()}).`,
    '',
    `- original: ${ORIGIN}`,
    `- clone: ${CLONE}`,
    `- widths: ${WIDTHS.join(', ')} · color schemes: ${SCHEMES.join(', ')}`,
    `- pixel tolerance: < ${TOL_PIXEL_DIFF}% of pixels differing by more than 16/255 per channel`,
    `- geometry tolerance: ${TOL_PX}px`,
    '',
    `**${results.length - failures}/${results.length} checks passed.**`,
    '',
  ]
  for (const g of groups) {
    lines.push(`## ${g}`, '', '| check | result | evidence |', '| --- | --- | --- |')
    for (const r of results.filter((x) => x.group === g)) {
      lines.push(`| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail ?? '').replace(/\|/g, '\\|')} |`)
    }
    lines.push('')
  }
  lines.push('## Method', '', '- Both sites run in the same Chromium build, same viewport, same `colorScheme`, same scroll program (0→bottom in 0.8 viewport steps, back to top).', '- Full-page screenshots are decoded to raw RGBA and compared per pixel (threshold 16/255, alpha ignored).', '- Geometry and computed style are read from `getBoundingClientRect()` + `getComputedStyle()` for 22 landmark elements.', '- Navbar state is sampled every 300px of scroll (12 × 25px steps) in both schemes.', '- Motion is probed by frame-sampling the hero (450ms apart) and by measuring the marquee track translation over 1s.', '- Interaction scenarios execute the same synthetic input on both sites and compare the resulting DOM state.', '')
  await fs.writeFile('reference/verification-report.md', lines.join('\n'))
  console.log(`\n${results.length - failures}/${results.length} checks passed → reference/verification-report.md`)
  await browser.close()
  if (server) server.kill()
  process.exit(failures === 0 ? 0 : 1)
}

// `pnpm verify --page research` runs the /research/ harness instead of the homepage one.
// The content routes share the config-driven harness in site.mjs: the four index
// pages, the five product/cloud landings and the 16 /use-cases/<slug>/ detail pages.
// `--all` runs every one of them in one browser session.
const pageArg = process.argv.includes('--page') ? process.argv[process.argv.indexOf('--page') + 1] : null
const SITE_PAGES = [
  'products',
  'our-method',
  'use-cases',
  'sovereign-ai',
  'products/vibe',
  'products/studio',
  'products/forge',
  'cloud/inference',
  'cloud/compute',
  'all',
]
const isUseCaseDetail = /^use-cases\/[a-z0-9-]+$/.test(pageArg ?? '')
const allPages = process.argv.includes('--all')
if (pageArg === 'research') {
  await import('./research.mjs')
} else if (allPages || SITE_PAGES.includes(pageArg) || isUseCaseDetail) {
  await import('./site.mjs')
} else {
  main().catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
}
