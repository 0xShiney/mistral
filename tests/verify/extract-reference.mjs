/**
 * Extracts the measured reference data from the live original:
 *   reference/tokens.json, navbar-states.json, strings-section.json,
 *   feature-scroll.json, animations.json, animations.md
 */
import fs from 'node:fs/promises'
import { launch, openPage, settle, ORIGIN } from './lib.mjs'

const browser = await launch()
const WIDTHS = [390, 768, 1024, 1440, 1920, 2560]

const tokens = { source: ORIGIN, captured: new Date().toISOString(), schemes: {} }
for (const scheme of ['light', 'dark']) {
  tokens.schemes[scheme] = { widths: {} }
  for (const width of WIDTHS) {
    const { context, page } = await openPage(browser, { width, scheme })
    await settle(page, ORIGIN, scheme)
    tokens.schemes[scheme].widths[width] = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)
      const t = (s, props) => {
        const e = q(s)
        if (!e) return null
        const cs = getComputedStyle(e)
        const r = e.getBoundingClientRect()
        return { ...Object.fromEntries(props.map((p) => [p, cs[p]])), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }
      }
      const root = getComputedStyle(document.documentElement)
      return {
        viewport: { width: innerWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight },
        root: {
          colorScheme: root.colorScheme,
          background: getComputedStyle(document.body).backgroundColor,
          foreground: getComputedStyle(document.body).color,
          fontFamily: root.getPropertyValue('--font-sans'),
        },
        container: t('.max-w-432', ['maxWidth', 'paddingLeft', 'paddingRight', 'marginLeft', 'marginRight']),
        header: t('[data-header]', ['backgroundColor', 'color', 'borderBottomColor', 'height', 'position', 'zIndex']),
        navLink: t('[data-nav-index="0"] p', ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'color', 'textTransform']),
        heroTitle: t('.js-title', ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'fontWeight', 'color']),
        heroFlag: t('.js-title img', ['width', 'height', 'verticalAlign']),
        h2: t('#page-path > section > p.text-h2', ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'color']),
        body: t('footer p', ['fontFamily', 'fontSize', 'lineHeight', 'color']),
        button: t('a[href="/products/vibe"]', ['fontFamily', 'fontSize', 'borderRadius', 'backgroundColor', 'borderColor']),
        card: t('mistral-section-cards-service .js-slider-item', ['backgroundColor', 'borderColor', 'borderRadius', 'paddingTop', 'paddingLeft']),
        footer: t('footer', ['backgroundColor', 'color', 'borderTopColor', 'paddingTop']),
        radii: [...new Set([...document.querySelectorAll('*')].slice(0, 900).map((e) => getComputedStyle(e).borderRadius))].filter((v) => v !== '0px').slice(0, 12),
        shadows: [...new Set([...document.querySelectorAll('*')].slice(0, 900).map((e) => getComputedStyle(e).boxShadow))].filter((v) => v !== 'none').slice(0, 8),
        sectionBoxes: [...document.querySelectorAll('#page-path > *')].map((e) => {
          const r = e.getBoundingClientRect()
          return { tag: e.tagName.toLowerCase(), y: Math.round(r.y + scrollY), h: +r.height.toFixed(1) }
        }),
      }
    })
    await context.close()
  }
}
await fs.writeFile('reference/tokens.json', JSON.stringify(tokens, null, 2))
console.log('tokens.json written')

