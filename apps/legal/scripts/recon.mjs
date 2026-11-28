#!/usr/bin/env node
/**
 * Measures the live origin and writes the reference artefacts required for the
 * clone: stack report, tokens, animation inventory, search results, sort
 * orders, TOC scroll-spy samples and view-transition notes.
 *
 *   node scripts/recon.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..', '..')
const REF = join(repo, 'reference', 'legal')
const ORIGIN = (process.env.ORIGIN || 'https://legal.mistral.ai').replace(/\/$/, '')
mkdirSync(REF, { recursive: true })

const REPS = [
  ['home', '/'],
  ['terms-index', '/terms/get-started/'],
  ['terms-long', '/terms/commercial-terms-of-service/'],
  ['privacy', '/terms/privacy-policy/'],
  ['terms-short', '/terms/license-notice/'],
  ['models-index', '/ai-governance/models/'],
  ['model-detail', '/ai-governance/models/mistral-small-3/'],
  ['systems-index', '/ai-governance/ai-systems/'],
  ['system-detail', '/ai-governance/ai-systems/vibe-work/'],
]

const browser = await chromium.launch()

/* ---------------------------------------------------------------- stack ---- */
const stack = { generator: '', viewTransitions: {}, templates: {}, headers: {}, fonts: [], dpl: {} }
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const assets = []
  page.on('response', (r) => {
    const url = r.url()
    if (/_astro\/.*\.(js|css)/.test(url)) assets.push({ url, status: r.status() })
  })
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' })
  const info = await page.evaluate(() => {
    const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content || ''
    const nav = performance.getEntriesByType('navigation')[0]
    return {
      generator: meta('generator'),
      vtEnabled: meta('astro-view-transitions-enabled'),
      vtFallback: meta('astro-view-transitions-fallback'),
      islands: [...document.querySelectorAll('astro-island')].map((i) => ({
        name: JSON.parse((i.getAttribute('opts') || '{}').replaceAll('&quot;', '"')).name,
        component: i.getAttribute('component-url'),
        renderer: i.getAttribute('renderer-url'),
        client: i.getAttribute('client'),
        ssr: i.hasAttribute('ssr'),
      })),
      fonts: [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, style: f.style, status: f.status })),
      transitionStyle: [...document.styleSheets]
        .flatMap((s) => {
          try {
            return [...s.cssRules].map((r) => r.cssText)
          } catch {
            return []
          }
        })
        .filter((t) => t.includes('view-transition'))
        .join('\n'),
      dpl: [...document.querySelectorAll('script[src],link[href],img[src]')]
        .map((e) => e.getAttribute('src') || e.getAttribute('href'))
        .filter((u) => u && u.includes('?dpl='))
        .slice(0, 5),
      html: document.documentElement.outerHTML.length,
      rootStyle: getComputedStyle(document.documentElement).getPropertyValue('view-transition-name'),
    }
  })
  Object.assign(stack, info)
  stack.templates.home = {
    jsBytes: assets.filter((a) => a.url.includes('.js')).length,
    cssBytes: assets.filter((a) => a.url.includes('.css')).length,
    assetUrls: [...new Set(assets.map((a) => a.url.split('?')[0]))],
  }
  await ctx.close()
}
{
  // per-template byte weight (same browser, fresh cache)
  for (const [name, path] of REPS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(ORIGIN + path, { waitUntil: 'networkidle' })
    const bytes = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((r) => /\/_astro\/.*\.(js|css)$/.test(r.name))
        .reduce(
          (acc, r) => {
            const url = r.name.split('?')[0]
            if (url.endsWith('.js')) acc.js += r.encodedBodySize || r.transferSize || 0
            else acc.css += r.encodedBodySize || r.transferSize || 0
            return acc
          },
          { js: 0, css: 0 },
        ),
    )
    stack.templates[name] = bytes
    await ctx.close()
  }
}
{
  for (const path of ['/', '/terms/get-started/', '/ai-governance/models/', '/search-index.json', '/images/og-image.png']) {
    const res = await fetch(ORIGIN + path)
    stack.headers[path] = Object.fromEntries([...res.headers.entries()])
  }
}
writeFileSync(join(REF, 'stack-report.json'), JSON.stringify(stack, null, 2))

