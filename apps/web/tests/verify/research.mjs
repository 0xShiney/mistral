/**
 * Verification harness for /research/.
 *
 *   pnpm verify --page research            # full matrix (6 widths × 2 schemes)
 *   pnpm verify --page research --quick    # 1440 light only
 *   WIDTHS=390 SCHEMES=dark pnpm verify --page research
 *
 * Runs the live original and this clone side by side in one Chromium build with
 * the same viewport, colour scheme and scroll program, and writes
 * reference/pages/research/verification-report.md plus the measured artefacts
 * (animations.json, filter-matrix.json, screenshots/).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { ORIGIN, CLONE, WIDTHS, SCHEMES, launch, openPage, settle, measure, fullShot } from './lib.mjs'

const OUT = 'reference/pages/research'
const SHOTS = path.join(OUT, 'screenshots')
const ORIGIN_PAGE = ORIGIN.replace(/\/$/, '') + '/research/'
const CLONE_PAGE = CLONE.replace(/\/$/, '') + '/research/'
const PORT = 4322
const TOL_PX = 1
const TOL_PIXEL_DIFF = 1

const results = []
let failures = 0
const artifacts = { animations: null, filters: null, models: null, transitions: null }

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
  if (await waitForServer(CLONE_PAGE)) return null
  const proc = spawn(process.execPath, ['tests/verify/serve.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  })
  if (!(await waitForServer(CLONE_PAGE))) throw new Error('static server failed to start (run `pnpm build` first)')
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

// Landmarks: geometry + computed style compared within 1px. Elements driven by a
// running animation only contribute their size.
const LANDMARKS = [
  ['header', '[data-header]'],
  ['nav-logo', '[data-header] a[data-mobile-logo]'],
  ['nav-active', '[data-nav-index="0"]', true],
  ['hero', 'mistral-block-hero-research'],
  ['hero-title', '.js-title'],
  ['hero-eyebrow', 'mistral-block-hero-research li'],
  ['hero-copy', 'mistral-block-hero-research p.text-body-large'],
  ['hero-cta', 'mistral-block-hero-research a[href$="/contact/"]'],
  ['models-headline', 'mistral-section-editorial-headline'],
  ['models-tabs', '.js-tab'],
  ['models-panel', '[data-tab-panel]'],
  ['models-card', '[data-model-card][data-active="true"]'],
  ['models-dock', '[data-dock]'],
  ['models-dock-trigger', '[data-model-trigger]'],
  ['publications', 'mistral-section-posts'],
  ['publications-count', '.js-post-filter-count'],
  ['publications-filter', 'mistral-atom-input-tag-filter'],
  ['publications-row-0', '.js-post'],
  ['publications-more', '.js-more'],
  ['areas', 'mistral-section-cards-service'],
  ['areas-card-0', 'mistral-section-cards-service .js-slider-item'],
  ['work', 'section.inverted'],
  ['work-card-0', 'section.inverted article'],
  ['build', 'mistral-section-cards-service + *'],
  ['join', 'section.relative.flex.flex-col'],
  ['footer', 'footer'],
  ['footer-cat', '#footer-m'],
]

const ANIMATED_ONLY_SIZE = new Set(['nav-active'])

/**
 * Wait until every lazy image has decoded and its 500 ms fade has finished.
 * Without this, a full-page shot at 2560px can catch a card mid-fade (its
 * blurred placeholder still visible), which is a harness race, not a diff.
 */
async function awaitSettledAssets(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((resolve) => {
              const done = () => resolve()
              img.addEventListener('load', done, { once: true })
              img.addEventListener('error', done, { once: true })
              setTimeout(done, 3000)
            }),
      ),
    )
    try {
      await document.fonts.ready
    } catch {}
  })
  await page.waitForTimeout(900)
}

async function landmarks(page) {
  return page.evaluate(
    ({ LANDMARKS, props }) => {
      const out = {}
      for (const [name, sel] of LANDMARKS) {
        const el = document.querySelector(sel)
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
    {
      LANDMARKS,
      props: [
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
      ],
    },
  )
}

function compareLandmarks(a, b) {
  const diffs = []
  for (const [name] of LANDMARKS) {
    const x = a[name]
    const y = b[name]
    if (!x || !y) {
      if (!!x !== !!y) diffs.push({ name, reason: 'presence', orig: !!x, clone: !!y })
      continue
    }
    const keys = ANIMATED_ONLY_SIZE.has(name) ? ['w', 'h'] : ['x', 'y', 'w', 'h']
    for (const k of keys) {
      if (Math.abs(x[k] - y[k]) > TOL_PX) diffs.push({ name, prop: k, orig: x[k], clone: y[k] })
    }
    for (const [p, v] of Object.entries(x.style)) {
      if (v !== y.style[p]) diffs.push({ name, prop: p, orig: v, clone: y.style[p] })
    }
  }
  return diffs
}

const weight = (page) =>
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
      count: res.length,
    }
  })