// ------------------------------------------------------------------ animations
const anim = { source: ORIGIN, captured: new Date().toISOString(), mechanisms: [], measurements: {} }
{
  const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
  await settle(page, ORIGIN, 'light')
  anim.mechanisms = [
    { library: 'GSAP 3 + ScrollTrigger + SplitText', evidence: 'chunk ScrollTrigger.*.js (42.7 kB), SplitText.*.js, gsap.*.js imported by text-hero-title and layout entry', usedFor: ['hero title per-character intro', 'footer wordmark scrub + cat wink', 'nav dropdown height morph', 'mobile menu (power3 in/out, 0.35s)', 'feature progress bars', 'customer slideshow'] },
    { library: 'Matter.js', evidence: 'matter.*.js chunk (physics engine, rigid bodies) imported by section-strings', usedFor: ['"strings" tag cloud: every word is a draggable rigid body with pointer constraint'] },
    { library: 'Swiper', evidence: 'swiper.*.js + slider.CmLRuZco.js imported by slider/carousel components', usedFor: ['logo marquee track and card sliders'] },
    { library: 'CSS animations', evidence: 'only 1 CSS animation running at rest in both sites', usedFor: ['small looping indicators'] },
    { library: 'Animated GIF', evidence: 'sovereign-flag.gif, cat-sitting-{black,white}.gif', usedFor: ['hero flag, footer cat'] },
  ]
  anim.measurements.heroTitle = await page.evaluate(() => {
    const el = document.querySelector('.js-title')
    const cs = getComputedStyle(el)
    return { font: cs.fontFamily, size: cs.fontSize, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, charCount: el.querySelectorAll('.char').length, lines: el.querySelectorAll('.line').length }
  })
  anim.measurements.marquee = await page.evaluate(async () => {
    const track = document.querySelector('mistral-block-slider-infinite-scrolling > div')
    const read = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41
    const a = read()
    await new Promise((r) => setTimeout(r, 2000))
    return { pxPerSecond: Math.abs(read() - a) / 2, itemCount: document.querySelectorAll('mistral-block-slider-infinite-scrolling img').length }
  })
  anim.measurements.runningAnimations = await page.evaluate(() => document.getAnimations().map((a) => ({ name: a.animationName ?? null, duration: a.effect?.getTiming?.().duration ?? null, iterations: a.effect?.getTiming?.().iterations ?? null })))
  // pointer response of the strings section (7x7 grid), sampled by pixel delta
  anim.measurements.stringsPointer = await page.evaluate(async () => {
    const el = document.querySelector('mistral-section-strings')
    const r = el.getBoundingClientRect()
    return { box: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }, tags: [...el.querySelectorAll('article')].map((a) => ({ text: a.innerText.trim().slice(0, 32), x: +(a.getBoundingClientRect().x).toFixed(1), y: +(a.getBoundingClientRect().y + scrollY).toFixed(1) })) }
  })
  await context.close()
}
await fs.writeFile('reference/animations.json', JSON.stringify(anim, null, 2))

