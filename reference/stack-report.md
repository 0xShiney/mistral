# Stack report — mistral.ai (homepage)

Recon performed by fetching the server-rendered HTML, both stylesheets, every referenced JS module
(recursively, including the lazily imported component chunks) and by measuring the live page in
Chromium with Playwright. Raw captures live in `reference/` (`original.html`, `orig/`, `assets/`).

Captured: 2026-11-25.

## 1. Delivery

| signal | value |
| --- | --- |
| HTML | 303,952 bytes, fully server-rendered (all sections, text, links and images present without JS) |
| Hosting header | `cache-status: "Netlify Edge"; hit` → Netlify Edge Functions/CDN |
| CSP | `script-src 'self' 'unsafe-eval' 'unsafe-inline'` + GTM/Axeptio/HubSpot/Contentsquare/Claydar/Cloudflare Turnstile |
| Framework | Astro, static output. `<meta name="astro-view-transitions-enabled" content="true">`, `<meta name="astro-view-transitions-fallback" content="animate">`, `<html data-astro-transition-scope="astro-v2o6jcai-1">`, Astro `ClientRouter` module in `<head>`. These APIs (`ClientRouter`, `astro:page-load`, `astro:before-swap`) are Astro 5. |
| Islands | **0** `<astro-island>` elements. No React/Preact/Svelte/Vue/Solid runtime is shipped. |
| Interactivity | one Astro-hoisted entry module (`layout.astro…js`, 29.5 kB) that defines custom elements and lazily `import()`s one chunk per component type. |
| CSS | 2 stylesheets: `astro.Bi199NJX.css` 238,545 B + `_..DNmhDKbx.css` 17,343 B (37.5 kB gzip total). Tailwind v4 style utilities (`bg-surface-brand-primary`, `text-body-base`, `group-data-[open="true"]:…`) plus `@theme`-like CSS custom properties and `[data-astro-cid-…]` scoped rules. |
| JS | 9 eagerly loaded chunks (196.8 kB raw) + 11 lazy component chunks + ~23 shared lazy chunks, 106.8 kB gzip transferred on the homepage at 1024px+. |
| Fonts | `/fonts/alt-mistral/ALTMistral-{Regular,Medium,Semibold}{,Italic}.woff2|woff`, `/fonts/inter/Inter-VariableFont.woff2` (variable 100–900), `/fonts/dm-mono/*`, `/fonts/space-mono/*`. |
| Media | CMS API at `/cms-media/api/media/file/<name>` (SVG logos, GIFs) and Astro-transformed WebP under `/_astro/<hash>.webp` with `srcset` 400/768/1280/1920 and `onload="this.style.opacity='1'"` fade-in. |
| Analytics / consent | Google Tag Manager (idle-loaded), Axeptio consent SDK, HubSpot, Contentsquare, Netlify RUM — intentionally **not** reproduced. |

## 2. Libraries detected in the JS graph

| library | chunk | used by |
| --- | --- | --- |
| GSAP + ScrollTrigger + SplitText | `ScrollTrigger.el9mRxnR.js` 42,711 B, `gsap.BZ_pcBaV.js`, `SplitText.BOzMVKL-.js` | hero title intro, footer wordmark scrub + cat wink, nav dropdown height morph, mobile menu, slideshows/progress bars |
| Matter.js | `matter.Bi2WGu6X.js` / `matter.Di4myJd4.js` | the "No one else should hold the strings…" tag cloud (rigid bodies + pointer constraint) |
| Swiper | `swiper.BEizE-mQ.js`, `slider.CmLRuZco.js` | logo marquee / card sliders |
| Lottie | referenced by `richmedia-lottie.DRsUfrdJ.js` (lazy, not used on this page) | — |

No three.js/WebGL, no Lenis, no Motion/Framer, no smooth-scroll hijacking (native scrolling).

## 3. Document

- `<html lang="en">`, `<title>Mistral | #1 in Sovereign AI: Frontier Open Models You Own</title>`.
- Font preload for `ALTMistral-Medium.woff2`; canonical + hreflang `en`/`fr`/`it`/`x-default`; OG/Twitter cards; JSON-LD `Organization` + `WebSite`; RSS alternate; `/sitemap-index.xml`.
- Skip link `<a href="#main">Skip to content</a>`; `<main id="main" data-taxi tabindex="-1">` with `<div id="page-path" data-taxi-view>`.
- Theme bootstrapped by an inline script from `localStorage.theme` (`dark` / `light` / `system`) → `.dark` class on `<html>`, re-applied on `astro:before-swap`.
- 10 top-level children of `#page-path`: hero, vibe bar, logo slider, strings section, 3 × editorial headline, 3 content sections (feature accordion, customers slideshow, cards).