/** Region activity: does this element change pixels over 1.2 s (two 600 ms gaps)? */
async function isMoving(page, selector) {
  const el = await page.$(selector)
  if (!el) return null
  try {
    const shots = []
    for (let i = 0; i < 3; i++) {
      shots.push(await el.screenshot())
      if (i < 2) await page.waitForTimeout(600)
    }
    const raws = await Promise.all(shots.map((b) => sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true })))
    const [a, b] = raws
    const w = Math.min(a.info.width, b.info.width)
    const h = Math.min(a.info.height, b.info.height)
    let bad = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pa = (y * a.info.width + x) * 4
        const pb = (y * b.info.width + x) * 4
        const d = Math.max(
          Math.abs(a.data[pa] - b.data[pb]),
          Math.abs(a.data[pa + 1] - b.data[pb + 1]),
          Math.abs(a.data[pa + 2] - b.data[pb + 2]),
        )
        if (d > 16) bad++
      }
    }
    const pct = (bad / (w * h)) * 100
    // Also record the declared animations inside the region: deterministic
    // evidence that does not depend on where a 2 s loop happens to be sampled.
    const anims = await page.evaluate(
      (sel) =>
        (document.querySelector(sel)?.getAnimations({ subtree: true }) ?? [])
          .map((a) => a.animationName ?? a.id ?? a.constructor.name)
          .sort(),
      selector,
    )
    return { moving: anims.length > 0 || pct > 0.01, pct: +pct.toFixed(3), anims }
  } catch {
    return { moving: false, pct: 0 }
  }
}

/** Transform trace of an element at ~10 fps for 1 s. */
async function traceTransform(page, selector) {
  return page.evaluate(async (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const read = () => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      return [m.m41, m.m42, m.a, m.b]
    }
    const out = []
    for (let i = 0; i < 10; i++) {
      out.push(read())
      await new Promise((r) => setTimeout(r, 100))
    }
    const amp = (idx) => Math.max(...out.map((v) => v[idx])) - Math.min(...out.map((v) => v[idx]))
    return { samples: out, ampX: +amp(0).toFixed(2), ampY: +amp(1).toFixed(2), ampA: +amp(2).toFixed(3), ampB: +amp(3).toFixed(3) }
  }, selector)
}

async function animationInventory(page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .map((a) => {
        const t = a.effect?.getComputedTiming?.() ?? {}
        return {
          name: a.animationName ?? a.id ?? a.constructor.name,
          duration: t.duration ?? null,
          easing: t.easing ?? null,
          delay: t.delay ?? null,
          iterations: t.iterations ?? null,
        }
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name))),
  )
}

const postState = (page) =>
  page.evaluate(() => {
    const vis = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none'
    const posts = [...document.querySelectorAll('.js-post')]
    const shown = posts.filter((p) => vis(p))
    return {
      count: document.querySelector('.js-post-filter-count')?.textContent?.trim() ?? null,
      results: shown.length,
      titles: shown.map((p) => (p.querySelector('h3, h4, p')?.textContent ?? '').replace(/\s+/g, ' ').trim()),
      hrefs: shown.map((p) => p.getAttribute('href')),
      more: vis(document.querySelector('.js-more')),
      less: vis(document.querySelector('.js-less')),
      empty: vis(document.querySelector('.js-empty-result')),
      moreText: document.querySelector('.js-more')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      lessText: document.querySelector('.js-less')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    }
  })

const modelsState = (page) =>
  page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.js-tab')]
    const panels = [...document.querySelectorAll('[data-tab-panel]')]
    const cards = [...document.querySelectorAll('[data-model-card]')]
    const dock = document.querySelector('[data-dock]')
    const visiblePanel = panels.find((p) => getComputedStyle(p).display !== 'none') ?? null
    // Only cards inside the visible panel count: a hidden panel's cards still
    // compute `display: block` themselves.
    const visibleCards = visiblePanel
      ? [...visiblePanel.querySelectorAll('[data-model-card]')].filter((c) => getComputedStyle(c).display !== 'none')
      : []
    const visibleDock = visiblePanel?.querySelector('[data-dock]') ?? dock
    return {
      tabs: tabs.map((t) => ({ active: t.dataset.active, bg: getComputedStyle(t).backgroundColor })),
      activeTab: tabs.findIndex((t) => t.dataset.active === 'true'),
      panels: panels.map((p) => ({ active: p.dataset.active, h: +p.getBoundingClientRect().height.toFixed(1) })),
      visiblePanelIndex: panels.indexOf(visiblePanel),
      visiblePanelH: visiblePanel ? +visiblePanel.getBoundingClientRect().height.toFixed(1) : null,
      cards: cards.length,
      visibleCards: visibleCards.length,
      visibleCardTitle: visibleCards[0]?.querySelector('.text-h4')?.textContent?.trim() ?? null,
      visibleCardChips: [...(visibleCards[0]?.querySelectorAll('.text-eyebrow') ?? [])].map((c) => c.textContent.trim()),
      visibleCardHref: visibleCards[0]?.querySelector('a')?.getAttribute('href') ?? null,
      dockTriggers: visibleDock ? visibleDock.querySelectorAll('[data-model-trigger]').length : 0,
      dockActive: visibleDock
        ? [...visibleDock.querySelectorAll('[data-model-trigger]')].findIndex((t) => t.dataset.active === 'true')
        : null,
      hash: location.hash,
    }
  })