/* ----------------------------------------------------------------- tokens -- */
const TOKEN_SELECTORS = [
  'body',
  'header',
  'header nav',
  'h1',
  'h2',
  'h3',
  'p',
  'a',
  'li',
  'table',
  'thead th',
  'tbody td',
  'blockquote',
  'code',
  'footer',
  'aside',
  'button',
  'select',
  'img',
]
const TOKEN_PROPS = [
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'backgroundColor',
  'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom',
  'borderRadius', 'borderColor', 'borderWidth', 'boxShadow', 'textTransform', 'maxWidth', 'gap',
]
const tokens = {}
for (const scheme of ['light', 'dark']) {
  for (const width of [390, 768, 1024, 1440, 1920, 2560]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme })
    const page = await ctx.newPage()
    for (const [name, path] of [['home', '/'], ['terms-long', '/terms/commercial-terms-of-service/'], ['model-detail', '/ai-governance/models/mistral-small-3/']]) {
      await page.goto(ORIGIN + path, { waitUntil: 'networkidle' })
      const data = await page.evaluate(
        ({ selectors, props }) => {
          const out = {
            __viewport: { width: innerWidth, height: innerHeight },
            __doc: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
            __root: {
              colorScheme: getComputedStyle(document.documentElement).colorScheme,
              dark: document.documentElement.classList.contains('dark'),
              bg: getComputedStyle(document.body).backgroundColor,
            },
            __layout: {},
          }
          for (const el of document.querySelectorAll('header, main, aside, nav, footer, article')) {
            const r = el.getBoundingClientRect()
            out.__layout[`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`] = {
              x: Math.round(r.x), width: Math.round(r.width), height: Math.round(r.height),
              maxWidth: getComputedStyle(el).maxWidth, padding: getComputedStyle(el).padding,
            }
          }
          for (const sel of selectors) {
            const el = document.querySelector(sel)
            if (!el) continue
            const cs = getComputedStyle(el)
            out[sel] = Object.fromEntries(props.map((p) => [p, cs[p]]))
          }
          return out
        },
        { selectors: TOKEN_SELECTORS, props: TOKEN_PROPS },
      )
      tokens[`${scheme}/${width}/${name}`] = data
    }
    await ctx.close()
  }
}
writeFileSync(join(REF, 'tokens.json'), JSON.stringify(tokens, null, 2))

/* ------------------------------------------------------------- animations -- */
async function animationsAt(page) {
  return page.evaluate(() =>
    document.getAnimations().map((a) => {
      const t = a.effect?.getTiming?.() || {}
      const kf = a.effect?.getKeyframes?.() || []
      return {
        type: a.constructor.name,
        target: a.effect?.target
          ? `${a.effect.target.tagName.toLowerCase()}${a.effect.target.className ? '.' + String(a.effect.target.className).split(' ')[0] : ''}`
          : 'pseudo',
        pseudoElement: a.effect?.pseudoElement || null,
        duration: t.duration, delay: t.delay, easing: t.easing, iterations: t.iterations,
        fill: t.fill, playState: a.playState,
        properties: [...new Set(kf.flatMap((k) => Object.keys(k)))].filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)),
      }
    }),
  )
}

const animations = { idle: {}, interactions: {}, transitions: {} }
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  animations.idle.home = await animationsAt(page)

  const firstFaq = page.locator('button.w-full.text-left').first()
  animations.transitions.faqButton = await firstFaq.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { transition: cs.transition, duration: cs.transitionDuration, easing: cs.transitionTimingFunction }
  })
  await firstFaq.click()
  await page.waitForTimeout(120)
  animations.interactions.faqOpen = await animationsAt(page)
  await page.waitForTimeout(500)
  animations.interactions.faqOpenSettled = await animationsAt(page)

  await page.getByRole('button', { name: 'Search' }).click()
  await page.waitForTimeout(80)
  animations.interactions.searchOpen = await animationsAt(page)
  await page.waitForTimeout(400)
  animations.interactions.searchOpenSettled = await animationsAt(page)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Select theme' }).click()
  await page.waitForTimeout(80)
  animations.interactions.themeOpen = await animationsAt(page)

  await page.goto(ORIGIN + '/ai-governance/models/mistral-small-3/', { waitUntil: 'networkidle' })
  await page.locator('button', { hasText: 'Technical Documentation' }).first().click()
  await page.waitForTimeout(120)
  animations.interactions.tabSwitch = await animationsAt(page)

  const cat = await page.evaluate(() => {
    const img = document.querySelector('img[src*="cat-moving"]')
    return img ? { src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight, alt: img.alt } : null
  })
  animations.cat = cat
  await ctx.close()
}
writeFileSync(join(REF, 'animations.json'), JSON.stringify(animations, null, 2))

