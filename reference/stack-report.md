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
