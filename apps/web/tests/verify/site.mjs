/**
 * Verification harness for the cloned content routes: the four index pages,
 * the five product/cloud landings and the 16 /use-cases/<slug>/ detail pages.
 *
 *   pnpm verify --page products
 *   pnpm verify --page our-method
 *   pnpm verify --page use-cases
 *   pnpm verify --page sovereign-ai
 *   pnpm verify --page products/vibe
 *   pnpm verify --page products/studio
 *   pnpm verify --page products/forge
 *   pnpm verify --page cloud/inference
 *   pnpm verify --page cloud/compute
 *   pnpm verify --page use-cases/<slug>
 *   pnpm verify --all
 *
 * Runs the live original and this clone side by side in one Chromium build with
 * the same viewport, colour scheme and scroll program. Writes
 * reference/pages/<page>/verification-report.md plus the measured artefacts
 * (animations.json|md, filter-matrix.json, scroll-story.json,
 * view-transitions.md|json, screenshots/).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { ORIGIN, CLONE, WIDTHS, SCHEMES, launch, openPage, settle, fullShot } from './lib.mjs'

const PORT = 4322
const TOL_PX = 1
const TOL_PIXEL_DIFF = 1

const STYLE_PROPS = [
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

const DEFINITIONS = {
  products: {
    route: '/products/',
    out: 'reference/pages/products',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', 'mistral-section-hero-text'],
      ['hero-h1', 'h1'],
      ['hero-title', '.js-title'],
      ['hero-eyebrow', 'mistral-section-hero-text li'],
      ['hero-sub', 'mistral-section-hero-text p.text-body-large'],
      ['bento', 'mistral-section-product-bento'],
      ['card-0', '.js-product-card'],
      ['card-4', '.js-product-card', 4],
      ['card-title', '.js-title-container'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [
      ['hero', 'mistral-section-hero-text'],
      ['bento', 'mistral-section-product-bento'],
      ['card-0', '.js-product-card'],
    ],
    mechanisms: [
      {
        name: 'Hero title slot-machine',
        evidence: 'mistral-atom-text-hero-title (data-autoplay, data-grow, data-randomness) + SplitText chunk; per-character swap on load',
      },
      {
        name: 'Bento entrance',
        evidence: '.bento-card[--i] + .in-view class added by product-bento.*.js show(); CSS transition',
      },
      {
        name: 'Card image lift on hover',
        evidence: '.js-product-card:hover img { transform: scale3d(1.05,1.05,1.05) } (300ms cubic-bezier(.4,0,.2,1)); the runtime additionally wires a title roll when a .js-title exists — the current markup has none, and the original logs the same warning',
      },
      {
        name: 'Bottom arrow loop',
        evidence: 'animate-fading-arrow-scroll-1..3 on the scroll hint',
      },
    ],
    interactions: async (page) => {
      const read = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.js-product-card')].map((c) => {
            const inner = c.querySelector('.js-title-container-inner')
            const img = c.querySelector('img')
            const cs = getComputedStyle(c)
            return {
              inner: inner ? getComputedStyle(inner).transform : null,
              imgT: getComputedStyle(img).transform,
              imgO: getComputedStyle(img).opacity,
              bg: cs.backgroundColor,
              border: cs.borderColor,
            }
          }),
        )
      const before = await read()
      const box = await page.evaluate(() => {
        const el = document.querySelectorAll('.js-product-card')[1]
        el.scrollIntoView({ block: 'center' })
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      })
      await page.waitForTimeout(300)
      const b2 = await page.evaluate(() => {
        const el = document.querySelectorAll('.js-product-card')[1]
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      })
      await page.mouse.move(b2.x + b2.w / 2, b2.y + b2.h / 2)
      await page.waitForTimeout(700)
      const hover = await read()
      const sweep = []
      for (const [fx, fy] of [
        [0.1, 0.1],
        [0.5, 0.2],
        [0.9, 0.5],
        [0.5, 0.9],
      ]) {
        await page.mouse.move(b2.x + b2.w * fx, b2.y + b2.h * fy, { steps: 6 })
        await page.waitForTimeout(150)
        sweep.push(await read())
      }
      return {
        before,
        hover,
        sweep,
        box,
        hoverEffect: hover.some((c, i) => JSON.stringify(c) !== JSON.stringify(before[i])),
      }
    },
  },

  'our-method': {
    route: '/our-method/',
    out: 'reference/pages/our-method',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', 'mistral-section-hero-default'],
      ['hero-h1', 'h1'],
      ['hero-image', 'mistral-section-hero-default img'],
      ['value-headline', 'mistral-section-editorial-headline'],
      ['value', 'mistral-block-slideshow-cards-feature', 0],
      ['value-card-0', '.js-card-feature'],
      ['journey', '#page-path > section:nth-of-type(1)'],
      ['journey-image', '#page-path > section:nth-of-type(1) img'],
      ['working', 'mistral-block-slideshow-media-feature'],
      ['working-spoiler-0', 'mistral-atom-spoiler'],
      ['team', 'mistral-section-cards-service'],
      ['team-card-0', 'mistral-section-cards-service .js-slider-item'],
      ['quotes', 'mistral-section-carousel-collection'],
      ['quotes-slide-0', 'mistral-section-carousel-collection .js-slider-item'],
      ['flexibility', 'mistral-block-slideshow-cards-feature', 1],
      ['closing', '#page-path > section:nth-of-type(3)'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [
      ['hero', 'mistral-section-hero-default'],
      ['value', 'mistral-block-slideshow-cards-feature'],
      ['journey', '#page-path > section:nth-of-type(1)'],
      ['working', 'mistral-block-slideshow-media-feature'],
      ['quotes', 'mistral-section-carousel-collection'],
    ],
    mechanisms: [
      {
        name: 'Hero image + SplitText intro',
        evidence: 'mistral-section-hero-default data-loaded="false" flipped by hero-default.*.js; .js-title SplitText per character',
      },
      {
        name: 'Value / flexibility card slideshow',
        evidence: 'slideshow-cards-feature + slideshow.CWoS44AO.js: hover trigger, auto progressbar (.js-progressbar) and .js-card-spoiler height',
      },
      {
        name: 'Working with Mistral tab stack',
        evidence: 'slideshow-media-feature + mistral-atom-spoiler: trigger click/hover switches .js-media[data-active] and the panel spoiler',
      },
      {
        name: 'Customer quotes slider',
        evidence: 'carousel-collection + Swiper (slider.CmLRuZco.js), loop:true, .js-next/.js-prev + navigation dots',
      },
      {
        name: 'Journey graphic reveal',
        evidence: 'data-loaded on the section; CSS fade/translate once in view',
      },
    ],
    interactions: async (page) => {
      // Structural state only: autoplay makes pixel progress and track
      // transforms depend on the sampled frame, not on the clone's behaviour.
      const state = () =>
        page.evaluate(() => {
          const carousel = document.querySelector('mistral-section-carousel-collection')
          const items = carousel ? [...carousel.querySelectorAll('.js-slider-item')] : []
          const cr = carousel?.getBoundingClientRect()
          const activeQuote = items.findIndex((i) => {
            const r = i.getBoundingClientRect()
            return cr && Math.abs(r.left - cr.left) < 3 && r.width > 0
          })
          return {
            cards: [...document.querySelectorAll('mistral-block-slideshow-cards-feature')].map((s) =>
              [...s.querySelectorAll('.js-card-feature')].map((c) => c.dataset.active ?? null),
            ),
            progress: [...document.querySelectorAll('mistral-block-slideshow-cards-feature .js-progressbar')].map(
              (p) => (p.getBoundingClientRect().width || p.getBoundingClientRect().height) > 2,
            ),
            media: [...document.querySelectorAll('mistral-block-slideshow-media-feature .js-media')].map(
              (m) => m.dataset.active ?? null,
            ),
            spoilers: [...document.querySelectorAll('mistral-block-slideshow-media-feature mistral-atom-spoiler')].map(
              (s) => s.dataset.open ?? null,
            ),
            quoteCount: items.length,
            activeQuote,
            quoteDots: [...document.querySelectorAll('mistral-section-carousel-collection .js-dots > *')].map((d) =>
              d.className.includes('active') || d.getAttribute('data-active') === 'true',
            ),
          }
        })
      const out = { initial: await state() }
      // card slideshow: click the second card in the value grid
      await page.evaluate(() => document.querySelectorAll('mistral-block-slideshow-cards-feature')[0].querySelectorAll('.js-card-feature')[1].click())
      await page.waitForTimeout(900)
      out.valueSecond = await state()
      // working: open each spoiler in turn
      out.working = []
      for (let i = 0; i < 3; i++) {
        await page.evaluate((idx) => {
          const s = document.querySelectorAll('mistral-block-slideshow-media-feature mistral-atom-spoiler')[idx]
          s.querySelector('.js-spoiler-trigger')?.click()
        }, i)
        await page.waitForTimeout(900)
        out.working.push(await state())
      }
      // quotes: next then prev
      await page.evaluate(() => {
        const next = [...document.querySelectorAll('mistral-section-carousel-collection .js-next')][0]
        const prev = [...document.querySelectorAll('mistral-section-carousel-collection .js-prev')][0]
        next?.click()
        setTimeout(() => prev?.click(), 900)
      })
      await page.waitForTimeout(2200)
      out.quotesNav = await state()
      // flexibility hover
      await page.evaluate(() => {
        const sec = document.querySelectorAll('mistral-block-slideshow-cards-feature')[1]
        sec.scrollIntoView({ block: 'center' })
      })
      await page.waitForTimeout(400)
      const flexBox = await page.evaluate(() => {
        const el = document.querySelectorAll('mistral-block-slideshow-cards-feature')[1].querySelectorAll('.js-card-feature')[2]
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      })
      await page.mouse.move(flexBox.x + flexBox.w / 2, flexBox.y + flexBox.h / 2)
      await page.waitForTimeout(900)
      out.flexHover = await state()
      return out
    },
  },

  'use-cases': {
    route: '/use-cases/',
    out: 'reference/pages/use-cases',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', 'mistral-section-hero-text'],
      ['hero-h1', 'h1'],
      ['filter-0', 'mistral-atom-input-tag-filter', 0],
      ['filter-17', 'mistral-atom-input-tag-filter', 17],
      ['posts', 'mistral-section-posts'],
      ['post-0', '.js-post'],
      ['count', '.js-post-filter-count'],
      ['pagination', 'mistral-atom-navigation-pagination'],
      ['search', '.js-post-filter-search'],
      ['empty', '.js-empty-result'],
      ['footer', 'footer'],
    ],
    motion: [
      ['hero', 'mistral-section-hero-text'],
      ['index', 'mistral-section-posts'],
      ['card-0', '.js-post'],
    ],
    mechanisms: [
      {
        name: 'Live counter + list filter',
        evidence: 'posts.*.js filter(): OR across every selected chip (`data-categories` split, .some), display:none on hidden rows, count.innerHTML',
      },
      {
        name: 'Pagination',
        evidence: 'navigation-pagination.*.js: 9 per page, mousedown on .js-pagination-page, page in ?page=, hide() when one page',
      },
      {
        name: 'Scroll to listing top on filter/page change',
        evidence: 'posts.*.js goTop() -> scrollTo(this.top, {offset:-48})',
      },
      {
        name: 'Card hover',
        evidence: 'group/use-case: icon scale-95 + background shift + arrow slide (CSS transition)',
      },
    ],
    interactions: async (page) => filterMatrix(page),
  },

  'sovereign-ai': {
    route: '/sovereign-ai/',
    out: 'reference/pages/sovereign-ai',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', 'mistral-section-hero-sovereign'],
      ['hero-h1', 'h1'],
      ['hero-flag', 'mistral-section-hero-sovereign img'],
      ['scroll-story', 'mistral-block-scrolling-sovereignty'],
      ['scroll-fig', '.js-fig-tag-container'],
      ['layers', 'mistral-block-slideshow-media-feature'],
      ['layers-spoiler-0', 'mistral-atom-spoiler'],
      ['path', 'mistral-atom-navigation-summary'],
      ['path-anchor-0', 'mistral-atom-spoiler[data-id]', 0],
      ['closing', '#page-path > mistral-section-editorial-headline:last-child'],
      ['footer', 'footer'],
    ],
    motion: [
      ['hero', 'mistral-section-hero-sovereign'],
      ['scroll-story', 'mistral-block-scrolling-sovereignty'],
      ['layers', 'mistral-block-slideshow-media-feature'],
      ['path', 'mistral-atom-navigation-summary'],
    ],
    mechanisms: [
      {
        name: 'Pinned, scrubbed sovereignty diagram',
        evidence: 'scrolling-sovereignty.*.js: GSAP timeline + ScrollTrigger {trigger: this, start:"top+=100px", end:"bottom 100%", scrub:true}; tags orbit then collapse, square scale 1→0.4→1, circles 2/3, border #ff8204',
      },
      {
        name: 'Layer tabs',
        evidence: 'slideshow-media-feature + spoilers; .js-media[data-active] cross-fade, .js-progressbar height',
      },
      {
        name: 'Scroll-spy path',
        evidence: 'navigation-summary.*.js + mistral-atom-spoiler[data-id]; anchors #6abe…; mobile summary label',
      },
      {
        name: 'Flag spritesheet',
        evidence: '/images/spritesheets/flag.gif above the h1; GIF left unoptimised',
      },
      {
        name: 'Hero SplitText',
        evidence: 'mistral-atom-text-hero-title autoplay/grow/randomness; .js-title opacity handled by SplitText',
      },
    ],
    interactions: async (page) => scrollStory(page),
  },

  'products/vibe': {
    route: '/products/vibe/',
    out: 'reference/pages/products-vibe',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', '#page-path > :nth-child(1)'],
      ['hero-h1', 'h1'],
      ['logos', 'mistral-section-slider-logo-scrolling'],
      ['features', '#page-path > :nth-child(4)'],
      ['pricing', '#page-path > :nth-child(6)'],
      ['understand', '#page-path > :nth-child(7)'],
      ['ship', '#page-path > :nth-child(9)'],
      ['faq', '#page-path > :nth-child(11)'],
      ['closing', '#page-path > :nth-child(12)'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [
      ['hero', '#page-path > :nth-child(1)'],
      ['features', 'mistral-block-slideshow-media-feature'],
      ['understand', '#page-path > :nth-child(7)'],
    ],
    mechanisms: [
      {
        name: 'Hero title slot-machine',
        evidence: 'mistral-atom-text-hero-title (data-autoplay, data-grow, data-randomness) + SplitText per character',
      },
      {
        name: 'Feature tabs',
        evidence: 'slideshow-media-feature + mistral-atom-spoiler; .js-media[data-active] cross-fade and mistral-atom-progressbar',
      },
      {
        name: 'Capability scroll-spy',
        evidence: 'navigation-summary.*.js + mistral-atom-spoiler[data-id]; anchors #6a0f…, mobile sticky summary',
      },
      {
        name: 'Price tax toggle',
        evidence: 'mistral-atom-text-price .js-exclude-taxe + mistral-atom-button-tooltip',
      },
      {
        name: 'OS download switcher',
        evidence: 'mistral-atom-button-os-download detects the platform and reveals the matching platform row',
      },
    ],
    interactions: async (page) => {
      const state = () =>
        page.evaluate(() => ({
          spoilers: [...document.querySelectorAll('#page-path mistral-atom-spoiler')].map((s) => s.dataset.open ?? null),
          anchors: [...document.querySelectorAll('#page-path mistral-atom-navigation-summary a.js-anchor')].map((a) => ({
            id: a.dataset.id,
            active: a.dataset.active ?? null,
          })),
          prices: [...document.querySelectorAll('mistral-atom-text-price')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
          hash: location.hash,
          y: Math.round(scrollY),
        }))
      const out = { initial: await state() }
      for (const [sec, idx] of [
        [7, 1],
        [11, 0],
      ]) {
        await page.evaluate(
          ([s, i]) => {
            document.querySelector(`#page-path > :nth-child(${s})`).querySelectorAll('.js-spoiler-trigger')[i]?.click()
          },
          [sec, idx],
        )
        await page.waitForTimeout(800)
        out[`spoiler-${sec}`] = await state()
      }
      await page.evaluate(() => {
        document.querySelectorAll('#page-path > :nth-child(7) mistral-atom-navigation-summary a.js-anchor')[2]?.click()
      })
      await page.waitForTimeout(1600)
      out.anchor = await state()
      return out
    },
  },
}

// ------------------------------------- product / cloud landing-page definitions
// Shared state dump for the spoiler, tab, price and slider driven sections of
// the four product/cloud landing pages.

const landingState = (page) =>
  page.evaluate(() => ({
    spoilers: [...document.querySelectorAll('#page-path mistral-atom-spoiler')].map((s) => s.dataset.open ?? null),
    tabs: [...document.querySelectorAll('#page-path .js-tabs')].map((g) => g.dataset.value ?? null),
    tabActive: [...document.querySelectorAll('#page-path .js-tab')].map((t) => t.dataset.active ?? null),
    prices: [...document.querySelectorAll('#page-path mistral-atom-text-price')]
      .map((e) => e.innerText.replace(/\s+/g, ' ').trim())
      .slice(0, 4),
    anchors: [...document.querySelectorAll('#page-path a.js-anchor')].map((a) => ({
      id: a.dataset.id,
      active: a.dataset.active ?? null,
    })),
    media: [...document.querySelectorAll('#page-path .js-media')].map((m) => m.dataset.active ?? null),
    hash: location.hash,
    y: Math.round(scrollY),
  }))

const sliderState = (page) =>
  page.evaluate(() => ({
    items: [...document.querySelectorAll('#page-path .js-slider-item')].map((i) => getComputedStyle(i).transform),
    dots: [...document.querySelectorAll('#page-path .js-dots *')].map(
      (d) => `${d.tagName}:${d.dataset.index ?? ''}:${d.dataset.active ?? ''}`,
    ),
  }))

const hoverServiceCard = async (page) => {
  const box = await page.evaluate(() => {
    const el = document.querySelector('.js-card-service')
    if (!el) return null
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (!box) return null
  await page.waitForTimeout(500)
  await page.mouse.move(box.x, box.y)
  await page.waitForTimeout(700)
  return page.evaluate(() =>
    [...document.querySelectorAll('.js-card-service')].map((c) => {
      const d = c.querySelector('.js-card-service-description')
      return {
        desc: d ? getComputedStyle(d).opacity : null,
        transform: d ? getComputedStyle(d).transform : null,
        bg: getComputedStyle(c).backgroundColor,
      }
    }),
  )
}

const LANDING_PAGES = {
  'products/studio': {
    route: '/products/studio/',
    out: 'reference/pages/products-studio',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', 'mistral-section-hero-product-studio'],
      ['hero-h1', 'h1'],
      ['platform', '#page-path > :nth-child(2)'],
      ['platform-summary', 'mistral-atom-navigation-summary'],
      ['cards-headline', 'mistral-section-editorial-headline'],
      ['cards', 'mistral-section-cards-service'],
      ['card-0', '.js-card-service'],
      ['closing', '#page-path > :nth-child(5)'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [
      ['hero', 'mistral-section-hero-product-studio'],
      ['platform', 'mistral-atom-navigation-summary'],
    ],
    mechanisms: [
      {
        name: 'Hero product animation',
        evidence: 'mistral-section-hero-product-studio: mistral-atom-text-hero-title (autoplay/grow/randomness) plus the js-studio-image / js-studio-background frame swap driven by hero-product-studio.*.js',
      },
      {
        name: 'Platform scroll-spy + spoilers',
        evidence: 'mistral-atom-navigation-summary (navigation-summary.*.js) drives a.js-anchor[data-active] and the mistral-atom-spoiler[data-id] panels of section 2; anchored by the #69f2… ids',
      },
      {
        name: 'Sticky media panel',
        evidence: '.js-sticky / .js-media: the left column pins while the spoiler list scrolls; progressbar height follows the trigger',
      },
      {
        name: 'Service card hover',
        evidence: '.js-card-service:hover reveals .js-card-service-description (opacity/transform transition)'},
    ],
    interactions: async (page) => {
      const out = { initial: await landingState(page) }
      await page.evaluate(() => {
        document.querySelectorAll('#page-path > :nth-child(2) .js-spoiler-trigger')[0]?.click()
      })
      await page.waitForTimeout(900)
      out.spoiler = await landingState(page)
      await page.evaluate(() => {
        document.querySelectorAll('#page-path > :nth-child(2) mistral-atom-navigation-summary a.js-anchor')[2]?.click()
      })
      await page.waitForTimeout(1800)
      out.anchor = await landingState(page)
      out.hover = await hoverServiceCard(page)
      return out
    },
  },

  'products/forge': {
    route: '/products/forge/',
    out: 'reference/pages/products-forge',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', 'mistral-section-hero-product-forge'],
      ['hero-h1', 'h1'],
      ['logos', 'mistral-section-slider-logo-scrolling'],
      ['why', 'mistral-block-slideshow-media-feature'],
      ['system', '#page-path > :nth-child(6)'],
      ['system-summary', 'mistral-atom-navigation-summary'],
      ['media', '#page-path > :nth-child(7)'],
      ['industries', 'mistral-section-carousel-collection'],
      ['closing', '#page-path > :nth-child(10)'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [
      ['hero', 'mistral-section-hero-product-forge'],
      ['logos', 'mistral-section-slider-logo-scrolling'],
      ['why', 'mistral-block-slideshow-media-feature'],
    ],
    mechanisms: [
      {
        name: 'Hero product animation',
        evidence: 'mistral-section-hero-product-forge + mistral-atom-text-hero-title; js-forge-image frame swap',
      },
      {
        name: 'Infinite logo marquee',
        evidence: 'mistral-block-slider-infinite-scrolling copies the track twice and translates it in a loop',
      },
      {
        name: 'Why Forge: tabbed media slideshow',
        evidence: 'mistral-block-slideshow-media-feature with mistral-atom-spoiler + mistral-atom-progressbar; .js-media[data-active] cross-fade',
      },
      {
        name: 'System scroll-spy',
        evidence: 'mistral-atom-navigation-summary a.js-anchor[data-active] scrolls the six spoiler panels of section 6',
      },
      {
        name: 'Industry carousel',
        evidence: 'mistral-section-carousel-collection: .js-slider/.js-slider-item, .js-prev/.js-next and .js-dots',
      },
    ],
    interactions: async (page) => {
      const out = { initial: await landingState(page) }
      await page.evaluate(() => {
        const s = document.querySelectorAll('#page-path > :nth-child(6) .js-spoiler-trigger')
        s[0]?.click()
        s[1]?.click()
      })
      await page.waitForTimeout(1000)
      out.spoilers = await landingState(page)
      out.sliderBefore = await sliderState(page)
      await page.evaluate(() => {
        document.querySelector('#page-path .js-next')?.click()
      })
      await page.waitForTimeout(1200)
      out.sliderAfter = await sliderState(page)
      out.hover = await hoverServiceCard(page)
      return out
    },
  },

  'cloud/inference': {
    route: '/cloud/inference/',
    out: 'reference/pages/cloud-inference',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="2"]', 0, true],
      ['hero', '#page-path > :nth-child(1)'],
      ['hero-h1', 'h1'],
      ['hero-tabs', 'mistral-atom-navigation-tabs'],
      ['logos', 'mistral-section-slider-logo-scrolling'],
      ['sovereignty', 'mistral-block-slideshow-cards-feature'],
      ['models', 'mistral-section-highlighted-models'],
      ['apis', '#page-path > :nth-child(8)'],
      ['stories', 'mistral-section-carousel-collection'],
      ['resources', 'mistral-section-cards-service'],
      ['faq', '#page-path > :nth-child(13)'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [
      ['hero', '#page-path > :nth-child(1)'],
      ['sovereignty', 'mistral-block-slideshow-cards-feature'],
      ['models', 'mistral-section-highlighted-models'],
    ],
    mechanisms: [
      {
        name: 'Hero terminal build',
        evidence: 'mistral-block-terminal-build types the code sample; mistral-atom-navigation-tabs (.js-tabs/.js-tab/.js-tab-content) switches Python/JavaScript/curl',
      },
      {
        name: 'Sovereignty slideshow cards',
        evidence: 'mistral-block-slideshow-cards-feature + mistral-atom-navigation-dots + mistral-atom-progressbar; .js-media[data-active]',
      },
      {
        name: 'Model catalogue tabs',
        evidence: 'mistral-section-highlighted-models: mistral-atom-navigation-tab-processing/-pricing, mistral-atom-input-checkbox-regional and mistral-atom-text-price (js-text-price/regional discount)',
      },
      {
        name: 'Quote carousel',
        evidence: 'mistral-section-carousel-collection (.js-slider-item, .js-prev/.js-next)',
      },
      {
        name: 'FAQ spoilers',
        evidence: 'mistral-atom-spoiler + .js-spoiler-trigger in the final section',
      },
    ],
    interactions: async (page) => {
      const out = { initial: await landingState(page) }
      // Language tab in the hero terminal.
      await page.evaluate(() => {
        document.querySelectorAll('#page-path .js-tabs')[0]?.querySelectorAll('.js-tab')[1]?.click()
      })
      await page.waitForTimeout(900)
      out.heroTab = await landingState(page)
      // Pricing/processing tab group inside the model catalogue.
      await page.evaluate(() => {
        const groups = [...document.querySelectorAll('#page-path .js-tabs')]
        groups[1]?.querySelectorAll('.js-tab')[1]?.click()
      })
      await page.waitForTimeout(900)
      out.pricingTab = await landingState(page)
      // Regional pricing checkbox.
      await page.evaluate(() => {
        document.querySelector('#page-path mistral-atom-input-checkbox-regional input')?.click()
      })
      await page.waitForTimeout(900)
      out.regional = await landingState(page)
      // FAQ panel.
      await page.evaluate(() => {
        document.querySelectorAll('#page-path > :nth-child(13) .js-spoiler-trigger')[0]?.click()
      })
      await page.waitForTimeout(900)
      out.faq = await landingState(page)
      return out
    },
  },

  'cloud/compute': {
    route: '/cloud/compute/',
    out: 'reference/pages/cloud-compute',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="2"]', 0, true],
      ['hero', 'mistral-section-hero-text'],
      ['hero-h1', 'h1'],
      ['media', '#page-path > :nth-child(2)'],
      ['quotes', 'mistral-section-carousel-collection'],
      ['infra', 'mistral-block-slideshow-media-feature'],
      ['controls', 'mistral-section-cards-service'],
      ['guarantees', '#page-path > :nth-child(8)'],
      ['closing', '#page-path > :nth-child(9)'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [
      ['hero', 'mistral-section-hero-text'],
      ['quotes', 'mistral-section-carousel-collection'],
      ['infra', 'mistral-block-slideshow-media-feature'],
    ],
    mechanisms: [
      {
        name: 'Hero SplitText',
        evidence: 'mistral-atom-text-hero-title (autoplay/grow/randomness) on mistral-section-hero-text',
      },
      {
        name: 'Quote carousel',
        evidence: 'mistral-section-carousel-collection: .js-slider-item transform, .js-prev/.js-next, .js-dots',
      },
      {
        name: 'Infrastructure slideshow',
        evidence: 'mistral-block-slideshow-media-feature with mistral-atom-spoiler + mistral-atom-progressbar; .js-media[data-active] cross-fade',
      },
      {
        name: 'Card grid reveal',
        evidence: 'mistral-section-cards-service + .js-card-service: description/hover transition, in-view reveal',
      },
    ],
    interactions: async (page) => {
      const out = { initial: await landingState(page) }
      await page.evaluate(() => {
        document.querySelectorAll('#page-path .js-spoiler-trigger')[1]?.click()
      })
      await page.waitForTimeout(900)
      out.spoiler = await landingState(page)
      out.sliderBefore = await sliderState(page)
      await page.evaluate(() => {
        document.querySelector('#page-path .js-next')?.click()
      })
      await page.waitForTimeout(1200)
      out.sliderAfter = await sliderState(page)
      out.hover = await hoverServiceCard(page)
      return out
    },
  },
}

Object.assign(DEFINITIONS, LANDING_PAGES)

// ------------------------------------------------- use-case detail definitions
// /use-cases/<slug>/ is one CMS template: a hero section, a two-column body and,
// on some pages, a "related use cases" headline + slider. The probes are shared;
// only the route and report directory differ per slug.

// Derived from the captured markup so a new detail page is picked up without
// editing this file (the same capture drives src/content/details.ts).
const USE_CASE_DETAIL_SLUGS = (await fs.readdir('src/markup/use-cases-detail'))
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.slice(0, -'.html'.length))
  .sort()

const INDUSTRY_SLUGS = (await fs.readdir('src/markup/industry/markup')).sort()

const CUSTOMER_SLUGS = (await fs.readdir('src/markup/customers-detail'))
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.slice(0, -'.html'.length))
  .sort()

function useCaseDetailDefinition(slug) {
  return {
    route: `/use-cases/${slug}/`,
    out: `reference/pages/use-cases-${slug}`,
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="1"]', 0, true],
      ['hero', '#page-path > section'],
      ['hero-h1', 'h1'],
      ['hero-icon', '#page-path > section img'],
      ['hero-tags', '#page-path > section .flex.items-center.gap-2'],
      ['sidebar', '#page-path > div > div'],
      ['body', '#page-path > div'],
      ['challenge', '#page-path h2'],
      ['media', '#page-path iframe'],
      ['related', 'mistral-block-slider-cards'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [],
    mechanisms: [
      {
        name: 'Static CMS detail template',
        evidence: 'No client-side state: hero + sticky summary card + Challenge/Solution/Result grid, server-rendered by the original Astro app',
      },
      {
        name: 'Button icon roll on hover',
        evidence: 'group/button translate-x custom properties on the back link and CTA, 300ms CSS transition',
      },
      {
        name: 'Related-use-case slider',
        evidence: 'mistral-block-slider-cards (Swiper) on pages that carry a related section',
      },
    ],
    interactions: async (page) => {
      const state = () =>
        page.evaluate(() => ({
          tags: [...document.querySelectorAll('#page-path > section p.text-eyebrow-small')].map((e) => e.textContent.trim()),
          headings: [...document.querySelectorAll('#page-path h1, #page-path h2')].map((e) => e.textContent.trim()),
          frames: [...document.querySelectorAll('#page-path iframe')].map((f) => [
            f.getAttribute('src'),
            Math.round(f.getBoundingClientRect().width),
            Math.round(f.getBoundingClientRect().height),
          ]),
          // The detail hero links to `/use-cases` (redirected by the live site);
          // compare the resolved route, not the saved attribute.
          back: (() => {
            const a = document.querySelector('#page-path > section a')
            return a ? new URL(a.href).pathname.replace(/\/$/, '') : null
          })(),
        }))
      const out = { initial: await state() }
      await page.evaluate(() => document.querySelector('#page-path > section a')?.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(400)
      const box = await page.evaluate(() => {
        const a = document.querySelector('#page-path > section a')
        const r = a.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })
      await page.mouse.move(box.x, box.y)
      await page.waitForTimeout(700)
      out.hover = await page.evaluate(() => ({
        spans: [...document.querySelectorAll('#page-path > section a span')].map((s) => getComputedStyle(s).transform),
        text: [...document.querySelectorAll('#page-path > section a p')].map((p) => getComputedStyle(p).transform),
      }))
      return out
    },
  }
}

for (const slug of USE_CASE_DETAIL_SLUGS) {
  DEFINITIONS[`use-cases/${slug}`] = useCaseDetailDefinition(slug)
}

// ------------------------------------------------------- customers definitions
// /customers/ is a collection index (hero + featured slider + post grid) and
// /customers/<slug>/ is one CMS template for all 42 stories (hero grid + prose
// body), so the index gets its own definition and the stories share one.

defineCustomers()

function defineCustomers() {
  DEFINITIONS.customers = {
    route: '/customers/',
    out: 'reference/pages/customers',
    landmarks: [
      ['header', '[data-header]'],
      ['nav-active', '[data-nav-index="3"]', 0, true],
      ['hero', 'mistral-section-hero-collection'],
      ['hero-title', '.js-title'],
      ['hero-sub', 'mistral-section-hero-collection p.text-body-large'],
      ['featured', 'mistral-block-slider-cards-collection'],
      ['featured-card', 'mistral-block-slider-cards-collection .js-slider-item'],
      ['grid', 'mistral-section-posts'],
      ['grid-card', 'mistral-section-posts a[href^="/customers/"]'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [['hero-title', 'mistral-atom-text-hero-title']],
    mechanisms: [
      {
        name: 'Collection hero title',
        evidence: 'mistral-atom-text-hero-title (data-autoplay, data-grow, data-randomness) + SplitText chunk; the h1 is sr-only and the visible copy is aria-hidden',
      },
      {
        name: 'Featured slider',
        evidence: 'mistral-block-slider-cards-collection + slider-cards-collection.*.js (Swiper): the six featured stories are one draggable track',
      },
      {
        name: 'Post grid',
        evidence: 'mistral-section-posts with data-filtering="false" data-load-more="false" data-post-per-page="-1": all 42 cards are server-rendered, the runtime adds no controls',
      },
      {
        name: 'Card hover',
        evidence: '.js-slider-item:hover { opacity: .9 } (300ms transition); the image fades in on load via onload',
      },
    ],
    interactions: async (page) => {
      const state = () =>
        page.evaluate(() => ({
          cards: document.querySelectorAll('mistral-section-posts a[href^="/customers/"]').length,
          chips: [...document.querySelectorAll('mistral-section-posts [data-category-slug]')]
            .map((e) => e.dataset.categorySlug)
            .slice(0, 8),
          // The live slider links to `/customers/<slug>` and the clone to the
          // trailing-slash path the origin redirects to; compare the target.
          featured: [...document.querySelectorAll('mistral-block-slider-cards-collection .js-slider-item')].map((a) =>
            new URL(a.href).pathname.replace(/\/$/, ''),
          ),
        }))
      const out = { initial: await state() }
      const box = await page.evaluate(() => {
        const el = document.querySelector('mistral-block-slider-cards-collection .js-slider-item')
        el?.scrollIntoView({ block: 'center' })
        const r = el?.getBoundingClientRect()
        return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null
      })
      if (box) {
        await page.mouse.move(box.x, box.y)
        await page.waitForTimeout(600)
      }
      out.hover = await page.evaluate(() =>
        getComputedStyle(document.querySelector('mistral-block-slider-cards-collection .js-slider-item')).opacity,
      )
      await page.evaluate(() => (location.hash = '#main'))
      return out
    },
  }

  for (const slug of CUSTOMER_SLUGS) {
    DEFINITIONS[`customers/${slug}`] = {
      route: `/customers/${slug}/`,
      out: `reference/pages/customers-${slug}`,
      landmarks: [
        ['header', '[data-header]'],
        ['nav-active', '[data-nav-index="3"]', 0, true],
        ['hero', '#page-path > section'],
        ['hero-h1', '#page-path h1'],
        ['hero-chip', '#page-path > section p.text-eyebrow-small'],
        ['hero-logo', '#page-path > section img'],
        ['summary', '#page-path > section p.text-h5'],
        ['back', '#page-path > section a'],
        ['body', '#page-path > section:nth-of-type(2)'],
        ['body-text', '#page-path > section:nth-of-type(2) p'],
        ['footer', 'footer'],
        ['footer-cat', '#footer-m', 0, true],
      ],
      motion: [],
      mechanisms: [
        {
          name: 'Static CMS story template',
          evidence: 'No client-side state: a hero grid (name, category chip, logo, summary, back link, cover image) plus one prose body, server-rendered by the original Astro app',
        },
        {
          name: 'Category chip colour',
          evidence: 'inline background-color on the chip (per-category), not a class',
        },
        {
          name: 'Button icon roll on hover',
          evidence: 'group/button translate-x custom properties on the back link, 300ms CSS transition',
        },
      ],
      interactions: async (page) => {
        const state = () =>
          page.evaluate(() => ({
            h1: document.querySelector('#page-path h1')?.textContent.trim(),
            chip: document.querySelector('#page-path > section p.text-eyebrow-small')?.textContent.trim(),
            summary: document.querySelector('#page-path > section p.text-h5')?.textContent.trim(),
            body: [...document.querySelectorAll('#page-path > section:nth-of-type(2) p')].length,
            back: new URL(document.querySelector('#page-path > section a').href).pathname.replace(/\/$/, ''),
          }))
        const out = { initial: await state() }
        await page.evaluate(() => document.querySelector('#page-path > section a')?.scrollIntoView({ block: 'center' }))
        await page.waitForTimeout(400)
        const box = await page.evaluate(() => {
          const a = document.querySelector('#page-path > section a')
          const r = a.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        })
        await page.mouse.move(box.x, box.y)
        await page.waitForTimeout(700)
        out.hover = await page.evaluate(() => ({
          spans: [...document.querySelectorAll('#page-path > section a span')].map((s) => getComputedStyle(s).transform),
          text: [...document.querySelectorAll('#page-path > section a p')].map((p) => getComputedStyle(p).transform),
        }))
        return out
      },
    }
  }
}

// -------------------------------------------------------- industry definitions
// /industry/ renders an empty #page-path on the original, so only the shared
// chrome is measured. The five verticals share one 14-block template (the
// cybersecurity page adds the "Built for the Defenders" promo), so one factory
// covers them all.

defineIndustry()

function defineIndustry() {
  DEFINITIONS.industry = {
    route: '/industry/',
    out: 'reference/pages/industry',
    landmarks: [
      ['header', '[data-header]'],
      ['path', '#page-path'],
      ['footer', 'footer'],
      ['footer-cat', '#footer-m', 0, true],
    ],
    motion: [],
    mechanisms: [
      {
        name: 'Empty route',
        evidence: 'The original renders /industry/ with nothing inside #page-path; the five verticals are linked from the mega menu, so header + footer are the whole page',
      },
    ],
    interactions: async (page) =>
      page.evaluate(() => ({
        blocks: document.querySelectorAll('#page-path > *').length,
        links: document.querySelectorAll('a[href]').length,
        h1: document.querySelectorAll('h1').length,
      })),
  }

  for (const vertical of INDUSTRY_SLUGS) {
    DEFINITIONS[`industry/${vertical}`] = {
      route: `/industry/${vertical}/`,
      out: `reference/pages/industry-${vertical}`,
      landmarks: [
        ['header', '[data-header]'],
        ['hero', '#page-path > :first-child'],
        ['hero-h1', '#page-path h1'],
        ['cover', '#page-path > section img'],
        ['logos', 'mistral-section-slider-logo-scrolling'],
        ['trusted', 'mistral-block-slideshow-cards-feature'],
        ['capabilities', 'mistral-block-slideshow-media-feature'],
        ['experts', 'mistral-section-cards-service'],
        ['use-cases', 'mistral-block-slider-cards'],
        ['closing', '#page-path > :last-child'],
        ['footer', 'footer'],
        ['footer-cat', '#footer-m', 0, true],
      ],
      motion: [['logos', 'mistral-section-slider-logo-scrolling']],
      mechanisms: [
        {
          name: 'Static vertical landing page',
          evidence: 'Fourteen captured blocks in one #page-path: hero, cover, trusted headline + cards, logo strip, sovereignty headline + cards, capabilities headline + tabbed media, experts headline + service cards, use-case headline + slider, closing CTA',
        },
        {
          name: 'Logo strip + card sliders',
          evidence: 'mistral-section-slider-logo-scrolling / mistral-block-slideshow-cards-feature / mistral-block-slider-cards are the original Swiper components, driven by the self-hosted runtime',
        },
        {
          name: 'Scroll-reveal media',
          evidence: 'data-loaded="false" on the cover frame, flipped by the original runtime once the WebP decodes (opacity/blur transition)',
        },
      ],
      interactions: async (page) => {
        const state = () =>
          page.evaluate(() => ({
            blocks: document.querySelectorAll('#page-path > *').length,
            h1: document.querySelector('#page-path h1')?.textContent.trim(),
            headlines: [...document.querySelectorAll('#page-path h2')].map((h) => h.textContent.trim()),
            cards: document.querySelectorAll('mistral-section-cards-service .js-card-service').length,
            slides: document.querySelectorAll('mistral-block-slider-cards .js-slider-item').length,
          }))
        const out = { initial: await state() }
        const box = await page.evaluate(() => {
          const a = document.querySelector('#page-path mistral-section-editorial-headline a')
          if (!a) return null
          a.scrollIntoView({ block: 'center' })
          const r = a.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        })
        if (box) {
          await page.mouse.move(box.x, box.y)
          await page.waitForTimeout(600)
        }
        out.hover = await page.evaluate(() => {
          const a = document.querySelector('#page-path mistral-section-editorial-headline a')
          // `/customers?categories=…` 301s to `/customers/?categories=…` on the
          // origin; the clone emits the resolved path, so compare that.
          const href = a ? new URL(a.href) : null
          return a
            ? {
                href: (href.pathname.replace(/\/$/, '') + (href.search || '')).replace(/^\/customers\?/, '/customers/?'),
                spans: [...a.querySelectorAll('span')].map((s) => getComputedStyle(s).transform),
              }
            : null
        })
        return out
      },
    }
  }
}

// ---------------------------------------------------------------- shared helpers

function makeRecorder() {
  const results = []
  let failureCount = 0
  return {
    results,
    get failures() {
      return failureCount
    },
    record(group, name, pass, detail) {
      if (!pass) failureCount++
      results.push({ group, name, pass, detail })
      console.log(`${pass ? 'PASS' : 'FAIL'}  ${group} · ${name}${detail ? ' — ' + detail : ''}`)
    },
  }
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
  })
  if (!(await waitForServer(CLONE))) throw new Error('static server failed to start (run `pnpm build` first)')
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

async function landmarks(page, defs) {
  return page.evaluate(
    ({ defs, props }) => {
      const out = {}
      for (const [name, sel, index = 0] of defs) {
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
    { defs, props: STYLE_PROPS },
  )
}

function compareLandmarks(defs, a, b) {
  const animated = new Set(defs.filter((d) => d[3]).map((d) => d[0]))
  const diffs = []
  for (const [name] of defs) {
    const x = a[name]
    const y = b[name]
    if (!x || !y) {
      if (!!x !== !!y) diffs.push({ name, reason: 'presence', orig: !!x, clone: !!y })
      continue
    }
    const keys = animated.has(name) ? ['w', 'h'] : ['x', 'y', 'w', 'h']
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
    // Only declared CSS animations/named GSAP tweens are deterministic; CSS
    // transitions of an autoplaying slideshow appear/disappear depending on
    // the sampled frame, so they are excluded from the name list.
    const anims = await page.evaluate(
      (sel) =>
        (document.querySelector(sel)?.getAnimations({ subtree: true }) ?? [])
          .map((a) => a.animationName ?? (a.transitionProperty ? null : a.id ?? a.constructor.name))
          .filter(Boolean)
          .sort(),
      selector,
    )
    return { moving: anims.length > 0 || pct > 0.01, pct: +pct.toFixed(3), anims }
  } catch {
    return { moving: false, pct: 0, anims: [] }
  }
}

async function animationInventory(page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .map((a) => {
        // Only declared CSS animations and named WAAPI tweens are deterministic.
        // A CSS transition belongs to an autoplaying slider and is sampled at a
        // different phase on each site, like the frame probe in isMoving().
        const name = a.animationName ?? a.id
        if (!name) return null
        const t = a.effect?.getComputedTiming?.() ?? {}
        return {
          name,
          duration: t.duration ?? null,
          easing: t.easing ?? null,
          delay: t.delay ?? null,
          iterations: t.iterations ?? null,
        }
      })
      .filter(Boolean)
      .sort((a, b) => String(a.name).localeCompare(String(b.name))),
  )
}

const normLink = (u) => {
  const clean = u.replace(/^https?:\/\/(127\.0\.0\.1:4322|localhost:4322)/, 'https://mistral.ai')
  // The detail hero links to `/use-cases`, and the customers slider links to
  // `/customers/<slug>`; the live site 301s both to the trailing-slash path,
  // which is what the clone emits (it ships without redirects). Compare the
  // resolved target.
  if (clean === 'https://mistral.ai/use-cases') return 'https://mistral.ai/use-cases/'
  return clean
    .replace(/^(https:\/\/mistral\.ai\/customers(?:\/[a-z0-9-]+)?)$/, '$1/')
    .replace(/^(https:\/\/mistral\.ai\/customers)\?/, '$1/?')
}

// ------------------------------------------------------ use-cases filter matrix

const FILTER_SLUGS = [
  'government',
  'manufacturing',
  'financial-services',
  'energy',
  'technology',
  'healthcare-and-life-sciences',
  'consumer-products-and-retail',
  'transportation-and-logistics',
  'software-engineering-coding',
  'digital-assistant',
  'search',
  'speech',
  'customer-support',
  'cybersecurity',
  'risk-and-compliance',
  'document-intelligence',
  'agentic-workflows',
  'industrial-engineering',
]

const FILTER_COMBOS = [
  ['government', 'manufacturing'],
  ['energy', 'technology'],
  ['cybersecurity', 'risk-and-compliance'],
  ['speech', 'search'],
  ['software-engineering-coding', 'digital-assistant'],
  ['document-intelligence', 'agentic-workflows'],
  ['government', 'document-intelligence'],
  ['manufacturing', 'industrial-engineering'],
  ['financial-services', 'risk-and-compliance'],
  ['healthcare-and-life-sciences', 'digital-assistant'],
  ['technology', 'cybersecurity'],
  ['transportation-and-logistics', 'search'],
  ['consumer-products-and-retail', 'document-intelligence'],
  ['government', 'agentic-workflows', 'search'],
]

const postState = (page) =>
  page.evaluate(() => {
    const visible = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none'
    const rows = [...document.querySelectorAll('.js-post')]
    const shown = rows.filter((p) => getComputedStyle(p).display !== 'none')
    const pagination = document.querySelector('mistral-atom-navigation-pagination')
    return {
      count: document.querySelector('.js-post-filter-count')?.textContent?.trim() ?? null,
      results: shown.length,
      titles: shown.map((p) => p.dataset.title ?? p.querySelector('p')?.textContent?.trim() ?? ''),
      hrefs: shown.map((p) => new URL(p.getAttribute('href'), location.href).pathname),
      paginationVisible: pagination ? pagination.getAttribute('data-visible') : null,
      pages: [...document.querySelectorAll('.js-pagination-page')].map((p) => ({
        page: p.dataset.page,
        active: p.dataset.active,
        visible: p.dataset.visible,
      })),
      empty: visible(document.querySelector('.js-empty-result')),
      search: document.querySelector('.js-post-filter-search')?.value ?? null,
      query: location.search,
    }
  })

async function filterMatrix(page) {
  const out = { initial: await postState(page), singles: {}, combos: {}, pagination: {}, search: {}, scroll: {} }
  const toggle = async (slug) => {
    await page.evaluate((s) => {
      document.querySelector(`mistral-atom-input-tag-filter[data-slug="${s}"] label`)?.click()
    }, slug)
    await page.waitForTimeout(650)
  }
  for (const slug of FILTER_SLUGS) {
    await toggle(slug)
    out.singles[slug] = await postState(page)
    await toggle(slug)
  }
  out.cleared = await postState(page)
  for (const combo of FILTER_COMBOS) {
    for (const s of combo) await toggle(s)
    out.combos[combo.join('+')] = await postState(page)
    for (const s of combo) await toggle(s)
  }
  // pagination: page 2 (the runtime listens for mousedown), then back to page 1
  out.pagination.initial = await postState(page)
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.js-pagination-page')].find((p) => p.dataset.page === '2')
    el?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })
  await page.waitForTimeout(800)
  out.pagination.page2 = await postState(page)
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.js-pagination-page')].find((p) => p.dataset.page === '1')
    el?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })
  await page.waitForTimeout(800)
  out.pagination.back = await postState(page)
  // filter change while on page 2 -> resets pagination and scrolls to the list top
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.js-pagination-page')].find((p) => p.dataset.page === '2')
    el?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    window.scrollTo(0, document.querySelector('mistral-section-posts').getBoundingClientRect().top + scrollY + 800)
  })
  await page.waitForTimeout(500)
  out.scroll.before = await page.evaluate(() => Math.round(scrollY))
  await toggle('technology')
  out.scroll.after = await page.evaluate(() => Math.round(scrollY))
  out.pagination.afterFilter = await postState(page)
  await toggle('technology')
  // search: a real term and a term with no matches
  await page.evaluate(() => {
    const input = document.querySelector('.js-post-filter-search')
    input.value = 'CAD'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(700)
  out.search.hit = await postState(page)
  await page.evaluate(() => {
    const input = document.querySelector('.js-post-filter-search')
    input.value = 'zzzz-no-match'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(700)
  out.search.empty = await postState(page)
  out.search.emptyMarkup = await page.evaluate(() => {
    const el = document.querySelector('.js-empty-result')
    return el
      ? {
          text: el.innerText.replace(/\s+/g, ' ').trim(),
          // The clone drops the original's CDN cache-buster; compare without it.
          img: el.querySelector('img')?.getAttribute('src')?.replace(/\?dpl=[a-f0-9]+/g, ''),
          alt: el.querySelector('img')?.getAttribute('alt'),
        }
      : null
  })
  await page.evaluate(() => {
    const input = document.querySelector('.js-post-filter-search')
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(500)
  return out
}

// --------------------------------------------------- sovereign scroll story probe

const STORY_POSITIONS = 42

function dot(v) {
  return v == null ? null : +Number(v).toFixed(3)
}

async function scrollStory(page) {
  const measure = () =>
    page.evaluate(() => {
      const read = (el) => {
        if (!el) return null
        const cs = getComputedStyle(el)
        const m = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform)
        return {
          o: +Number(cs.opacity).toFixed(3),
          x: +m.m41.toFixed(2),
          y: +m.m42.toFixed(2),
          sx: +m.a.toFixed(3),
          sy: +m.d.toFixed(3),
          w: +el.getBoundingClientRect().width.toFixed(1),
          h: +el.getBoundingClientRect().height.toFixed(1),
          bg: cs.backgroundColor,
          border: cs.borderColor,
        }
      }
      const tags = [...document.querySelectorAll('.js-fig-tag')]
      return {
        fig1: read(document.querySelector('.js-fig-1')),
        fig2: read(document.querySelector('.js-fig-2')),
        fig3: read(document.querySelector('.js-fig-3')),
        title: read(document.querySelector('.js-fig-title')),
        tags: tags.map((t) => ({
          ...read(t),
          text: t.querySelector('.js-fig-tag-text')?.textContent?.trim() ?? '',
          textOpacity: document.querySelector('.js-fig-tag-text') ? +Number(getComputedStyle(t.querySelector('.js-fig-tag-text')).opacity).toFixed(3) : null,
        })),
        dots: [...document.querySelectorAll('.js-dot')].map((d) => read(d)),
        activeSections: [...document.querySelectorAll('.js-scrolling-section')].map((s) => {
          const r = s.getBoundingClientRect()
          return { top: Math.round(r.top), visible: r.bottom > 0 && r.top < innerHeight }
        }),
      }
    })
  const startY = await page.evaluate(() => {
    const el = document.querySelector('mistral-block-scrolling-sovereignty')
    return Math.round(el.getBoundingClientRect().top + scrollY)
  })
  const endY = await page.evaluate(() => {
    const el = document.querySelector('mistral-block-scrolling-sovereignty')
    return Math.round(el.getBoundingClientRect().top + scrollY + el.getBoundingClientRect().height - innerHeight)
  })
  const out = { startY, endY, down: [], up: [] }
  const ys = []
  for (let i = 0; i < STORY_POSITIONS; i++) ys.push(Math.round(startY - 100 + ((endY - startY + 200) * i) / (STORY_POSITIONS - 1)))
  for (const y of ys) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(90)
    out.down.push({ y, state: await measure() })
  }
  for (const y of [...ys].reverse()) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(90)
    out.up.push({ y, state: await measure() })
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  // Amplitude proves the diagram is actually scrubbed, not merely identical
  // because both sites are frozen.
  const range = (vals) => Math.max(...vals) - Math.min(...vals)
  out.amplitude = {
    fig1Scale: +range(out.down.map((p) => p.state.fig1?.sx ?? 1)).toFixed(3),
    fig2Opacity: +range(out.down.map((p) => p.state.fig2?.o ?? 0)).toFixed(3),
    fig3Opacity: +range(out.down.map((p) => p.state.fig3?.o ?? 0)).toFixed(3),
    tagX: +range(out.down.map((p) => p.state.tags[0]?.x ?? 0)).toFixed(1),
    titleY: +range(out.down.map((p) => p.state.title?.y ?? 0)).toFixed(1),
  }
  return out
}

function stripState(s) {
  return JSON.stringify({
    fig1: s.fig1 && [s.fig1.o, s.fig1.sx, s.fig1.border],
    fig2: s.fig2 && [s.fig2.o, s.fig2.sx],
    fig3: s.fig3 && [s.fig3.o, s.fig3.sx],
    title: s.title && [s.title.o, s.title.y, s.title.h],
    tags: s.tags.map((t) => [t.text, t.o, dot(t.x), dot(t.y), t.w, t.h]),
    dots: s.dots.map((d) => d && d.bg),
  })
}

function compareStory(a, b) {
  const diffs = []
  const cmp = (x, y, label, tol = 0.02) => {
    if (typeof x === 'number' && typeof y === 'number') {
      if (Math.abs(x - y) > tol) diffs.push({ label, orig: x, clone: y })
    } else if (typeof x === 'string' && typeof y === 'string') {
      if (x !== y) diffs.push({ label, orig: x, clone: y })
    }
  }
  for (const dir of ['down', 'up']) {
    for (let i = 0; i < Math.max(a[dir].length, b[dir].length); i++) {
      const x = a[dir][i]
      const y = b[dir][i]
      if (!x || !y) {
        diffs.push({ dir, i, reason: 'length' })
        continue
      }
      if (Math.abs(x.y - y.y) > 2) diffs.push({ dir, i, reason: 'scrollY', orig: x.y, clone: y.y })
      const sx = x.state
      const sy = y.state
      for (const k of ['fig1', 'fig2', 'fig3', 'title']) {
        if (!sx[k] || !sy[k]) continue
        cmp(sx[k].o, sy[k].o, `${dir}.${i}.${k}.opacity`)
        cmp(sx[k].sx, sy[k].sx, `${dir}.${i}.${k}.scale`)
        cmp(sx[k].y, sy[k].y, `${dir}.${i}.${k}.y`, 1)
        cmp(sx[k].border, sy[k].border, `${dir}.${i}.${k}.border`)
      }
      for (let t = 0; t < Math.min(sx.tags.length, sy.tags.length); t++) {
        cmp(sx.tags[t].o, sy.tags[t].o, `${dir}.${i}.tag${t}.opacity`)
        cmp(dot(sx.tags[t].x), dot(sy.tags[t].x), `${dir}.${i}.tag${t}.x`, 1)
        cmp(dot(sx.tags[t].y), dot(sy.tags[t].y), `${dir}.${i}.tag${t}.y`, 1)
      }
      cmp(stripState(sx), stripState(sy), `${dir}.${i}.digest`)
    }
  }
  return diffs
}

// ------------------------------------------------------------------ page runner

async function runPage(browser, name, def, opts) {
  const { widths, schemes } = opts
  const OUT = def.out
  const SHOTS = path.join(OUT, 'screenshots')
  await fs.mkdir(SHOTS, { recursive: true })
  const ORIGIN_PAGE = ORIGIN.replace(/\/$/, '') + def.route
  const CLONE_PAGE = CLONE.replace(/\/$/, '') + def.route
  const rec = makeRecorder()
  const { record, results } = rec
  const artifacts = {}
  console.log(`\n=== ${name} (${def.route}) ===`)

  // ------------------------------------------------------------------ matrix
  const matrix = []
  for (const scheme of schemes) {
    for (const width of widths) {
      const dir = path.join(SHOTS, scheme, String(width))
      const o = await openPage(browser, { width, scheme })
      await settle(o.page, ORIGIN_PAGE, scheme)
      await awaitSettledAssets(o.page)
      const oGeom = await landmarks(o.page, def.landmarks)
      const oWeight = await weight(o.page)
      const oAnims = await animationInventory(o.page)
      await fullShot(o.page, path.join(dir, 'orig.png'))
      await o.context.close()

      const c = await openPage(browser, { width, scheme })
      await settle(c.page, CLONE_PAGE, scheme)
      await awaitSettledAssets(c.page)
      const cGeom = await landmarks(c.page, def.landmarks)
      const cWeight = await weight(c.page)
      const cAnims = await animationInventory(c.page)
      await fullShot(c.page, path.join(dir, 'clone.png'))
      await c.context.close()

      const diff = await diffImages(path.join(dir, 'orig.png'), path.join(dir, 'clone.png'))
      record(`${scheme}@${width}`, 'full-page pixel diff < 1%', diff.pct < TOL_PIXEL_DIFF, `${diff.pct.toFixed(3)}% (${diff.origSize} vs ${diff.cloneSize})`)
      // Full-page screenshots include overflowing layers (the scaled footer
      // wordmark), whose composited size can round 1px differently while the
      // document itself is identical — hence the 1px tolerance.
      const heights = [Number(diff.origSize.split('x')[1]), Number(diff.cloneSize.split('x')[1])]
      const heightDelta = Math.abs(heights[0] - heights[1])
      record(
        `${scheme}@${width}`,
        'page height within 1px',
        diff.sizeMatch || heightDelta <= TOL_PX,
        diff.sizeMatch ? 'equal' : `${heights[0]} vs ${heights[1]}px`,
      )
      const geomDiffs = compareLandmarks(def.landmarks, oGeom, cGeom)
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
      record(`${scheme}@${width}`, 'CSS animations match (name/duration/easing)', JSON.stringify(oAnims) === JSON.stringify(cAnims), `${oAnims.length} vs ${cAnims.length}`)
      matrix.push({ scheme, width, diff, geomDiffs: geomDiffs.length, oAnims, cAnims })
      if (diff.pct >= TOL_PIXEL_DIFF) {
        // decode and write a diff image for failures
        await sharp(path.join(dir, 'orig.png')).composite([{ input: path.join(dir, 'clone.png'), blend: 'difference' }]).png().toFile(path.join(dir, 'diff.png')).catch(() => {})
      }
    }
  }
  artifacts.animations = {
    inventory: matrix[0]?.oAnims ?? [],
    cloneInventory: matrix[0]?.cAnims ?? [],
    mechanisms: def.mechanisms,
    matrix: matrix.map((m) => ({ scheme: m.scheme, width: m.width, pixelDiffPct: +m.diff.pct.toFixed(4) })),
  }

  // ------------------------------------------------------------ navbar sweep
  for (const scheme of ['light', 'dark']) {
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
        await page.waitForTimeout(45)
        states.push(
          await page.evaluate(() => {
            const h = document.querySelector('[data-header]')
            const cs = getComputedStyle(h)
            const active = document.querySelector('[data-nav-index="1"]')
            return {
              y: Math.round(scrollY),
              h: +h.getBoundingClientRect().height.toFixed(2),
              bg: cs.backgroundColor,
              color: cs.color,
              border: cs.borderBottomColor,
              activeBg: active ? getComputedStyle(active).backgroundColor : null,
              activeCls: active ? active.classList.contains('bg-surface-brand-primary') : null,
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
    record(`navbar@${scheme}`, `25px scroll sweep (${a.length} samples)`, diffs.length === 0, diffs.length ? JSON.stringify(diffs.slice(0, 4)) : 'all sampled states matched')
  }

  // ----------------------------------------------------------- motion parity
  const motionProbe = async (url) => {
    const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
    await settle(page, url, 'light')
    const regions = {}
    for (const [label, sel] of def.motion) regions[label] = await isMoving(page, sel)
    const anims = await animationInventory(page)
    await context.close()
    return { regions, anims }
  }
  const motionA = await motionProbe(ORIGIN_PAGE)
  const motionB = await motionProbe(CLONE_PAGE)
  for (const [label] of def.motion) {
    const ra = motionA.regions[label]
    const rb = motionB.regions[label]
    record(
      'motion',
      `${label} moves identically`,
      ra?.moving === rb?.moving && JSON.stringify(ra?.anims) === JSON.stringify(rb?.anims),
      `moving ${ra?.moving}/${rb?.moving} · Δpixels ${ra?.pct}%/${rb?.pct}% · animations ${JSON.stringify(rb?.anims)}`,
    )
  }
  record('motion', 'animation inventory identical', JSON.stringify(motionA.anims) === JSON.stringify(motionB.anims), `${motionA.anims.length} vs ${motionB.anims.length} running animations`)
  artifacts.motion = { orig: motionA, clone: motionB }

  // ----------------------------------------------------------- interactions
  const interactions = async (url) => {
    const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
    await settle(page, url, 'light')
    try {
      return await def.interactions(page)
    } finally {
      await context.close()
    }
  }
  const ia = await interactions(ORIGIN_PAGE)
  const ib = await interactions(CLONE_PAGE)
  if (name === 'use-cases') {
    const compare = (label, x, y) => record('filter', label, JSON.stringify(x) === JSON.stringify(y), JSON.stringify(x) === JSON.stringify(y) ? summarizePosts(y) : `orig ${JSON.stringify(x).slice(0, 220)} | clone ${JSON.stringify(y).slice(0, 220)}`)
    compare('initial list + counter', ia.initial, ib.initial)
    for (const slug of FILTER_SLUGS) compare(`industry/capability “${slug}”`, ia.singles[slug], ib.singles[slug])
    for (const combo of FILTER_COMBOS) compare(`combo “${combo.join('+')}”`, ia.combos[combo.join('+')], ib.combos[combo.join('+')])
    compare('clear all restores initial', ia.cleared, ib.cleared)
    for (const k of Object.keys(ia.pagination)) compare(`pagination ${k}`, ia.pagination[k], ib.pagination[k])
    compare('search hit', ia.search.hit, ib.search.hit)
    compare('search empty state', ia.search.empty, ib.search.empty)
    compare('empty state markup', ia.search.emptyMarkup, ib.search.emptyMarkup)
    record('filter', 'filter change resets page + scrolls to list top', JSON.stringify(ia.scroll) === JSON.stringify(ib.scroll), `orig ${JSON.stringify(ia.scroll)} · clone ${JSON.stringify(ib.scroll)}`)
    record('filter', 'pagination resets on filter change', JSON.stringify(ia.pagination.afterFilter) === JSON.stringify(ib.pagination.afterFilter), summarizePosts(ib.pagination.afterFilter))
    artifacts.filters = { orig: ia, clone: ib }
  } else if (name === 'sovereign-ai') {
    const diffs = compareStory(ia, ib)
    record(
      'scroll-story',
      `${STORY_POSITIONS * 2} scroll positions (down + up)`,
      diffs.length === 0,
      diffs.length ? JSON.stringify(diffs.slice(0, 5)) : `all ${STORY_POSITIONS * 2} sampled states matched within 2px / 0.02`,
    )
    // reversibility inside each site: the same scrollY must produce the same state
    const rev = (story) => {
      let worst = 0
      for (const d of story.down) {
        const u = story.up.find((x) => x.y === d.y)
        if (!u) continue
        const a = d.state
        const b = u.state
        for (const k of ['fig1', 'fig2', 'fig3', 'title']) {
          if (!a[k] || !b[k]) continue
          worst = Math.max(worst, Math.abs(a[k].o - b[k].o), Math.abs(a[k].sx - b[k].sx))
        }
      }
      return +worst.toFixed(3)
    }
    record('scroll-story', 'reversible when scrolling back up', rev(ia) <= 0.02 && rev(ib) <= 0.02, `worst Δ orig ${rev(ia)} · clone ${rev(ib)}`)
    const amp = (s) => s.amplitude
    const ampSame = ['fig1Scale', 'fig2Opacity', 'fig3Opacity', 'tagX', 'titleY'].every(
      (k) => Math.abs(amp(ia)[k] - amp(ib)[k]) <= (k === 'tagX' || k === 'titleY' ? 2 : 0.02),
    )
    record(
      'scroll-story',
      'diagram is scroll-driven, not static',
      amp(ib).fig1Scale > 0.1 && amp(ib).tagX > 10 && ampSame,
      `clone ${JSON.stringify(amp(ib))} · orig ${JSON.stringify(amp(ia))}`,
    )
    artifacts.scrollStory = { orig: ia, clone: ib }
    // layers + scroll spy + anchors
    const layerState = (page) =>
      page.evaluate(() => ({
        layers: [...document.querySelectorAll('mistral-block-slideshow-media-feature mistral-atom-spoiler')].map((s) => s.dataset.open ?? null),
        media: [...document.querySelectorAll('mistral-block-slideshow-media-feature .js-media')].map((m) => m.dataset.active ?? null),
        summary: [...document.querySelectorAll('mistral-atom-navigation-summary [data-id], mistral-atom-navigation-summary a')].map((a) => ({
          active: a.dataset.active ?? null,
          text: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
        })),
        hash: location.hash,
        y: Math.round(scrollY),
      }))
    for (let i = 0; i < 4; i++) {
      const click = async (url) => {
        const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
        await settle(page, url, 'light')
        await page.evaluate((idx) => {
          const s = document.querySelectorAll('mistral-block-slideshow-media-feature mistral-atom-spoiler')[idx]
          s?.scrollIntoView({ block: 'center' })
          s?.querySelector('.js-spoiler-trigger')?.click()
        }, i)
        await page.waitForTimeout(900)
        const state = await layerState(page)
        await context.close()
        return state
      }
      const a = await click(ORIGIN_PAGE)
      const b = await click(CLONE_PAGE)
      record('layers', `layer ${i + 1} switch`, JSON.stringify(a.layers) === JSON.stringify(b.layers) && JSON.stringify(a.media) === JSON.stringify(b.media), `${JSON.stringify(b.layers)} · media ${JSON.stringify(b.media)}`)
    }
    // path anchors: click each summary link, compare landing offset + hash + active state
    const anchorRun = async (url, width = 1440) => {
      const { context, page } = await openPage(browser, { width, scheme: 'light' })
      await settle(page, url, 'light')
      const ids = await page.evaluate(() =>
        [...document.querySelectorAll('mistral-atom-navigation-summary a.js-anchor')].map((a) => a.dataset.id),
      )
      const out = { ids, landings: [], mobile: null }
      for (const id of ids) {
        await page.evaluate((hash) => {
          const link = document.querySelector(`mistral-atom-navigation-summary a.js-anchor[data-id="${hash}"]`)
          link ? link.click() : (location.hash = hash)
        }, id)
        await page.waitForTimeout(2000)
        out.landings.push(
          await page.evaluate((hash) => {
            const el = document.getElementById(hash)
            const r = el?.getBoundingClientRect()
            return {
              hash: location.hash,
              top: r ? Math.round(r.top) : null,
              active: [...document.querySelectorAll('mistral-atom-navigation-summary a.js-anchor[data-active="true"]')].map(
                (a) => a.dataset.id,
              ),
              triggerLabel: document.querySelector('mistral-atom-navigation-summary .js-trigger-label')?.textContent?.trim(),
            }
          }, id),
        )
      }
      if (width === 390) {
        out.mobile = await page.evaluate(async () => {
          const summary = document.querySelector('mistral-atom-navigation-summary')
          const trigger = summary?.querySelector('.js-spoiler-trigger')
          const before = summary?.querySelector('mistral-atom-spoiler')?.dataset.open
          trigger?.click()
          await new Promise((r) => setTimeout(r, 700))
          const open = summary?.querySelector('mistral-atom-spoiler')?.dataset.open
          const second = [...(summary?.querySelectorAll('a.js-anchor') ?? [])][1]
          second?.click()
          await new Promise((r) => setTimeout(r, 1100))
          return {
            before,
            open,
            after: summary?.querySelector('mistral-atom-spoiler')?.dataset.open,
            label: summary?.querySelector('.js-trigger-label')?.textContent?.trim(),
            hash: location.hash,
          }
        })
      }
      await context.close()
      return out
    }
    const aa = await anchorRun(ORIGIN_PAGE)
    const ab = await anchorRun(CLONE_PAGE)
    record('path', 'anchor ids + landings + scroll-spy', JSON.stringify(aa) === JSON.stringify(ab), JSON.stringify(ab).slice(0, 260))
    const ma = await anchorRun(ORIGIN_PAGE, 390)
    const mb = await anchorRun(CLONE_PAGE, 390)
    record('path', 'mobile summary dropdown', JSON.stringify(ma) === JSON.stringify(mb), JSON.stringify(mb.mobile))
    artifacts.anchors = { orig: aa, clone: ab, mobile: { orig: ma.mobile, clone: mb.mobile } }
  } else {
    const same = JSON.stringify(ia) === JSON.stringify(ib)
    record('interaction', 'controls behave identically', same, same ? JSON.stringify(ia).slice(0, 150) : `orig ${JSON.stringify(ia).slice(0, 220)} | clone ${JSON.stringify(ib).slice(0, 220)}`)
    artifacts.interactions = { orig: ia, clone: ib }
  }

  // --------------------------------------------------------------- copy parity
  const copyRun = async (url) => {
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
        mainText: text(document.querySelector('main')),
        footerText: text(document.querySelector('footer')),
        links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
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
  const ca = await copyRun(ORIGIN_PAGE)
  const cb = await copyRun(CLONE_PAGE)
  record('content', 'every text node matches', JSON.stringify(ca.mainText) === JSON.stringify(cb.mainText), `${ca.mainText.length} vs ${cb.mainText.length} text nodes`)
  record('content', 'footer text matches', JSON.stringify(ca.footerText) === JSON.stringify(cb.footerText), `${ca.footerText.length} nodes`)
  const al = ca.links.map(normLink)
  const bl = cb.links.map(normLink)
  const linkDiff =
    al.length !== bl.length
      ? `count ${al.length} vs ${bl.length}`
      : al.map((x, i) => (x === bl[i] ? null : `${i}: ${x} ≠ ${bl[i]}`)).filter(Boolean).slice(0, 4)
  record('content', 'link targets match', al.length === bl.length && al.every((x, i) => x === bl[i]), JSON.stringify(linkDiff))
  record('content', 'image sources/alt match', JSON.stringify(ca.imgs) === JSON.stringify(cb.imgs), `${ca.imgs.length} vs ${cb.imgs.length} images`)

  // ------------------------------------------------------------------ meta
  const metaRun = async (url) => {
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
  const ma = await metaRun(ORIGIN_PAGE)
  const mb = await metaRun(CLONE_PAGE)
  record('meta', 'title', ma.title === mb.title, mb.title)
  record('meta', 'canonical + hreflang', JSON.stringify(ma.links) === JSON.stringify(mb.links), JSON.stringify(mb.links))
  record('meta', 'structured data', JSON.stringify(ma.jsonld) === JSON.stringify(mb.jsonld), mb.jsonld.join(' ').slice(0, 80))
  record('meta', 'single h1 + lang', JSON.stringify(ma.h1) === JSON.stringify(mb.h1) && ma.lang === mb.lang, `${mb.h1.join(' | ')} · ${mb.lang}`)
  const aMeta = ma.metas.filter((m) => /^(description|og:|twitter:|viewport)/.test(m))
  const bMeta = mb.metas.filter((m) => /^(description|og:|twitter:|viewport)/.test(m))
  record('meta', 'description / og / twitter / viewport', JSON.stringify(aMeta) === JSON.stringify(bMeta), JSON.stringify(bMeta).slice(0, 160))
  record('architecture', 'islands (count/framework)', ma.islands === mb.islands, `orig ${ma.islands}, clone ${mb.islands}`)

  // ------------------------------------------------------- no-JS server markup
  const nojsRun = async (url) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(600)
    const info = await page.evaluate(() => ({
      text: document.querySelector('main').innerText.replace(/\s+/g, ' ').trim().slice(0, 4000),
      headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
      nodes: document.querySelectorAll('main *').length,
      h1: document.querySelectorAll('h1').length,
    }))
    await context.close()
    return info
  }
  const na = await nojsRun(ORIGIN_PAGE)
  const nb = await nojsRun(CLONE_PAGE)
  record('architecture', 'no-JS markup + styled state', JSON.stringify(na) === JSON.stringify(nb), `nodes=${nb.nodes} h1=${nb.h1} header=${nb.headerBg}`)

  // ------------------------------------------------------------ transitions
  const TOUR = ['/', '/sovereign-ai/', '/products/', '/our-method/', '/use-cases/', '/research/', '/']
  const tourRun = async (startUrl) => {
    const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
    await settle(page, startUrl, 'light')
    const snapshot = () =>
      page.evaluate(() => ({
        path: location.pathname,
        headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
        active: document.querySelector('[data-nav-index="1"]')?.classList.contains('bg-surface-brand-primary') ?? null,
        h1: document.querySelector('h1')?.textContent?.trim() ?? null,
        animations: document.getAnimations().length,
        mainNodes: document.querySelectorAll('main *').length,
      }))
    const steps = []
    for (const target of TOUR) {
      await page.evaluate((t) => {
        const link = [...document.querySelectorAll('a[href]')].find((a) => {
          try {
            return new URL(a.href, location.href).pathname === t
          } catch {
            return false
          }
        })
        link?.click()
      }, target)
      await page.waitForTimeout(2600)
      steps.push(await snapshot())
    }
    const back = []
    for (let i = 0; i < 3; i++) {
      await page.goBack({ waitUntil: 'load' }).catch(() => {})
      await page.waitForTimeout(2200)
      back.push(await snapshot())
    }
    // after the tour every cloned section still runs
    await page.evaluate(() => {
      const link = [...document.querySelectorAll('a[href]')].find((a) => new URL(a.href, location.href).pathname === '/use-cases/')
      link?.click()
    })
    await page.waitForTimeout(2600)
    const alive = await page.evaluate(async () => {
      const before = document.querySelector('.js-post-filter-count')?.textContent?.trim()
      document.querySelector('mistral-atom-input-tag-filter[data-slug="search"] label')?.click()
      await new Promise((r) => setTimeout(r, 600))
      return {
        path: location.pathname,
        before,
        after: document.querySelector('.js-post-filter-count')?.textContent?.trim(),
        listenersWork: before !== null,
        headerBg: getComputedStyle(document.querySelector('[data-header]')).backgroundColor,
      }
    })
    await context.close()
    return { steps, back, alive }
  }
  const ta = await tourRun(ORIGIN_PAGE)
  const tb = await tourRun(CLONE_PAGE)
  const stepDiff = ta.steps
    .map((s, i) => (JSON.stringify(s) === JSON.stringify(tb.steps[i]) ? null : { i, orig: s, clone: tb.steps[i] }))
    .filter(Boolean)
  record('transitions', 'tour across all cloned routes', stepDiff.length === 0, stepDiff.length ? JSON.stringify(stepDiff.slice(0, 3)) : JSON.stringify(tb.steps.map((s) => `${s.path}:${s.active}`)))
  record('transitions', 'browser back restores previous pages', JSON.stringify(ta.back) === JSON.stringify(tb.back), JSON.stringify(tb.back.map((s) => s.path)))
  record('transitions', 'after the tour a filter still works', JSON.stringify(ta.alive) === JSON.stringify(tb.alive), JSON.stringify(tb.alive))
  artifacts.transitions = { orig: ta, clone: tb }

  // --------------------------------------------------------------- quality
  for (const scheme of schemes) {
    const qualityRun = async (url) => {
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
      return {
        // The original embeds a Storylane demo iframe which logs its own vendor
        // deprecation warning on both sites; it is not produced by this clone.
        errors: errors.filter((e) => !/404|favicon|storylane\.io/i.test(e)),
        cls,
        theme,
      }
    }
    const qa = await qualityRun(ORIGIN_PAGE)
    const qb = await qualityRun(CLONE_PAGE)
    record('quality', `no console errors (${scheme})`, qb.errors.length === 0, `${qb.errors.length} (orig ${qa.errors.length}) ${qb.errors.slice(0, 2).join(' | ')}`)
    // Some original pages ship a layout shift of their own (Vibe's hero and the
    // industry cover images do); for those the requirement is that the clone
    // does not add shift on top of the original. A lower score is not a
    // deviation — the resources arrive at different times (localhost vs CDN),
    // so the reveal lands at a different point in the load.
    record(
      'quality',
      `CLS ≤ 0.05 or no worse than original (${scheme})`,
      qb.cls <= 0.05 || qb.cls <= qa.cls + 0.01,
      `${qb.cls.toFixed(4)} (orig ${qa.cls.toFixed(4)})`,
    )
    record(
      'quality',
      `theme resolves identically (${scheme})`,
      qa.theme.cls === qb.theme.cls && qa.theme.headerBg === qb.theme.headerBg,
      `orig "${qa.theme.cls}" ${qa.theme.headerBg} · clone "${qb.theme.cls}" ${qb.theme.headerBg}`,
    )
  }
  const rmRun = async (url) => {
    const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(url, { waitUntil: 'load', timeout: 90000 })
    await page.waitForTimeout(2500)
    const r = await page.evaluate(() => {
      const title = document.querySelector('.js-title')
      return {
        h: document.documentElement.scrollHeight,
        titleOpacity: title ? getComputedStyle(title).opacity : null,
      }
    })
    await context.close()
    return r
  }
  const ra = await rmRun(ORIGIN_PAGE)
  const rb = await rmRun(CLONE_PAGE)
  record('quality', 'prefers-reduced-motion parity', ra.h === rb.h && ra.titleOpacity === rb.titleOpacity, `height ${ra.h} vs ${rb.h}, title opacity ${ra.titleOpacity} vs ${rb.titleOpacity}`)

  // --------------------------------------------------- shared chrome behaviour
  // The header and footer are the same components on every route, so each page
  // exercises them: mega menu, language selector, theme toggle, footer cat, and
  // the mobile drawer at 390px.
  const chromeRun = async (url) => {
    const out = { mega: null, lang: null, theme: null, cat: null, mobile: null }
    const { context, page } = await openPage(browser, { width: 1440, scheme: 'light' })
    await settle(page, url, 'light')
    const nav = await page.$('[data-nav-index="1"]')
    if (nav) {
      await nav.hover()
      await page.waitForTimeout(700)
      out.mega = await page.evaluate(() => {
        const dd = document.querySelector('#nav-dropdown')
        const visible = [...dd.querySelectorAll('[data-dropdown-index]')].filter(
          (i) => i.getBoundingClientRect().height > 0,
        )
        return {
          h: +dd.getBoundingClientRect().height.toFixed(1),
          items: visible.length,
          rows: dd.querySelectorAll('a').length,
        }
      })
      await page.mouse.move(2, 600)
      await page.waitForTimeout(900)
      out.mega.closedH = await page.evaluate(() => +document.querySelector('#nav-dropdown').getBoundingClientRect().height.toFixed(1))
    }
    out.lang = await page.evaluate(async () => {
      const btn = [...document.querySelectorAll('footer button, [data-header] button')].find((b) =>
        /change language/i.test(b.getAttribute('aria-label') ?? ''),
      )
      btn?.click()
      await new Promise((r) => setTimeout(r, 500))
      const opts = [...document.querySelectorAll('.js-option')]
      return { found: !!btn, count: opts.length, visible: opts.filter((o) => o.getBoundingClientRect().height > 0).length }
    })
    out.theme = await page.evaluate(async () => {
      const before = getComputedStyle(document.querySelector('[data-header]')).backgroundColor
      const btn = document.querySelector('mistral-atom-button-darkmode [data-theme="dark"]')
      btn?.click()
      await new Promise((r) => setTimeout(r, 600))
      const after = getComputedStyle(document.querySelector('[data-header]')).backgroundColor
      const dark = document.documentElement.classList.contains('dark')
      document.querySelector('mistral-atom-button-darkmode [data-theme="light"]')?.click()
      await new Promise((r) => setTimeout(r, 500))
      return { found: !!btn, dark, changed: before !== after, stored: localStorage.getItem('theme') }
    })
    out.cat = await page.evaluate(async () => {
      const img = document.querySelector('img[src*="cat-sitting"]')
      if (!img) return { found: false }
      img.scrollIntoView({ block: 'center' })
      await new Promise((r) => setTimeout(r, 600))
      const r = img.getBoundingClientRect()
      const src = img.getAttribute('src')
      // sample two frames of the GIF via the natural size (GIFs animate themselves)
      return { found: true, src: src.replace(/\?dpl=[a-f0-9]+/g, ''), w: img.naturalWidth, h: img.naturalHeight, rw: Math.round(r.width), rh: Math.round(r.height) }
    })
    await context.close()

    const m = await openPage(browser, { width: 390, scheme: 'light' })
    await settle(m.page, url, 'light')
    await m.page.evaluate(() => document.querySelector('#mobile-menu-button')?.click())
    await m.page.waitForTimeout(800)
    const opened = await m.page.evaluate(() => ({
      expanded: document.querySelector('#mobile-menu-button')?.getAttribute('aria-expanded'),
      panelX: Math.round(document.querySelector('#mobile-nav-panel')?.getBoundingClientRect().x ?? -1),
      label: document.querySelector('#mobile-cta-label')?.textContent?.trim(),
      bodyOverflow: getComputedStyle(document.body).overflow,
    }))
    await m.page.evaluate(() => document.querySelector('[data-mobile-nav-index="1"]')?.click())
    await m.page.waitForTimeout(800)
    const sub = await m.page.evaluate(() => ({
      subX: Math.round(document.querySelector('#mobile-subpanel-1')?.getBoundingClientRect().x ?? -1),
      links: [...document.querySelectorAll('#mobile-subpanel-1 a')].map((a) => new URL(a.href, location.href).pathname),
    }))
    await m.page.evaluate(() => document.querySelector('#mobile-menu-button')?.click())
    await m.page.waitForTimeout(800)
    const closed = await m.page.evaluate(() => ({
      expanded: document.querySelector('#mobile-menu-button')?.getAttribute('aria-expanded'),
      panelX: Math.round(document.querySelector('#mobile-nav-panel')?.getBoundingClientRect().x ?? -1),
    }))
    out.mobile = { opened, sub, closed }
    await m.context.close()
    return out
  }
  const cha = await chromeRun(ORIGIN_PAGE)
  const chb = await chromeRun(CLONE_PAGE)
  for (const key of ['mega', 'lang', 'theme', 'cat', 'mobile']) {
    record(
      'chrome',
      `${key} behaves identically`,
      JSON.stringify(cha[key]) === JSON.stringify(chb[key]),
      JSON.stringify(chb[key]).slice(0, 220),
    )
  }
  artifacts.chrome = { orig: cha, clone: chb }

  // ----------------------------------------------------------------- report
  const groups = [...new Set(results.map((r) => r.group))]
  const lines = [
    `# ${def.route} verification report`,
    '',
    `Generated ${new Date().toISOString()} by \`pnpm verify --page ${name}\` (Playwright + Chromium ${browser.version()}).`,
    '',
    `- original: ${ORIGIN_PAGE}`,
    `- clone: ${CLONE_PAGE}`,
    `- widths: ${widths.join(', ')} · color schemes: ${schemes.join(', ')}`,
    `- pixel tolerance: < ${TOL_PIXEL_DIFF}% of pixels differing by more than 16/255 per channel`,
    `- geometry tolerance: ${TOL_PX}px`,
    '',
    `**${results.length - rec.failures}/${results.length} checks passed.**`,
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
    '- The clone reuses the original server markup and the original client runtime; differences would only come from content, assets or routing.',
    name === 'use-cases'
      ? '- Filter matrix: all 18 single chips, 14 within-group and cross-group combinations, pagination 1↔2, filter change while on page 2, search hit and empty state, compared on ordered titles/hrefs, count text, page state and URL.'
      : name === 'sovereign-ai'
        ? `- Scroll story: ${STORY_POSITIONS} scroll positions downward and the same ${STORY_POSITIONS} upward, comparing position/opacity/scale/width/height of every diagram node, tag and dot; layers and path anchors clicked in sequence.`
        : name.startsWith('use-cases/')
          ? '- Detail template: hero, sticky summary card, Challenge/Solution/Result grid and the optional related-use-case slider are measured; the back/CTA hover state is operated on both sites.'
          : '- Every interactive control on the page is operated with synthetic input on both sites and the resulting DOM state compared.',
    '- Copy parity walks every text node of main and footer and every link/image target.',
    '- View transitions: a full tour across all six cloned routes plus three browser-back steps, then a control check on /use-cases/.',
    '',
  )
  await fs.writeFile(path.join(OUT, 'verification-report.md'), lines.join('\n'))
  await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify({ generated: new Date().toISOString(), widths, schemes, results }, null, 2))
  await fs.writeFile(path.join(OUT, 'animations.json'), JSON.stringify(artifacts.animations, null, 2))
  await fs.writeFile(path.join(OUT, 'animations.md'), animationsMarkdown(name, def, artifacts.animations))
  if (artifacts.filters) await fs.writeFile(path.join(OUT, 'filter-matrix.json'), JSON.stringify(artifacts.filters, null, 2))
  if (artifacts.scrollStory) await fs.writeFile(path.join(OUT, 'scroll-story.json'), JSON.stringify(artifacts.scrollStory, null, 2))
  if (artifacts.transitions) {
    await fs.writeFile(path.join(OUT, 'view-transitions.json'), JSON.stringify(artifacts.transitions, null, 2))
    await fs.writeFile(path.join(OUT, 'view-transitions.md'), transitionsMarkdown(artifacts.transitions))
  }
  return { results, failures: rec.failures, artifacts }
}

function summarizePosts(s) {
  return `${s.count} · ${s.results} rows · pages=${JSON.stringify(s.pages?.map((p) => `${p.page}:${p.active}/${p.visible}`))} · query="${s.query}"`
}

function animationsMarkdown(name, def, data) {
  const rows = data.inventory
    .map((a) => `| \`${a.name}\` | ${a.duration ?? '—'} | ${a.easing ?? '—'} | ${a.delay ?? '—'} | ${a.iterations ?? '—'} |`)
    .join('\n')
  return `# ${def.route} animation inventory

Generated ${new Date().toISOString()} by \`pnpm verify --page ${name}\`.

Running \`document.getAnimations()\` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
${rows || '| — | — | — | — | — |'}

## Mechanisms

${def.mechanisms.map((m) => `### ${m.name}\n\n${m.evidence}\n`).join('\n')}

## Measured motion regions

${Object.entries(data.motion?.clone?.regions ?? {})
  .map(([region, v]) => `- **${region}**: moving=${v?.moving}, frame delta ${v?.pct}%, running animations ${JSON.stringify(v?.anims ?? [])}`)
  .join('\n')}

## Pixel parity per width

${data.matrix.map((m) => `- ${m.scheme}@${m.width}: ${m.pixelDiffPct}%`).join('\n')}
`
}

function transitionsMarkdown(t) {
  return `# View transitions

Generated ${new Date().toISOString()}.

Tour: \`/ → /sovereign-ai/ → /products/ → /our-method/ → /use-cases/ → /research/ → /\`, then three browser-back steps, then a control check on \`/use-cases/\`.

| step | path | header bg | nav active | h1 |
| --- | --- | --- | --- | --- |
${t.clone.steps.map((s) => `| tour | ${s.path} | ${s.headerBg} | ${s.active} | ${s.h1} |`).join('\n')}
${t.clone.back.map((s) => `| back | ${s.path} | ${s.headerBg} | ${s.active} | ${s.h1} |`).join('\n')}

After the tour: ${JSON.stringify(t.clone.alive)}

Original and clone states are compared with \`JSON.stringify\` equality by the harness (\`transitions\` group in verification-report.md).
`
}

// ----------------------------------------------------------------------- main

const argv = process.argv.slice(2)
const quick = argv.includes('--quick')
const pageArg = argv.includes('--page') ? argv[argv.indexOf('--page') + 1] : null
const all = argv.includes('--all') || pageArg === 'all'
const names = all ? Object.keys(DEFINITIONS) : [pageArg]
if (!names[0] || !DEFINITIONS[names[0]]) {
  console.error(
    'usage: pnpm verify --page products|our-method|use-cases|sovereign-ai|products/vibe|products/studio|products/forge|cloud/inference|cloud/compute|customers|customers/<slug>|industry|industry/<vertical>|use-cases/<slug>|all',
  )
  process.exit(2)
}

const widths = quick ? [1440] : WIDTHS
const schemes = quick ? ['light'] : SCHEMES

const server = await startServer()
const browser = await launch()
let total = 0
let failed = 0
for (const name of names) {
  const { results, failures } = await runPage(browser, name, DEFINITIONS[name], { widths, schemes })
  total += results.length
  failed += failures
}
await browser.close()
if (server) server.kill()
console.log(`\n${total - failed}/${total} checks passed across ${names.join(', ')}`)
process.exit(failed === 0 ? 0 : 1)