/* ------------------------------------------------------------ search data -- */
const QUERIES = [
  'model', 'models', 'mistral', 'voxtral', 'privacy', 'terms', 'data', 'cookie', 'usage',
  'policy', 'legal', 'ai act', 'governance', 'vibe', 'codestral', 'ministral', 'magistral',
  'large', 'small', 'ocr', 'embed', 'license', 'applicant', 'consumer', 'commercial',
  'contract', 'agreement', 'dpa', 'row', 'eu', 'system', 'incident', 'guardrails', 'agents',
  'studio', 'forge', 'compute', 'inference', 'chat', 'qa', 'zzzz',
  'Mistral Large', 'terms of service', 'privac', 'voxtrla', 'MISTRAL', '  privacy  ',
]
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' })
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(400)
  const input = page.getByPlaceholder('Search pages, models, terms...')
  const tests = []
  for (const q of QUERIES) {
    await input.fill(q)
    await page.waitForTimeout(80)
    tests.push({
      query: q,
      results: await page.$$eval('div.max-h-100 ul li a', (as) =>
        as.map((a) => ({
          title: a.querySelector('span')?.textContent?.trim() || '',
          type: a.querySelectorAll('span')[1]?.textContent?.trim() || '',
          url: a.getAttribute('href'),
        })),
      ),
    })
  }
  writeFileSync(join(REF, 'search-queries.json'), JSON.stringify(tests, null, 2))
  await ctx.close()
}

/* -------------------------------------------------------------- sort data -- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(ORIGIN + '/ai-governance/models/', { waitUntil: 'networkidle' })
  const select = page.locator('select').first()
  const orders = {}
  for (const value of ['name-asc', 'name-desc', 'date-asc', 'date-desc']) {
    await select.selectOption(value)
    await page.waitForTimeout(150)
    orders[value] = {
      counter: (await page.locator('body').innerText()).match(/(\d+)\s+models/i)?.[1] || '',
      order: await page.$$eval('a[href*="/ai-governance/models/"]', (as) =>
        as.map((a) => a.getAttribute('href')).filter((h) => h && !h.endsWith('/models/')),
      ),
    }
  }
  writeFileSync(join(REF, 'sort-orders.json'), JSON.stringify(orders, null, 2))
  await ctx.close()
}

/* ----------------------------------------------------------- scroll-spy ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(ORIGIN + '/terms/commercial-terms-of-service/', { waitUntil: 'networkidle' })
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const samples = []
  for (let i = 0; i <= 39; i++) {
    const y = Math.round(((height - 900) / 39) * i)
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(120)
    samples.push(
      await page.evaluate(() => ({
        y: Math.round(scrollY),
        active:
          [...document.querySelectorAll('a[data-toc-id]')]
            .find((a) => a.className.includes('text-text-primary'))
            ?.getAttribute('href') || null,
      })),
    )
  }
  writeFileSync(join(REF, 'toc-scrollspy.json'), JSON.stringify(samples, null, 2))
  await ctx.close()
}

/* ------------------------------------------------------ view transitions ---- */
const vt = []
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' })
  const pairs = [
    ['/', '/terms/get-started/'],
    ['/terms/get-started/', '/ai-governance/models/'],
    ['/ai-governance/models/', '/ai-governance/models/voxtral-3/'],
  ]
  for (const [from, to] of pairs) {
    await page.goto(ORIGIN + from, { waitUntil: 'networkidle' })
    await page.evaluate((href) => {
      const a = [...document.querySelectorAll('a')].find((x) => x.getAttribute('href') === href)
      if (a) a.click()
    }, to)
    const during = []
    for (let i = 0; i < 6; i++) {
      during.push(await animationsAt(page))
      await page.waitForTimeout(80)
    }
    const named = await page.evaluate(() =>
      [...document.querySelectorAll('[data-astro-transition-persist], [style*="view-transition-name"]')].map(
        (e) => e.getAttribute('data-astro-transition-persist') || e.getAttribute('style'),
      ),
    )
    vt.push({ from, to, during, named, finalPath: new URL(page.url()).pathname })
  }
  await ctx.close()
}
writeFileSync(join(REF, 'view-transitions.json'), JSON.stringify(vt, null, 2))

await browser.close()
console.log('wrote reference/legal/{stack-report.json,tokens.json,animations.json,search-queries.json,sort-orders.json,toc-scrollspy.json,view-transitions.json}')