## 4. What the clone does with that

| concern | decision | proof |
| --- | --- | --- |
| Framework | Astro 5 (`5.18.2`) + TypeScript, `output: 'static'`, pnpm | same generator/`ClientRouter` semantics the original ships |
| Islands | none — zero `<astro-island>`, zero framework runtime | harness records `islands: 0` on both sites |
| Interactivity | the original's own client runtime, self-hosted under `public/js/` with the original chunk graph and lazy `import()` map | identical custom-element set, identical lazy chunks, JS weight 106.8 kB → 109.7 kB (−15% budget respected) |
| Styling | the original's compiled stylesheet, served unchanged (`src/styles/base.css`, `page.css`), imported globally instead of per-component scoping | CSS weight 37.5 kB → 39.9 kB; all computed styles match within 1px |
| Markup | server HTML copied verbatim per section, split into balanced `.astro` components; `data-astro-cid-*` attributes preserved so the original's scoped rules still match | geometry of 21 landmarks matches at all 6 widths in both schemes |
| Media | all assets downloaded into `public/` on their original paths (`/cms-media/…`, `/images/…`, `/media/…`, `/fonts/…`); GIFs left untouched | GIF bytes identical, animation preserved |
| Analytics | removed (GTM, Axeptio, HubSpot, Contentsquare, Netlify RUM) | no third-party requests; console clean |

Deviation: the Astro asset pipeline hashes WebP output under `/_astro/`, which collides with Astro's
own build directory, so transformed WebP files are served from `/media/` with the original hashed
filenames. Everything else keeps the original path.

---

# Stack report — `/research/` (route recon)

Captured 2026-11-25 from `https://mistral.ai/research/` (raw capture: `reference/original-research.html`).

| signal | value |
| --- | --- |
| HTML | 539,396 bytes, fully server-rendered |
| Stylesheets | the **same two files** as the homepage (`astro.Bi199NJX.css` 238,545 B, `_..DNmhDKbx.css` 17,343 B — byte-identical md5 to `src/styles/base.css` / `page.css`) |
| JS | the **same single entry** as the homepage (`layout.astro…RiVFrrwj.js`) plus lazily imported component chunks; no route-specific bundle |
| Islands | **0** `<astro-island>` |
| Custom elements on the route | `mistral-block-hero-research`, `mistral-atom-text-hero-title`, `mistral-section-models-dock`, `mistral-section-editorial-headline` ×5, `mistral-section-posts`, `mistral-atom-input-tag-filter` ×9, `mistral-section-cards-service` ×2, `mistral-block-tabs`, `mistral-atom-navigation-dots`, `mistral-atom-progressbar`, `mistral-atom-button-link-action`, `global-navigation`, `global-footer`, `global-language-switcher`, `mistral-atom-button-darkmode` |
| Lazy chunks used by this route | `hero-research`, `text-hero-title`, `models-dock`, `posts`, `input-tag-filter` (+ `url` helper), `editorial-headline`, `cards-service`, `navigation-dots`, `progressbar`, `dropdown`, `SplitText`, `ScrollTrigger`, `gsap` — all already self-hosted in `public/js/` |
| Transferred weight (measured, 1440 px light) | JS 103.3 kB (original) / 105.6–106.0 kB (clone) · CSS 37.5 kB / 40.1 kB — inside ±15 % |
| Libraries not seen on the homepage | **none** — no list-animation library (no Motion/Framer/GSAP-Flip), no new vendor bundle. The list filtering is hand-written in `posts.*.js` (`display:none` toggling) |
| Content | 21 publications (`data-title` / `data-description` / `data-categories` on each row), 12 model cards in 2 tab panels (4 + 8), 6 research areas, 7 “Inside the work” cards, 2 build cards |
| DOM duplication | hero h1 appears twice (accessible + visual `p.js-title`), only one real `<h1>`; desktop/mobile nav duplicated as on the homepage |

## What the clone does with that

- Reuses the homepage stack verbatim: same stylesheets, same runtime, same ClientRouter, same tokens.
  Nothing new was added to `src/styles/`.
- The route is composed of the original's 12 top-level `#page-path` blocks, captured byte-for-byte into
  `src/markup/research/markup/*.html` (`reference/research-split.py`) and emitted through thin
  `.astro` wrappers in `src/components/research/` with `set:html`.