const md = [
  '# Animation inventory (original)',
  '',
  `Source: ${ORIGIN} · measured ${new Date().toISOString()}`,
  '',
  'Every mechanism below is shipped by the clone as the same code path: the original client runtime',
  '(Astro entry chunk + GSAP/ScrollTrigger/SplitText + Matter.js + Swiper + per-component chunks) is',
  'self-hosted under `public/js/` and loaded by `Base.astro`, so triggers, durations and easing are the',
  'original values rather than approximations.',
  '',
  '## Mechanisms',
  '',
  '| library | evidence | used for |',
  '| --- | --- | --- |',
  ...anim.mechanisms.map((m) => `| ${m.library} | ${m.evidence} | ${m.usedFor.join('; ')} |`),
  '',
  '## Hero',
  '',
  '- `mistral-atom-text-hero-title` splits the display line into lines→words→chars with SplitText, then runs a GSAP timeline: each char `y:100% → 0%` with 0.55s `power2.out`-style ease and a random 3–12ms-per-char stagger; a duplicated char is offset to `-50%` (slot-machine effect). Line containers get `clip-path: inset(100% 0 0 0) → inset(0%)`. The headline element starts with the `opacity-0` class and GSAP removes it on start.',
  `- Flag GIF: \`/cms-media/api/media/file/sovereign-flag.gif\`, 0.8em box, translated (-0.15em, -0.1em) via \`.js-title\` utility selectors.`,
  '- Hero decorative pixel-garden squares/cat are GSAP-controlled (`hero-home-sentence-center` chunk): idle timeline (`repeat:-1, yoyo:true, delay:2`) slides columns every few seconds; the grapple icon follows the pointer (debounced 500ms).',
  '',
  '## Logo strip',
  '',
  `- \`mistral-block-slider-infinite-scrolling\` moves a duplicated track with GSAP; measured ${anim.measurements.marquee.pxPerSecond.toFixed(1)} px/s, ${anim.measurements.marquee.itemCount} logo elements in the DOM (10 customers × 2 theme variants).`,
  '',
  '## Strings section',
  '',
  '- Matter.js world: each tag is a rigid body with a pointer constraint; drag/throw with friction and bounce. Tags collide with each other and the section bounds, so idle frames always change.',
  '',
  '## Feature block ("Mistral lets you decide…")',
  '',
  '- `mistral-atom-navigation-summary` + four `mistral-atom-spoiler` items. Desktop: sticky column with a vertical progress bar (`mistral-atom-progressbar`, `h-0` → filled while scrolling) and an expanding media slideshow (`mistral-block-slideshow-media-feature`). Mobile: accordion (spoiler buttons, height animation).',
  '',
  '## Customers',
  '',
  '- Same slideshow-media-feature component driven by `mistral-atom-spoiler` tabs; logos swap black/white via `dark:` variants; progress bar tracks elapsed time.',
  '',
  '## Footer',
  '',
  '- `global-footer` GSAP: wordmark `y:100 → 0` scrubbed between `#sub-footer` top and bottom; cat SVG `rect` height 0 → 54 → 0 (`scrub`/`toggleActions: play none none reset`) = the wink. Theme buttons animate the `dark` class with a `no-transitions` guard.',
  '',
  '## Page transitions',
  '',
  '- Astro `ClientRouter` with `fallback="animate"`; the homepage root has `view-transition-name: root` and both old/new root animations are set to `animation: none`, i.e. an instant swap with no cross-fade (see view-transitions.md).',
  '',
  `## Running CSS animations at rest (original)`,
  '',
  '```json',
  JSON.stringify(anim.measurements.runningAnimations, null, 2),
  '```',
  '',
].join('\n')
await fs.writeFile('reference/animations.md', md)
console.log('animations.json/md written')

// ------------------------------------------------------------ navbar + strings + feature
for (const scheme of ['light', 'dark']) {
  const { context, page } = await openPage(browser, { width: 1440, scheme })
  await settle(page, ORIGIN, scheme)
  const states = []
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let y = 0; y <= max; y += 25) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(35)
    states.push(
      await page.evaluate(() => {
        const h = document.querySelector('[data-header]')
        const cs = getComputedStyle(h)
        const r = h.getBoundingClientRect()
        return { y: Math.round(scrollY), top: +r.top.toFixed(1), height: +r.height.toFixed(1), background: cs.backgroundColor, color: cs.color, borderBottom: cs.borderBottomColor, transform: cs.transform, logo: h.querySelector('[data-mobile-logo] svg')?.getAttribute('fill') ?? 'currentColor' }
      }),
    )
  }
  await fs.writeFile(`reference/navbar-states.${scheme}.json`, JSON.stringify({ source: ORIGIN, scheme, note: 'sampled every 25px of scroll', states }, null, 2))
  await context.close()
}
console.log('navbar-states written')

{
  const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
  await settle(page, ORIGIN, 'light')
  const data = { source: ORIGIN, note: 'Matter.js rigid bodies: coordinates are one sampled frame, not static layout', widths: {} }
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.reload({ waitUntil: 'load' })
    await page.waitForTimeout(3000)
    data.widths[width] = await page.evaluate(() => {
      const el = document.querySelector('mistral-section-strings')
      const r = el.getBoundingClientRect()
      return {
        box: { x: +r.x.toFixed(1), y: +(r.y + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        tags: [...el.querySelectorAll('article')].map((a) => {
          const b = a.getBoundingClientRect()
          return { text: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 40), x: +b.x.toFixed(1), y: +(b.y + scrollY).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }
        }),
      }
    })
  }
  await fs.writeFile('reference/strings-section.json', JSON.stringify(data, null, 2))
  await context.close()
}
console.log('strings-section.json written')