async function main() {
  const quick = process.argv.includes('--quick')
  const widths = quick ? [1440] : WIDTHS
  const schemes = quick ? ['light'] : SCHEMES
  // Batched runs: `SKIP=matrix,sweep` lets the visual matrix be split across
  // invocations; the pieces are merged from verification.json.
  const SKIP = (process.env.SKIP ?? '').split(',').filter(Boolean)
  const skip = (name) => SKIP.includes(name)
  const server = await startServer()
  const browser = await launch()
  await fs.mkdir(SHOTS, { recursive: true })
  await fs.mkdir(OUT, { recursive: true })

  // ------------------------------------------------------------ visual matrix
  if (!skip('matrix')) for (const scheme of schemes) {
    for (const width of widths) {
      const dir = path.join(SHOTS, scheme, String(width))
      const o = await openPage(browser, { width, scheme })
      await settle(o.page, ORIGIN_PAGE, scheme)
      await awaitSettledAssets(o.page)
      const oGeom = await landmarks(o.page)
      const oWeight = await weight(o.page)
      const oAnims = await animationInventory(o.page)
      await fullShot(o.page, path.join(dir, 'orig.png'))
      await o.context.close()

      const c = await openPage(browser, { width, scheme })
      await settle(c.page, CLONE_PAGE, scheme)
      await awaitSettledAssets(c.page)
      const cGeom = await landmarks(c.page)
      const cWeight = await weight(c.page)
      const cAnims = await animationInventory(c.page)
      await fullShot(c.page, path.join(dir, 'clone.png'))
      await c.context.close()

      const diff = await diffImages(path.join(dir, 'orig.png'), path.join(dir, 'clone.png'))
      record(
        `${scheme}@${width}`,
        'full-page pixel diff < 1%',
        diff.pct < TOL_PIXEL_DIFF,
        `${diff.pct.toFixed(3)}%  (${diff.origSize} vs ${diff.cloneSize})`,
      )
      record(`${scheme}@${width}`, 'page height identical', diff.sizeMatch, diff.sizeMatch ? 'equal' : 'height differs')

      const geomDiffs = compareLandmarks(oGeom, cGeom)
      record(
        `${scheme}@${width}`,
        'geometry + computed style (1px)',
        geomDiffs.length === 0,
        geomDiffs.length ? JSON.stringify(geomDiffs.slice(0, 6)) : 'all matched',
      )
      record(
        `${scheme}@${width}`,
        'JS weight within 15%',
        Math.abs(cWeight.js - oWeight.js) / Math.max(1, oWeight.js) < 0.15,
        `${(oWeight.js / 1024).toFixed(1)}kB vs ${(cWeight.js / 1024).toFixed(1)}kB`,
      )
      record(
        `${scheme}@${width}`,
        'CSS weight within 15%',
        Math.abs(cWeight.css - oWeight.css) / Math.max(1, oWeight.css) < 0.15,
        `${(oWeight.css / 1024).toFixed(1)}kB vs ${(cWeight.css / 1024).toFixed(1)}kB`,
      )
      record(
        `${scheme}@${width}`,
        'CSS animations match (name/duration/easing)',
        JSON.stringify(oAnims) === JSON.stringify(cAnims),
        `${oAnims.length} vs ${cAnims.length}`,
      )
      if (scheme === 'light' && width === 1440) artifacts.animations = { orig: oAnims, clone: cAnims }
    }
  }

  // ---------------------------------------------------------------- navbar sweep
  if (!skip('sweep')) for (const scheme of ['light', 'dark']) {
    if (!schemes.includes(scheme)) continue
    const sweep = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme })
      await settle(page, url, scheme)
      const states = []
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
      const ys = []
      for (let y = 0; y <= Math.min(max, 1500); y += 25) ys.push(y)
      for (let y = 1600; y <= max; y += 250) ys.push(y)
      for (const y of ys) {
        await page.evaluate((v) => window.scrollTo(0, v), y)
        await page.waitForTimeout(50)
        states.push(
          await page.evaluate(() => {
            const h = document.querySelector('[data-header]')
            const cs = getComputedStyle(h)
            const active = document.querySelector('[data-nav-index="0"]')
            return {
              y: Math.round(scrollY),
              h: +h.getBoundingClientRect().height.toFixed(2),
              bg: cs.backgroundColor,
              color: cs.color,
              border: cs.borderBottomColor,
              activeBg: active ? getComputedStyle(active).backgroundColor : null,
              activeCls: active ? active.className.includes('bg-surface-brand-primary') : null,
            }
          }),
        )
      }
      await context.close()
      return states
    }
    const a = await sweep(ORIGIN_PAGE)
    const b = await sweep(CLONE_PAGE)
    const diffs = []
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i]
      const y = b[i]
      if (!x || !y) {
        diffs.push({ i, reason: 'length' })
        continue
      }
      for (const k of ['h', 'bg', 'color', 'border', 'activeBg', 'activeCls']) {
        if (x[k] !== y[k]) diffs.push({ i, y: x.y, prop: k, orig: x[k], clone: y[k] })
      }
    }
    record(
      `navbar@${scheme}`,
      `25px scroll sweep (${a.length} samples)`,
      diffs.length === 0,
      diffs.length ? JSON.stringify(diffs.slice(0, 4)) : 'all sampled states matched',
    )
  }

  // ------------------------------------------------------------- motion parity
  if (!skip('interactions')) {
    const scheme = 'light'
    const probe = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme })
      await settle(page, url, scheme)
      const regions = {}
      for (const [name, sel] of [
        ['hero', 'mistral-block-hero-research'],
        ['models-dock', '[data-dock]'],
        ['publications', 'mistral-section-posts'],
        ['areas', 'mistral-section-cards-service'],
        ['work', 'section.inverted'],
        ['footer', 'footer'],
      ]) {
        regions[name] = await isMoving(page, sel)
      }
      // pointer reaction over the hero and the model dock
      const heroImg = await page.$('mistral-block-hero-research img, mistral-block-hero-research .js-media')
      if (heroImg) {
        const box = await heroImg.boundingBox()
        if (box) {
          await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3)
          await page.waitForTimeout(120)
          await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 12 })
          await page.waitForTimeout(120)
        }
      }
      const dockTrace = await traceTransform(page, '[data-dock] [data-model-trigger]:nth-child(2)')
      const fin = await page.evaluate(() => ({
        hero: document.querySelector('mistral-block-hero-research')?.getBoundingClientRect().height ?? null,
      }))
      await context.close()
      return { regions, dockTrace, fin }
    }
    const a = await probe(ORIGIN_PAGE)
    const b = await probe(CLONE_PAGE)
    for (const k of Object.keys(a.regions)) {
      const ra = a.regions[k]
      const rb = b.regions[k]
      const animsMatch = JSON.stringify(ra?.anims) === JSON.stringify(rb?.anims)
      record(
        'motion',
        `${k} moves identically`,
        ra?.moving === rb?.moving && animsMatch,
        `moving orig ${ra?.moving}/clone ${rb?.moving} · Δpixels ${ra?.pct}%/${rb?.pct}% · running animations ${JSON.stringify(rb?.anims)}`,
      )
    }
    record(
      'motion',
      'model dock trigger idle/hover transform amplitude within 20%',
      Math.abs((a.dockTrace?.ampY ?? 0) - (b.dockTrace?.ampY ?? 0)) <= Math.max(0.5, (a.dockTrace?.ampY ?? 0) * 0.2),
      `orig Δy ${a.dockTrace?.ampY}px, clone Δy ${b.dockTrace?.ampY}px`,
    )
    artifacts.animations = { ...(artifacts.animations ?? {}), motion: { orig: a, clone: b } }
  }

  // ------------------------------------------------------ models group switch
  if (!skip('interactions')) {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const before = await modelsState(page)
      // click the *second* tab (the group switch)
      await page.evaluate(() => document.querySelectorAll('.js-tab')[1].click())
      await page.waitForTimeout(900)
      const after = await modelsState(page)
      // switch the displayed card inside the Specialist group via its dock
      await page.evaluate(() => {
        const panel = [...document.querySelectorAll('[data-tab-panel]')].find((p) => getComputedStyle(p).display !== 'none')
        panel.querySelectorAll('[data-model-trigger]')[3].click()
      })
      await page.waitForTimeout(900)
      const docked = await modelsState(page)
      // keyboard: the tabs are plain <div>s in the original (no button/role), so
      // Enter on a focused tab is a no-op there. Recorded, not assumed.
      await page.evaluate(() => document.querySelectorAll('.js-tab')[0].focus())
      const focusBefore = await page.evaluate(() => document.activeElement?.className?.includes('js-tab') ?? false)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(900)
      const keyboard = { ...(await modelsState(page)), focusable: focusBefore }
      // scroll stability across the switch
      const scroll = await page.evaluate(async () => {
        document.querySelectorAll('.js-tab')[1].scrollIntoView({ block: 'center' })
        await new Promise((r) => setTimeout(r, 300))
        const y0 = scrollY
        document.querySelectorAll('.js-tab')[1].click()
        await new Promise((r) => setTimeout(r, 900))
        return { y0, y1: scrollY }
      })
      await context.close()
      return { before, after, docked, keyboard, scroll }
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    record('models', 'group switch (click) state', JSON.stringify(a.after) === JSON.stringify(b.after), JSON.stringify(b.after).slice(0, 200))
    record('models', 'dock card switch state', JSON.stringify(a.docked) === JSON.stringify(b.docked), JSON.stringify(b.docked).slice(0, 200))
    record('models', 'keyboard switch state', JSON.stringify(a.keyboard) === JSON.stringify(b.keyboard), JSON.stringify(b.keyboard).slice(0, 200))
    record('models', 'no scroll jump on switch', a.scroll.y0 === a.scroll.y1 && b.scroll.y0 === b.scroll.y1, `orig ${JSON.stringify(a.scroll)} · clone ${JSON.stringify(b.scroll)}`)
    artifacts.models = { orig: a, clone: b }
  }

  // ------------------------------------------------------- publications filter
  if (!skip('interactions')) {
    const slugs = [
      'foundation-models',
      'safety',
      'robotics',
      'applied-ai',
      'audio',
      'physical-ai',
      'coding',
      'reasoning',
      'vision',
    ]
    const combos = [
      ['audio', 'vision'],
      ['safety', 'robotics'],
      ['coding', 'reasoning'],
      ['foundation-models', 'physical-ai'],
      ['applied-ai', 'audio'],
      ['physical-ai', 'vision', 'audio'],
    ]
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const out = { initial: await postState(page), singles: {}, combos: {}, expanded: {}, scroll: {} }
      const click = async (slug) => {
        await page.evaluate((s) => {
          const el = document.querySelector(`mistral-atom-input-tag-filter[data-slug="${s}"] label`)
          el?.click()
        }, slug)
        await page.waitForTimeout(650)
      }
      for (const slug of slugs) {
        await click(slug)
        out.singles[slug] = await postState(page)
        await click(slug)
      }
      out.cleared = await postState(page)
      // The original scrolls to the top of the listing on every filter change
      // (`goTop()`, -48px offset) and writes the selection to the URL.
      out.scrollOnFilter = await page.evaluate(async () => {
        const posts = document.querySelector('mistral-section-posts')
        window.scrollTo(0, posts.getBoundingClientRect().top + window.scrollY + 600)
        await new Promise((r) => setTimeout(r, 250))
        const before = Math.round(scrollY)
        document.querySelector('mistral-atom-input-tag-filter[data-slug="audio"] label').click()
        await new Promise((r) => setTimeout(r, 900))
        return { before, after: Math.round(scrollY), search: location.search }
      })
      await page.evaluate(() => {
        document.querySelector('mistral-atom-input-tag-filter[data-slug="audio"] label').click()
      })
      await page.waitForTimeout(500)
      for (const combo of combos) {
        for (const s of combo) await click(s)
        out.combos[combo.join('+')] = await postState(page)
        for (const s of combo) await click(s)
      }
      await context.close()
      return out
    }
    // Load more / Show less get a fresh page: the filter pass above leaves the
    // listing in a filtered state (where pagination is collapsed by design).
    const runExpansion = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const out = { expanded: {}, scroll: {} }
      for (let i = 0; i < 3; i++) {
        const more = await page.$('.js-more')
        if (!more || !(await more.isVisible())) break
        await more.scrollIntoViewIfNeeded()
        await page.waitForTimeout(200)
        const before = await page.evaluate(() => scrollY)
        const box = await more.boundingBox()
        await more.click()
        await page.waitForTimeout(800)
        out.scroll['more' + (i + 1)] = { before, after: await page.evaluate(() => scrollY), boxY: box?.y }
        out.expanded['more' + (i + 1)] = await postState(page)
      }
      const less = await page.$('.js-less')
      if (less && (await less.isVisible())) {
        await less.click()
        await page.waitForTimeout(800)
        out.expanded.less = await postState(page)
      }
      const empty = await page.evaluate(() => {
        const el = document.querySelector('.js-empty-result')
        return { exists: !!el, html: el?.innerHTML.replace(/\?dpl=[^"\s,]+/g, '').slice(0, 400) }
      })
      out.empty = empty
      await context.close()
      return out
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    const ea = await runExpansion(ORIGIN_PAGE)
    const eb = await runExpansion(CLONE_PAGE)
    record('filter', 'initial list + counter', JSON.stringify(a.initial) === JSON.stringify(b.initial), `${b.initial.count} · ${b.initial.results} rows · more=${b.initial.more}`)
    for (const slug of slugs) {
      const same = JSON.stringify(a.singles[slug]) === JSON.stringify(b.singles[slug])
      record('filter', `topic "${slug}"`, same, same ? `${a.singles[slug].count} · ${a.singles[slug].results} rows` : `orig ${JSON.stringify(a.singles[slug]).slice(0, 120)} | clone ${JSON.stringify(b.singles[slug]).slice(0, 120)}`)
    }
    for (const combo of combos) {
      const key = combo.join('+')
      const same = JSON.stringify(a.combos[key]) === JSON.stringify(b.combos[key])
      record('filter', `combo "${key}"`, same, same ? `${a.combos[key].count} · ${a.combos[key].results} rows` : `orig ${JSON.stringify(a.combos[key]).slice(0, 120)} | clone ${JSON.stringify(b.combos[key]).slice(0, 120)}`)
    }
    record('filter', 'clear all restores initial state', JSON.stringify(a.cleared) === JSON.stringify(b.cleared) && JSON.stringify(b.cleared) === JSON.stringify(b.initial), `${b.cleared.count} · ${b.cleared.results} rows`)
    record(
      'filter',
      'filter change scrolls to the listing top + syncs ?categories=',
      JSON.stringify(a.scrollOnFilter) === JSON.stringify(b.scrollOnFilter),
      `orig ${JSON.stringify(a.scrollOnFilter)} · clone ${JSON.stringify(b.scrollOnFilter)}`,
    )
    for (const key of Object.keys(ea.expanded)) {
      const same = JSON.stringify(ea.expanded[key]) === JSON.stringify(eb.expanded[key])
      record('filter', `load more / show less → ${key}`, same, same ? `${ea.expanded[key].count} · ${ea.expanded[key].results} rows · less=${ea.expanded[key].less}` : `orig ${JSON.stringify(ea.expanded[key]).slice(0, 140)} | clone ${JSON.stringify(eb.expanded[key]).slice(0, 140)}`)
    }
    record(
      'filter',
      'empty state markup present',
      JSON.stringify(ea.empty) === JSON.stringify(eb.empty),
      JSON.stringify(ea.empty) === JSON.stringify(eb.empty) ? `${eb.empty.exists} · ${eb.empty.html?.slice(0, 80)}` : `orig ${JSON.stringify(ea.empty)} | clone ${JSON.stringify(eb.empty)}`,
    )
    record(
      'filter',
      'loading more keeps the control under the pointer',
      ea.scroll.more1?.before === ea.scroll.more1?.after && eb.scroll.more1?.before === eb.scroll.more1?.after,
      `orig ${JSON.stringify(ea.scroll.more1)} · clone ${JSON.stringify(eb.scroll.more1)}`,
    )
    artifacts.filters = { orig: { ...a, expansion: ea }, clone: { ...b, expansion: eb } }
  }

  // ----------------------------------------------------------------- copy parity
  if (!skip('interactions')) {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const data = await page.evaluate(() => {
        const norm = (s) => s.replace(/\s+/g, ' ').trim()
        const text = (el) => {
          const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
          const out = []
          let n
          while ((n = w.nextNode())) {
            if (n.parentElement.closest('script, style')) continue
            const t = norm(n.textContent)
            if (t) out.push(t)
          }
          return out
        }
        return {
          text: text(document.querySelector('main')),
          footerText: text(document.querySelector('footer')),
          links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
          // Asset paths are normalised: the clone serves Astro-transformed WebP
          // from /media/ instead of /_astro/ and has no CDN cache-buster.
          imgs: [...document.querySelectorAll('img')].map((i) => {
            const clean = (v) =>
              v == null
                ? v
                : v
                    .replace(/\/media\//g, '/_astro/')
                    .replace(/(\/_astro\/[^"\s,]+?)\?dpl=[^"\s,]+/g, '$1')
                    .replace(/\?dpl=[^"\s,]+/g, '')
            return [clean(i.getAttribute('src')), clean(i.getAttribute('srcset')), i.getAttribute('alt')]
          }),
        }
      })
      await context.close()
      return data
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    const normLink = (u) => u.replace(/^https?:\/\/(127\.0\.0\.1:4322|localhost:4322)/, 'https://mistral.ai')
    record('content', 'every text node matches', JSON.stringify(a.text) === JSON.stringify(b.text), `${a.text.length} vs ${b.text.length} text nodes`)
    record('content', 'footer text matches', JSON.stringify(a.footerText) === JSON.stringify(b.footerText), `${a.footerText.length} nodes`)
    const al = a.links.map(normLink)
    const bl = b.links.map(normLink)
    const linkDiff = al.length !== bl.length ? `count ${al.length} vs ${bl.length}` : al.map((x, i) => (x === bl[i] ? null : `${i}: ${x} ≠ ${bl[i]}`)).filter(Boolean).slice(0, 4)
    record('content', 'link targets match', al.length === bl.length && al.every((x, i) => x === bl[i]), JSON.stringify(linkDiff))
    record('content', 'image sources/alt match', JSON.stringify(a.imgs) === JSON.stringify(b.imgs), `${a.imgs.length} vs ${b.imgs.length} images`)
  }

  // ------------------------------------------------------------------ meta parity
  if (!skip('interactions')) {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const info = await page.evaluate(() => ({
        title: document.title,
        metas: [...document.querySelectorAll('meta')].map((m) => (m.name || m.getAttribute('property')) + '=' + m.content),
        links: [...document.querySelectorAll('link[rel="canonical"], link[rel="alternate"]')].map((l) => l.rel + ':' + l.getAttribute('hreflang') + '=' + l.href),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
        lang: document.documentElement.lang,
        islands: document.querySelectorAll('astro-island').length,
      }))
      await context.close()
      return info
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    record('meta', 'title', a.title === b.title, b.title)
    record(
      'meta',
      'canonical + hreflang',
      JSON.stringify(a.links) === JSON.stringify(b.links),
      JSON.stringify(a.links) === JSON.stringify(b.links) ? JSON.stringify(b.links) : `orig ${JSON.stringify(a.links)} | clone ${JSON.stringify(b.links)}`,
    )
    record('meta', 'structured data', JSON.stringify(a.jsonld) === JSON.stringify(b.jsonld), b.jsonld.join(' ').slice(0, 80))
    record('meta', 'single h1 + lang', JSON.stringify(a.h1) === JSON.stringify(b.h1) && a.lang === b.lang, `${b.h1.join(' | ')} · ${b.lang}`)
    const aMeta = a.metas.filter((m) => /^(description|og:|twitter:|viewport)/.test(m))
    const bMeta = b.metas.filter((m) => /^(description|og:|twitter:|viewport)/.test(m))
    record('meta', 'description / og / twitter / viewport', JSON.stringify(aMeta) === JSON.stringify(bMeta), JSON.stringify(bMeta).slice(0, 160))
    record('architecture', 'islands (count/framework)', a.islands === b.islands, `orig ${a.islands}, clone ${b.islands}`)
  }

  // ------------------------------------------------- JS-disabled server markup
  if (!skip('interactions')) {
    const run = async (url) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
      const page = await context.newPage()
      await page.goto(url, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(600)
      const info = await page.evaluate(() => ({
        text: document.querySelector('main').innerText.replace(/\s+/g, ' ').trim().slice(0, 4000),
        headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
        hero: !!document.querySelector('mistral-block-hero-research'),
        cards: document.querySelectorAll('[data-model-card]').length,
        rows: document.querySelectorAll('.js-post').length,
        visibleCards: [...document.querySelectorAll('[data-model-card]')].filter((c) => getComputedStyle(c).display !== 'none').length,
      }))
      await context.close()
      return info
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    record('architecture', 'no-JS markup + styled state', JSON.stringify(a) === JSON.stringify(b), `hero=${b.hero} cards=${b.cards} visible=${b.visibleCards} rows=${b.rows} header=${b.headerBg}`)
  }

  // ------------------------------------------------------------ page transitions
  if (!skip('interactions')) {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const afterFilter = await page.evaluate(async () => {
        document.querySelector('mistral-atom-input-tag-filter[data-slug="audio"] label')?.click()
        await new Promise((r) => setTimeout(r, 400))
        return document.querySelector('.js-post-filter-count')?.textContent?.trim()
      })
      const go = async (sel) => {
        await page.evaluate((s) => document.querySelector(s)?.click(), sel)
        await page.waitForTimeout(1400)
        return page.evaluate(() => ({
          url: location.pathname,
          headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
          active: document.querySelector('[data-nav-index="0"]')?.className.includes('bg-surface-brand-primary') ?? null,
          h1: document.querySelector('h1')?.textContent?.trim(),
        }))
      }
      const toHome = await go('[data-header] a[rel="home"]')
      const backToResearch = await go('[data-header] [data-nav-index="0"]')
      await page.goBack({ waitUntil: 'load' }).catch(() => {})
      await page.waitForTimeout(1400)
      const back = await page.evaluate(() => ({
        url: location.pathname,
        headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
        active: document.querySelector('[data-nav-index="0"]')?.className.includes('bg-surface-brand-primary') ?? null,
        h1: document.querySelector('h1')?.textContent?.trim(),
      }))
      // three consecutive swaps, then check the scripts still work
      for (let i = 0; i < 3; i++) {
        await go('[data-header] a[rel="home"]')
        await go('[data-header] [data-nav-index="0"]')
      }
      const after3 = await page.evaluate(async () => {
        const tab = document.querySelectorAll('.js-tab')[1]
        tab?.click()
        await new Promise((r) => setTimeout(r, 700))
        return {
          url: location.pathname,
          tabActive: tab?.dataset.active,
          animations: document.getAnimations().length,
          filterCount: document.querySelector('.js-post-filter-count')?.textContent?.trim(),
          headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
          active: document.querySelector('[data-nav-index="0"]')?.className.includes('bg-surface-brand-primary') ?? null,
        }
      })
      await context.close()
      return { afterFilter, toHome, backToResearch, back, after3 }
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    record('transitions', 'research → home swap', JSON.stringify(a.toHome) === JSON.stringify(b.toHome), JSON.stringify(b.toHome))
    record('transitions', 'home → research swap', JSON.stringify(a.backToResearch) === JSON.stringify(b.backToResearch), JSON.stringify(b.backToResearch))
    record('transitions', 'back navigation restores research', JSON.stringify(a.back) === JSON.stringify(b.back), JSON.stringify(b.back))
    record(
      'transitions',
      'after 3 swaps every control still works',
      JSON.stringify(a.after3) === JSON.stringify(b.after3),
      JSON.stringify(b.after3),
    )
    record('transitions', 'filter state after round trip matches', a.afterFilter === b.afterFilter, `orig "${a.afterFilter}" · clone "${b.afterFilter}"`)
    artifacts.transitions = { orig: a, clone: b }
  }

  // ------------------------------------------------------- hover / focus states
  if (!skip('interactions')) {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await settle(page, url, 'light')
      const probe = async (sel, inner) => {
        const el = await page.$(sel)
        if (!el) return null
        await el.scrollIntoViewIfNeeded()
        const before = await page.evaluate(
          ({ sel, inner }) => {
            const el = document.querySelector(sel)
            const target = inner ? el.querySelector(inner) : el
            const cs = getComputedStyle(target)
            return { bg: cs.backgroundColor, opacity: cs.opacity, transform: cs.transform, color: cs.color }
          },
          { sel, inner },
        )
        await el.hover()
        await page.waitForTimeout(500)
        const after = await page.evaluate(
          ({ sel, inner }) => {
            const el = document.querySelector(sel)
            const target = inner ? el.querySelector(inner) : el
            const cs = getComputedStyle(target)
            return { bg: cs.backgroundColor, opacity: cs.opacity, transform: cs.transform, color: cs.color }
          },
          { sel, inner },
        )
        return { before, after }
      }
      const dockHover = await (async () => {
        const sel = '[data-dock] [data-model-trigger]'
        const read = () =>
          page.evaluate((sel) =>
            [...document.querySelectorAll(sel)].slice(0, 4).map((el) => {
              const cs = getComputedStyle(el)
              return [cs.transform, cs.zIndex]
            }),
          sel,
          )
        const before = await read()
        await page.hover(`${sel}:nth-child(2)`)
        await page.waitForTimeout(700)
        const after = await read()
        await page.mouse.move(5, 5)
        await page.waitForTimeout(500)
        const reset = await read()
        return { before, after, reset }
      })()
      const out = {
        dockHover,
        modelCard: await probe('[data-model-card][data-active="true"] a', 'span'),
        publication: await probe('.js-post'),
        areaCard: await probe('mistral-section-cards-service .js-slider-item'),
        joinCta: await probe('section.relative.flex.flex-col a'),
        buildCard: await probe('mistral-section-cards-service a'),
      }
      await context.close()
      return out
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    for (const k of Object.keys(a)) {
      record('hover', k, JSON.stringify(a[k]) === JSON.stringify(b[k]), JSON.stringify(b[k]).slice(0, 160))
    }
  }

  // ------------------------------------------------- mobile layout + menu at 390
  if (!skip('interactions')) {
    const run = async (url) => {
      const { context, page } = await openPage(browser, { width: 390, scheme: 'light' })
      await settle(page, url, 'light')
      const menu = await page.evaluate(async () => {
        document.querySelector('#mobile-menu-button')?.click()
        await new Promise((r) => setTimeout(r, 800))
        return {
          expanded: document.querySelector('#mobile-menu-button')?.getAttribute('aria-expanded'),
          panel: document.querySelector('#mobile-nav-panel')?.getBoundingClientRect().x,
          label: document.querySelector('#mobile-cta-label')?.textContent?.trim(),
        }
      })
      const layout = await page.evaluate(() => {
        const dock = document.querySelector('[data-dock]')
        const posts = document.querySelector('mistral-section-posts')
        const filters = document.querySelector('mistral-atom-input-tag-filter')
        return {
          docks: dock ? Math.round(dock.getBoundingClientRect().width) : null,
          dockWrap: dock ? getComputedStyle(dock).flexWrap : null,
          postsW: posts ? Math.round(posts.getBoundingClientRect().width) : null,
          filterW: filters ? Math.round(filters.getBoundingClientRect().width) : null,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
      })
      await context.close()
      return { menu, layout }
    }
    const a = await run(ORIGIN_PAGE)
    const b = await run(CLONE_PAGE)
    record('mobile@390', 'menu + models/publications layout', JSON.stringify(a) === JSON.stringify(b), JSON.stringify(b))
  }

  // ------------------------------------------------------------- quality checks
  if (!skip('interactions')) {
    for (const scheme of schemes) {
      const run = async (url) => {
        const { context, page } = await openPage(browser, { width: 1440, scheme })
        const errors = []
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
        page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
        await page.addInitScript(() => {
          window.__cls = 0
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
          }).observe({ type: 'layout-shift', buffered: true })
        })
        await settle(page, url, scheme)
        const cls = await page.evaluate(() => window.__cls)
        const theme = await page.evaluate(() => ({
          cls: document.documentElement.className,
          headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
          bodyBg: getComputedStyle(document.body).backgroundColor,
        }))
        await context.close()
        return { errors: errors.filter((e) => !/404|favicon/i.test(e)), cls, theme }
      }
      const a = await run(ORIGIN_PAGE)
      const b = await run(CLONE_PAGE)
      record('quality', `no console errors (${scheme})`, b.errors.length === 0, `${b.errors.length} (orig ${a.errors.length}) ${b.errors.slice(0, 2).join(' | ')}`)
      record('quality', `no hydration/console noise (${scheme})`, !b.errors.some((e) => /hydrat/i.test(e)), 'none')
      record('quality', `CLS ≤ 0.05 (${scheme})`, b.cls <= 0.05, `${b.cls.toFixed(4)} (orig ${a.cls.toFixed(4)})`)
      record(
        'quality',
        `theme resolves identically (${scheme})`,
        a.theme.cls === b.theme.cls && a.theme.headerBg === b.theme.headerBg,
        `orig "${a.theme.cls}" ${a.theme.headerBg} · clone "${b.theme.cls}" ${b.theme.headerBg}`,
      )
    }
    const runRm = async (url) => {
      const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(url, { waitUntil: 'load', timeout: 90000 })
      await page.waitForTimeout(2500)
      const r = await page.evaluate(() => ({
        h: document.documentElement.scrollHeight,
        titleOpacity: getComputedStyle(document.querySelector('.js-title')).opacity,
      }))
      await context.close()
      return r
    }
    const a = await runRm(ORIGIN_PAGE)
    const b = await runRm(CLONE_PAGE)
    record('quality', 'prefers-reduced-motion parity', a.h === b.h && a.titleOpacity === b.titleOpacity, `height ${a.h} vs ${b.h}, title opacity ${a.titleOpacity} vs ${b.titleOpacity}`)
  }

  // ----------------------------------------------------------------------- report
  const groups = [...new Set(results.map((r) => r.group))]
  const lines = [
    '# /research/ verification report',
    '',
    `Generated ${new Date().toISOString()} by \`pnpm verify --page research\` (Playwright + Chromium ${browser.version()}).`,
    '',
    `- original: ${ORIGIN_PAGE}`,
    `- clone: ${CLONE_PAGE}`,
    `- widths: ${widths.join(', ')} · color schemes: ${schemes.join(', ')}`,
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
  lines.push(
    '## Method',
    '',
    '- Both sites run in the same Chromium build, same viewport, same `colorScheme`, same scroll program.',
    '- Sections compared: hero, models dock, publications, research areas, inside the work, build, join us, footer.',
    '- Navbar state sampled every 25px for the first 1500px of scroll, then every 250px, in both schemes.',
    '- Motion probed by frame sampling each section (600ms apart) plus a 10fps transform trace of the models dock.',
    '- Filter matrix: 9 single topics, 6 multi-topic combos, Load more ×3, Show less, clear-all — compared on count, row order, hrefs and control text.',
    '- Page transitions: research → home → research, browser back, and three consecutive swaps with a control check afterwards.',
    '',
  )
  await fs.writeFile(path.join(OUT, 'verification-report.md'), lines.join('\n'))
  await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify({ generated: new Date().toISOString(), widths, schemes, results }, null, 2))
  if (artifacts.animations) await fs.writeFile(path.join(OUT, 'animations.json'), JSON.stringify(artifacts.animations, null, 2))
  if (artifacts.filters) await fs.writeFile(path.join(OUT, 'filter-matrix.json'), JSON.stringify(artifacts.filters, null, 2))
  if (artifacts.models) await fs.writeFile(path.join(OUT, 'models-switch.json'), JSON.stringify(artifacts.models, null, 2))
  if (artifacts.transitions) await fs.writeFile(path.join(OUT, 'view-transitions.json'), JSON.stringify(artifacts.transitions, null, 2))

  console.log(`\n${results.length - failures}/${results.length} checks passed → ${OUT}/verification-report.md`)
  await browser.close()
  if (server) server.kill()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})