- The navbar gets two server-rendered props (`active`, `surface`) because the original marks the
  current section in the markup; all links go through `route()` in `src/content/routes.ts`.
- All assets were downloaded: 80 WebP variants (model thumbnails, article thumbnails, HF/GitHub
  logos, OG covers) into `public/media/`, 15 CMS SVGs, hero/gradient/arc PNGs, `cat-chilling-black.gif`
  and the OG image. GIFs are served untouched.

---

# Stack report — `/products/`, `/our-method/`, `/use-cases/`, `/sovereign-ai/`

Captured 2026-11-26 from `https://mistral.ai/{products,our-method,use-cases,sovereign-ai}/`
(deployment `dpl=6b06e773f1ddf148ab78a271`; raw captures: `reference/original-{products,method,usecases,sovereign}.html`).

| signal | value |
| --- | --- |
| HTML | 158,636 / 257,168 / 220,728 / 223,908 bytes; fully server-rendered (text, links, images without JS) |
| Framework | Astro 5, static output, `ClientRouter` with `fallback="animate"`, `<html data-astro-transition-scope="astro-v2o6jcai-1">` |
| Islands | **0** `<astro-island>` on all four routes |
| Stylesheets | the **same two files** as `/` and `/research/` (`astro.Bi199NJX.css`, `_..DNmhDKbx.css`) — byte-identical to `src/styles/base.css` / `page.css`, no new tokens |
| JS entry | `layout.astro…DxXVvr30.js` (29,520 B). After stripping the `?dpl=` cache-buster it is **byte-identical** to the already self-hosted `layout…RiVFrrwj.js`; only the unrelated `form` chunk hash differs |
| New custom elements | `mistral-section-product-bento`, `mistral-section-hero-text`, `mistral-section-hero-default`, `mistral-section-hero-sovereign`, `mistral-section-carousel-collection`, `mistral-block-slideshow-cards-feature`, `mistral-block-slideshow-media-feature`, `mistral-block-mobile-slider`, `mistral-block-scrolling-sovereignty`, `mistral-atom-spoiler`, `mistral-atom-navigation-pagination`, `mistral-atom-navigation-summary`, `mistral-atom-navigation-dots`, `mistral-atom-progressbar` |
| Lazy chunks | already present in `public/js/`: `product-bento`, `hero-default`, `hero-text`, `hero-sovereign`, `scrolling-sovereignty`, `slideshow`, `slideshow-cards-feature`, `slideshow-media-feature`, `carousel-collection`, `slider`, `swiper`, `spoiler`, `navigation-pagination`, `navigation-summary`, `posts`, `input-tag-filter`, `url` |
| Libraries not seen on the homepage | **none new** — GSAP/ScrollTrigger (scrollytelling), Swiper (quotes carousel), the shared slideshow class. No Lottie/Rive/WebGL/video |
| Content | products: hero + 5 bento cards. method: 12 blocks (hero, 4 value cards, journey graphic, 3 working tabs, 4 team roles, 2 customer quotes, 4 deployment options, closing CTA). use-cases: 18 filter chips, 16 cards, 9 per page, pagination, search, empty state. sovereign-ai: hero + flag GIF, 3-step pinned diagram, 4 layer tabs, 5 path anchors, closing |
| DOM duplication | hero h1 twice (accessible + `.js-title`) with one real `<h1>`; desktop/mobile blocks duplicated as on `/`; the four-layer tab labels appear in both the mobile trigger and the desktop list |
| Media | 132 new assets downloaded (WebP `srcset` sets, CMS SVG icons/logos, `flag.gif`, `dots.svg`, Stellantis/Cisco logos, journey/layer artwork). `/images/spritesheets/flag.gif` is served unmodified |

## What the clone does with that

- Reuses the homepage stack verbatim: same stylesheets, same runtime, same ClientRouter, same tokens. Nothing new was added to `src/styles/` or `public/js/`.
- Each route's `#page-path` / `#use-case-index` children are captured byte-for-byte into
  `src/markup/<page>/markup/*.html` (`reference/page-split.py`) and emitted through thin `.astro`
  wrappers in `src/components/<page>/` with `set:html`, so the original's own classes
  (`product-bento`, `scrolling-sovereignty`, `posts`, `slideshow`, `spoiler`, `navigation-summary`, …)
  drive every animation, filter and transition. There is no reimplementation to drift.
- All links go through `route()`; the four paths are added to the route registry, everything else stays
  on `https://mistral.ai/...`.