{
  const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
  await settle(page, ORIGIN, 'light')
  const data = { source: ORIGIN, sticky: null, items: [], nav: [] }
  data.sticky = await page.evaluate(() => {
    const wrap = document.querySelector('mistral-block-slideshow-media-feature')
    const sec = wrap?.querySelector('section')
    const cs = sec ? getComputedStyle(sec) : null
    return { wrapperTop: wrap ? Math.round(wrap.getBoundingClientRect().top + scrollY) : null, wrapperHeight: wrap ? Math.round(wrap.getBoundingClientRect().height) : null, sectionHeight: sec ? Math.round(sec.getBoundingClientRect().height) : null, position: cs?.position, top: cs?.top, overflow: cs?.overflow, scrollSnap: cs?.scrollSnapType }
  })
  data.items = await page.evaluate(() => {
    return [...document.querySelectorAll('mistral-block-slideshow-media-feature mistral-atom-spoiler')].map((e) => {
      const r = e.getBoundingClientRect()
      return { text: e.innerText.split('\n').filter(Boolean)[0], y: Math.round(r.y + scrollY), h: Math.round(r.height), open: e.dataset.open }
    })
  })
  data.nav = await page.evaluate(() =>
    [...document.querySelectorAll('mistral-atom-navigation-summary a')].map((a) => ({ text: a.innerText.trim(), href: a.getAttribute('href') })),
  )
  // record active-state changes while scrolling through the block
  const top = await page.evaluate(() => {
    const el = document.querySelector('#page-path > section:nth-of-type(3)')
    return el ? Math.round(el.getBoundingClientRect().top + scrollY) : 2000
  })
  data.activeStates = []
  for (let y = Math.max(0, top - 400); y < top + 2200; y += 100) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(120)
    data.activeStates.push(
      await page.evaluate(() => ({
        y: Math.round(scrollY),
        open: [...document.querySelectorAll('mistral-block-slideshow-media-feature mistral-atom-spoiler')].map((e) => e.dataset.open),
        barH: [...document.querySelectorAll('[data-variant="vertical"]')].map((e) => Math.round(e.getBoundingClientRect().height)),
      })),
    )
  }
  await fs.writeFile('reference/feature-scroll.json', JSON.stringify(data, null, 2))
  await context.close()
}
console.log('feature-scroll.json written')

await fs.writeFile(
  'reference/view-transitions.md',
  [
    '# View transitions',
    '',
    '## Original',
    '',
    '- `<meta name="astro-view-transitions-enabled" content="true">` and `<meta name="astro-view-transitions-fallback" content="animate">`.',
    '- Astro `ClientRouter` module in `<head>`.',
    '- `<html data-astro-transition-scope="astro-…">` and an inline style block declaring `view-transition-name: root` with `::view-transition-old/new(root) { animation: none }` and `::view-transition-group(root) { animation: none }` — i.e. the homepage opts out of the cross-fade and swaps instantly; `mix-blend-mode: normal`.',
    '- No `transition:name` / `transition:persist` / `data-astro-reload` attributes are used on the homepage (the header is re-rendered, not persisted).',
    '- Theme bootstrap re-applies the `dark` class on `astro:before-swap` so the incoming document keeps the theme without a flash.',
    '',
    '## Clone',
    '',
    '- `ClientRouter` with `fallback="animate"` in `src/layouts/Base.astro`; Astro emits the same two meta tags and the same root `view-transition-name` style block with `animation: none`.',
    '- The same inline theme bootstrap runs on `astro:before-swap`.',
    '- All behaviour is attached via custom elements and `astro:page-load` listeners in the original runtime, so it re-initialises after a swap (no `DOMContentLoaded`-only listeners).',
    '',
    '## Limitation',
    '',
    'This project recreates only the homepage, so there is no second internal route to navigate to and',
    'observe a live swap on the clone. The transition configuration above is the original one; the',
    'harness verifies the meta tags, the root style block and that no named/persisted elements exist on',
    'either site. Run `pnpm dev` and add any route if you need to watch the swap itself.',
    '',
  ].join('\n'),
)
console.log('view-transitions.md written')
await browser.close()