- Navbar state on all four routes is identical: header surface `bg-surface-brand-secondary`, nav item 1
  ("Sovereign AI", `/sovereign-ai/`) carries `bg-surface-brand-primary`. The dropdown sub-items show no
  active state in the original, so none is added.
- Measured transfer weight (1440 px light): JS 71.8→73.5 kB (products), 101.2→103.9 kB (method),
  74.0→75.8 kB (use-cases), 76.5→78.3 kB (sovereign); CSS 37.5→40.1 kB on all four — inside ±15%.

---

# Stack report — `/products/vibe/` and `/use-cases/<slug>/`

Captured 2026-11-26 from `https://mistral.ai/products/vibe/` and the 16 `/use-cases/<slug>/`
pages linked from `/use-cases/` (deployment `dpl=6b06e773f1ddf148ab78a271`; raw captures:
`reference/original-vibe.html`, `reference/original-usecases-detail/<slug>.html`).

| signal | value |
| --- | --- |
| HTML | vibe 487,428 B; use-case details 153,409–164,000 B; fully server-rendered |
| Framework | same Astro 5 build, `ClientRouter fallback="animate"`, `data-astro-transition-scope="astro-v2o6jcai-1"` |
| Islands | **0** `<astro-island>` on all 17 routes |
| Stylesheets | the same two files as every other route (`astro.Bi199NJX.css`, `_..DNmhDKbx.css`) — no new tokens |
| JS entry | `layout…DxXVvr30.js`, already self-hosted as `layout…RiVFrrwj.js` (byte-identical after stripping `?dpl=`) |
| New custom elements | `mistral-block-hero-vibe-app`, `mistral-block-card-plan`, `mistral-atom-text-price`, `mistral-atom-button-tooltip`, `mistral-atom-button-os-download`, `mistral-atom-text-hero-title`, `mistral-atom-navigation-summary`, `mistral-atom-spoiler`, `mistral-atom-progressbar`, `mistral-block-slider-cards`, `mistral-atom-media-video`, `mistral-atom-button-link-action` |
| Lazy chunks | all already present in `public/js/`: `hero-vibe-app`, `text-price`, `button-tooltip`, `button-os-download`, `slider-cards`, `text-hero-title`, `navigation-summary`, `spoiler`, `progressbar`, `slideshow-media-feature`, `slider-logo-scrolling`, `slider-infinite-scrolling`, `editorial-headline` |
| Libraries | **none new** — no video player, no Lottie/Rive on these routes |
| Content | vibe: 12 blocks (hero, logos, features headline + tabs, pricing headline + 4 plans, Understand, work headline, Ship, audiences headline, 12-item FAQ, closing). use-case details: 2 blocks (hero + Challenge/Solution/Result body) or 4 blocks (plus a related-use-cases headline and slider) |
| DOM notes | `#page-path` on a detail page carries `class="pt-nav"` (the two index pages do not); the detail hero's back link is `href="/use-cases"`, which the live site redirects to `/use-cases/` |
| Media | 301 unique assets across the 17 routes, 129 new (CMS SVG icons/logos, WebP screenshots, one 7.5 MB mp4 in `ai-for-code-review`). One Storylane demo iframe is kept verbatim; no analytics/GTM |

## What the clone does with that

- Reuses the homepage stack unchanged: same two stylesheets, same runtime, same tokens, no new
  components beyond thin markup wrappers.
- Vibe's 12 blocks are captured into `src/markup/vibe/markup/` and emitted by
  `src/components/vibe/*.astro`. The 16 detail pages are captured whole (one file per slug) into
  `src/markup/use-cases-detail/` and emitted by the shared `src/components/use-cases/UseCaseDetail.astro`;
  `src/pages/use-cases/[slug].astro` renders them from `getStaticPaths()`.
- Metadata (`title`, description, the page's own JSON-LD graph including Vibe's `SoftwareApplication`
  offers) is generated into `src/content/details.ts` by `reference/page-split.py`, so the head render
  is field-for-field identical to the original.
- All 17 paths are in `src/content/routes.ts`, so the `/products/` bento card and the 16 `/use-cases/`
  cards now navigate in-app instead of leaving for the live site.
- Navbar state matches the originals: `bg-surface-brand-secondary` surface, nav item 1 ("Sovereign AI",
  `/sovereign-ai/`) active, no active state on dropdown sub-items.

---

# Stack report — `/products/studio/`, `/products/forge/`, `/cloud/inference/`, `/cloud/compute/`

Captured 2026-11-27 from `https://mistral.ai/products/studio/`, `/products/forge/`,
`/cloud/inference/` and `/cloud/compute/` (deployment `dpl=6b08b35f5257f1dfa8e3a24a`; raw captures:
`reference/original-{studio,forge,inference,compute}.html`).

| signal | value |
| --- | --- |
| HTML | studio 253,322 B; forge 292,365 B; inference 469,561 B; compute 238,544 B; fully server-rendered |
| Framework | same Astro 5 build, `ClientRouter fallback="animate"` |
| Islands | **0** `<astro-island>` on all four routes |
| Stylesheets | the same two files as every other route (`astro.Bi199NJX.css`, `_..DNmhDKbx.css`) — no new tokens |
| JS entry | `layout…DxXVvr30.js`, already self-hosted as `layout…RiVFrrwj.js` |
| New custom elements | `mistral-section-hero-product-studio`, `mistral-section-hero-product-forge`, `mistral-block-terminal-build`, `mistral-section-highlighted-models`, `mistral-atom-navigation-tabs`, `mistral-atom-navigation-tab-pricing`, `mistral-atom-navigation-tab-processing`, `mistral-atom-input-checkbox-regional`, `mistral-atom-text-price`, `mistral-atom-button-tooltip`, `mistral-atom-navigation-dots`, `mistral-section-carousel-collection` |
| Lazy chunks | all already present in `public/js/`: `hero-product`, `terminal-build`, `highlighted-models`, `navigation-tabs`, `text-price`, `button-tooltip`, `carousel-collection`, `slideshow-cards-feature`, `slideshow-media-feature`, `navigation-summary`, `spoiler`, `progressbar`, `slider-logo-scrolling`, `slider-infinite-scrolling`, `editorial-headline` |
| Libraries | **none new** — no video player, no Lottie/Rive/WebGL |
| Content | studio 5 blocks; forge 10; inference 12; compute 9 (see README for the block names) |
| DOM notes | the server markup for these four headers carries **no** `bg-surface-brand-*` class; the shipped runtime applies `bg-surface-brand-secondary` on load, which is what the clone renders server-side. Studio/Forge mark nav item 1 (“Sovereign AI”), Inference/Compute mark nav item 2 (“Cloud”) |
| Media | 222 new assets downloaded (546 referenced across all cloned routes): hero Studio/Forge SVGs, compute/forge graphic WebPs, terminal + model-table icons, customer logo lockups (black/white pairs) |
| Structured data | one JSON-LD block per page: `SoftwareApplication` (Studio, Forge), `WebPage` (Compute), `@graph` (Inference) |

## What the clone does with that

- Reuses the homepage stack unchanged: same two stylesheets, same runtime, same tokens, no new
  components beyond thin markup wrappers.
- Each page's `#page-path` children are captured byte-for-byte into `src/markup/<page>/markup/*.html`
  and emitted by `src/components/<page>/*.astro` (5 + 10 + 12 + 9 wrappers), so the original's own
  classes (`hero-product-studio`, `terminal-build`, `highlighted-models`, `navigation-tabs`,
  `slideshow-media-feature`, `navigation-summary`, `carousel-collection`, …) drive every animation,
  tab, spoiler and slider.
- Metadata (title, description, each page's own JSON-LD) is generated into `src/content/details.ts`
  by `reference/page-split.py`.
- All four paths are in `src/content/routes.ts`, so the navbar’s Cloud and product links, and the
  `/products/` bento cards, now navigate in-app.

## Inline SVG extraction (code organisation, no stack change)

The four landings alone held most of the site's repeated drawings; across every cloned route the
captures contained 526 inline `<svg>` occurrences and only 113 distinct drawings.

- `reference/split-svgs.py` writes each distinct drawing to `src/svg/<group>/<name>.svg` (exact
  bytes) plus a generated wrapper in `src/components/svg/`, and replaces the inline copy in the
  capture with an invisible `<!--svg:Name-->` marker.
- `src/components/RawSection.astro` renders a capture and resolves those markers to components, so a
  page imports art like any other component (`import ArrowUpRight from '../svg/ArrowUpRight.astro'`).
- No new dependency, no client JS, no island. Output bytes are unchanged in structure: all 27 built
  pages were diffed against the pre-refactor build with a canonicaliser (element tree + attributes +
  text); 0 structural and 0 text differences. The only byte-level change is that Astro no longer
  re-compresses whitespace inside the SVG payloads, which the browser ignores.
