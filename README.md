# mistral.ai — Astro reproduction (27 routes)

A pixel- and behaviour-faithful reproduction of the [mistral.ai](https://mistral.ai/) homepage plus
[`/research/`](https://mistral.ai/research/), [`/products/`](https://mistral.ai/products/),
[`/products/vibe/`](https://mistral.ai/products/vibe/),
[`/products/studio/`](https://mistral.ai/products/studio/),
[`/products/forge/`](https://mistral.ai/products/forge/),
[`/cloud/inference/`](https://mistral.ai/cloud/inference/),
[`/cloud/compute/`](https://mistral.ai/cloud/compute/),
[`/our-method/`](https://mistral.ai/our-method/), [`/use-cases/`](https://mistral.ai/use-cases/),
all 16 [`/use-cases/<slug>/`](https://mistral.ai/use-cases/) detail pages and
[`/sovereign-ai/`](https://mistral.ai/sovereign-ai/), built on the same architecture as the original:
**Astro 5, static output, zero framework islands, custom elements + GSAP/Matter.js/Swiper for motion**.

This is a design study. Mistral AI, the Mistral logo, the customer logos (AXA, ASML, Cisco,
Snowflake, CMA CGM, HSBC, Ericsson, TotalEnergies, ESA, BMW, BNP Paribas, European Patent Office) and
all copy belong to their owners and are used only to reproduce the page for study.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build && pnpm preview
pnpm verify                  # Playwright comparison against the live original (homepage)
pnpm verify --page research  # the same harness, scoped to /research/
pnpm verify --page products      # /products/
pnpm verify --page our-method    # /our-method/
pnpm verify --page use-cases     # /use-cases/ (full filter matrix + pagination)
pnpm verify --page sovereign-ai  # /sovereign-ai/ (84-position scroll story probe)
pnpm verify --page products/vibe          # /products/vibe/
pnpm verify --page products/studio       # /products/studio/
pnpm verify --page products/forge        # /products/forge/
pnpm verify --page cloud/inference       # /cloud/inference/
pnpm verify --page cloud/compute         # /cloud/compute/
pnpm verify --page use-cases/<slug>       # one /use-cases/<slug>/ detail page
pnpm verify --all                # every cloned content route in one browser session
```

`pnpm verify` needs the network (it loads `https://mistral.ai` for the side-by-side run). Point it
elsewhere with `ORIGIN=… CLONE=…`, and narrow the matrix with `WIDTHS=390,1440 SCHEMES=light`.
The homepage report is written to `reference/verification-report.md`; the `/research/` report and its
measured artefacts go to `reference/pages/research/`.

For the research page the matrix can be split across invocations (`SKIP=matrix,sweep|interactions`,
`WIDTHS`/`SCHEMES`); every batch runs the identical code path and writes `verification.json`.
`--quick` limits a run to 1440 px / light.

## Structure

```
src/
  layouts/Base.astro          head, metadata, theme bootstrap, ClientRouter, skip link, runtime;
                              props: title, description, path, jsonLd, navActive, navSurface
  pages/index.astro           composition of the 10 top-level blocks of #page-path
  pages/research/index.astro  composition of the 12 top-level blocks of /research/'s #page-path
  pages/products/index.astro      2 blocks: hero + product bento
  pages/our-method/index.astro    12 blocks: hero, value, journey, working, team, quotes, flexibility, CTA
  pages/use-cases/index.astro     2 blocks: hero + the filterable index (#use-case-index)
  pages/use-cases/[slug].astro    the 16 detail pages, one CMS template + getStaticPaths
  pages/products/vibe/index.astro 12 blocks: hero, logos, features, pricing, capabilities,
                                  understand/ship, audiences, FAQ, closing
  pages/products/studio/index.astro   5 blocks: hero, platform, cards headline, cards, closing
  pages/products/forge/index.astro    10 blocks: hero, logos, why, system, media, industries, closing
  pages/cloud/inference/index.astro   12 blocks: hero, logos, sovereignty, models, APIs, stories,
                                      resources, closing, FAQ
  pages/cloud/compute/index.astro     9 blocks: hero, media, quotes, infrastructure, controls,
                                      guarantees, closing
  pages/sovereign-ai/index.astro  7 blocks: hero, pinned scroll story, layers, path, closing
  content/routes.ts           route registry: local path for cloned routes, live URL otherwise
  content/details.ts          generated metadata registry for Vibe, Studio, Forge, Inference,
                              Compute and the 16 use-case details (title, description, JSON-LD)
  content/research/           typed content model generated from the same capture
                              (publications.ts, models.ts, research-areas.ts, articles.ts)
  markup/research/markup/      the original's server markup per section, byte-for-byte
  markup/{products,method,use-cases,sovereign-ai}/markup/
                              the same for the four product routes
  markup/vibe/markup/         the same for /products/vibe/
  markup/{studio,forge,inference,compute}/markup/
                              the same for the four product/cloud landing pages
  markup/use-cases-detail/    one verbatim file per /use-cases/<slug>/ page
                              (captures hold `<!--svg:Name-->` markers, see svg/ below)
  svg/                        one file per distinct inline SVG, grouped by page
    <page>/*.svg              arrow-up-right.svg, studio-hero-01.svg, …
    global/*.svg              logo, social icons, app badges, theme icons, page illustrations
    registry.ts               generated: marker name → component
  components/
    RawSection.astro          renders one capture; resolves its svg markers back to components
    svg/*.astro               generated one-line component per file in src/svg/
    GlobalNavigation.astro    <global-navigation> header + mega menus + mobile drawer
    GlobalFooter.astro        footer, language switcher, theme buttons, gradient, pixel cat
    sections/                 Hero, VibeBar, LogoMarquee, Strings, FeatureHeadline, FeatureBody,
                              CustomersHeadline, CustomersTabs, DeeperHeadline, DeeperCards
    research/                 one zero-JS wrapper per research section (emits the captured markup)
    products/ our-method/ use-cases/ sovereign-ai/
                              one zero-JS wrapper per captured section
    vibe/                     the same for /products/vibe/ (12 wrappers)
    studio/ forge/ inference/ compute/
                              one zero-JS wrapper per captured section of the four landings
    use-cases/UseCaseDetail.astro
                              one wrapper shared by all 16 use-case detail pages
  styles/base.css             original compiled stylesheet (theme tokens, fonts, Tailwind utilities)
  styles/page.css             original page stylesheet (identical for both routes)
public/
  js/                         original client runtime + lazy component chunks (self-hosted)
  fonts/                      ALTMistral (4 weights + italics), Inter variable, DM Mono, Space Mono
  cms-media/ images/ media/   every original asset, original filenames; GIFs untouched
reference/                    recon + measured data + verification reports
  pages/research/             animations.json|md, filter-matrix.json, models-switch.md|json,
                              view-transitions.md|json, verification-report.md(+json)
  pages/<page>/               the same artefacts for products, our-method, use-cases and
                              sovereign-ai (plus scroll-story.json for the latter)
  research-split.py           capture → src/markup/research/markup/*.html (+ wrappers)
  page-split.py               capture → src/markup/<page>/markup/*.html (+ wrappers), the detail
                              markup and src/content/details.ts
  split-svgs.py               inline <svg> → src/svg/*.svg + components/svg/*.astro + markers
                              (run after page-split.py / research-split.py)
  download-assets.mjs         Playwright asset downloader for every cloned route
  research-data.py            capture → src/data/research/*.ts

Local-only (git-ignored, regenerated by a verification run): `reference/screenshots/` and each
`reference/pages/*/screenshots/` directory, plus the raw captures `reference/original*.html` and
`reference/original-usecases-detail/` (re-`curl` them before re-running `page-split.py` or the
`research-*.py` scripts).
tests/verify/                 Playwright harness (run.mjs, site.mjs, research.mjs), static server
```

## Icons and inline SVG

The site is built from the same small pixel-art glyphs everywhere: the captures held 526 inline
`<svg>` occurrences but only 113 distinct drawings. `reference/split-svgs.py` lifts each distinct
drawing into `src/svg/<page>/<name>.svg` and generates the matching zero-logic component in
`src/components/svg/`, so an icon is imported like any other component:

```astro
import ArrowUpRight from '../svg/ArrowUpRight.astro'   // from src/components/<page>/
<ArrowUpRight />
```

Captures cannot hold imports (they are DOM-exact strings), so each one is replaced by an invisible
`<!--svg:ArrowUpRight-->` marker. `src/components/RawSection.astro` renders the capture and swaps
each marker for its component; an unknown marker fails the build instead of silently dropping art.
The `.svg` files are imported with Vite `?raw` and emitted through `set:html`, so the rendered bytes
stay exactly the ones measured off the live page. Shared drawings are stored once and imported by
every page that uses them (e.g. the diagonal arrow appears 193 times on `/cloud/compute/`).

Because the script names drawings in scan order, re-running it on unchanged sources is a no-op.
When a capture is regenerated, run `page-split.py` / `research-split.py` first and `split-svgs.py`
last — it owns the markers.

## Stack decisions (and why they match)

The recon is in [`reference/stack-report.md`](reference/stack-report.md); the short version:

- **Astro, static, no islands.** The original ships `meta-astro-view-transitions-*`, an Astro
  `ClientRouter` module and **zero** `<astro-island>` elements, so the clone uses Astro 5 with
  `ClientRouter fallback="animate"` and no framework runtime. The harness asserts `islands: 0` on
  both sites.
- **The original's own client runtime.** All motion lives in one Astro entry chunk plus per-component
  lazy chunks. Those chunks (GSAP + ScrollTrigger + SplitText, Matter.js, Swiper and the component
  classes) are self-hosted under `public/js/` with the original lazy-import map, so triggers,
  durations, staggers and easings are the measured values rather than approximations. Trickled JS:
  **106.8 kB (original) vs 109.7 kB (clone)** gzip on this route — well inside ±15 %.
- **The original's compiled stylesheet.** Because the goal is pixel equality, the two shipped
  stylesheets are served unchanged instead of re-deriving ~1,700 utilities and theme tokens. CSS
  weight: 37.5 kB → 39.9 kB gzip.
- **Verbatim markup.** Each section's server HTML is kept byte-for-byte (including the
  `data-astro-cid-*` attributes the original's scoped rules key on), split into balanced Astro
  components. Text, hrefs, alt text and aria labels are the original's.
- **Media self-hosted.** `/cms-media/api/media/file/...`, `/images/...` and the Astro-transformed
  WebP keep their original paths (WebP under `/media/` instead of `/_astro/`, which would collide
  with Astro's build directory). The animated GIFs (`sovereign-flag.gif`, `cat-sitting-black.gif`,
  `cat-sitting-white.gif`) are served as-is, never optimised.
- **Theme.** The original has no OS-only switch: `localStorage.theme` (`system`/`light`/`dark`)
  drives the `.dark` class, bootstrapped inline before paint and re-applied on `astro:before-swap`.
  Reproduced verbatim; both schemes verified at every width.
- **No analytics.** GTM, Axeptio, HubSpot, Contentsquare and Netlify RUM are deliberately excluded.
  The Axeptio consent banner never rendered in the capture environment on the original, so there
  was no consent UI to mock.

## Motion inventory

[`reference/animations.md`](reference/animations.md) (data in `animations.json`) records each
mechanism with its evidence: the hero's SplitText per-character slot-machine intro, the pixel-garden
idle timeline and pointer-following grapple, the 60 px/s seamless logo marquee, the Matter.js
draggable "strings" tag cloud, the sticky feature scroller with its vertical progress bar, the
customer slideshow, the footer wordmark scrub and cat wink, the mega-menu height morph, the mobile
drawer (`power3`, 0.35 s) and the instant (`animation: none`) root view transition.

For `/research/` the same style of inventory lives in
[`reference/pages/research/animations.md`](reference/pages/research/animations.md) (data in
`animations.json`): the hero's SplitText intro and 2 s `fading-arrow-scroll` hint, the models-dock
magnify + 0.45 s `power3.out` card swap, the publication list's filter/load-more behaviour, the
scroll-to-top on filter change, and the transition state across three consecutive swaps.

## Verification

`pnpm verify` runs both sites in one Chromium build with identical viewport, color scheme and scroll
program and produces `reference/verification-report.md`:

- full-page pixel diff per width × scheme (threshold: < 1 % of pixels differing by more than 16/255),
- geometry + computed style for 21 landmark elements (1 px tolerance),
- navbar state sweep every 300 px in both schemes,
- motion parity (hero frame delta, marquee speed, running CSS animations),
- interaction scenarios executed identically on both sites (mega menu, mobile drawer, feature
  accordion, customer tabs, language selector, theme toggle, footer cat),
- scroll integrity (3 s idle, after programmatic scroll, scroll-snap), console errors, theme
  resolution, view-transition meta/root style, semantics, GIF assets, keyboard skip link and
  `prefers-reduced-motion`,
- transferred JS/CSS weight and island parity.

Reference data extracted from the live original: `tokens.json` (colors, typography, container,
sections per width/scheme), `navbar-states.{light,dark}.json` (25 px sweep), `strings-section.json`
(tag positions per width), `feature-scroll.json`, `view-transitions.md`, plus screenshots in
`reference/screenshots/<scheme>/<width>/{orig,clone}.png`.

### Environment notes

- The harness is Chromium-only and needs system fonts. In a bare container the CI Chromium build may
  lack shared libraries; install Playwright's dependencies (`pnpm exec playwright install --with-deps chromium`).
- Some Chromium builds reject the legacy `format("woff2-variations")` hint used by the site's own
  `@font-face` for Inter, which makes text metrics collapse. The harness installs an equivalent
  `format("woff2")` face **on both sites** before measuring (see `tests/verify/lib.mjs`) so the
  comparison stays fair; it changes nothing in the shipped project.

## Routes and the route registry

`src/content/routes.ts` is the single source of truth for link targets. `route('/research/')` returns
`/research/` because that route is cloned; `route('/about/')` returns `https://mistral.ai/about/`
because it is not. The navbar and footer call `route()` for every link, every captured section is
post-processed with `rewriteHrefs()` on the way out, and `Base.astro` builds canonical/hreflang/og:url
from the same `path` prop. All 27 cloned routes therefore stay in-app `ClientRouter` transitions in
any order (including back/forward), while any uncloned destination leaves the clone for the live site.
The detail hero links to `/use-cases` without a trailing slash (the live site redirects it); `route()`
maps it to the cloned `/use-cases/` route.

The navbar's current-section state is server-rendered, exactly like the original: on `/` the header
surface is `bg-surface-brand-primary` and no nav item is active; on `/research/` the surface is
`bg-surface-brand-secondary` and the “Research” item carries `bg-surface-brand-primary`. Every
product, use-case and detail route uses the same surface with the “Sovereign AI” item (nav index 1)
active — except `/cloud/inference/` and `/cloud/compute/`, which mark the “Cloud” item (nav index 2).
The dropdown sub-items carry no active state in the original, so none is added.

## /research/ specifics

- Reuses the homepage stack unchanged: the live route ships the *same* two stylesheets and the *same*
  entry chunk as `/`, so no new CSS, tokens or libraries were added (see `reference/stack-report.md`,
  “route recon”).
- The original's 12 `#page-path` blocks are captured verbatim into `src/markup/research/markup/` and
  emitted through `src/components/research/*.astro` (via `RawSection`), so the original's own runtime
  (`models-dock`, `posts`, `input-tag-filter`, `hero-research`, `text-hero-title`, …) drives every
  animation, filter and transition. There is no reimplementation to drift.
- “Our models”: two tabs, stacked model cards, icon dock with a GSAP magnify
  (`scale +0.35`, `translateY −12px` inside a 110px radius, back-out reset) — documented with measured
  matrices in `reference/pages/research/models-switch.md`.
- “Publications.”: 21 rows, 6 visible initially, OR-combined topic filters stored in
  `?categories=`, counter, empty state, Load more / Show less, and a scroll-to-listing-top on every
  filter change — full matrix in `reference/pages/research/filter-matrix.json`.

## Known deviations

1. **Uncloned routes are external.** Clicking `/about/`, `/news/…`, `/customers/` etc.
   navigates to `mistral.ai` instead of a local page, by design (only the 27 routes above are
   reproduced). Outbound article and arXiv links keep their original targets.
2. **WebP location.** Hashed WebP files are served from `/media/` instead of `/_astro/` (build-dir
   collision), with identical filenames and `srcset` widths.
3. **CDN cache-buster.** The original appends `?dpl=<deploy id>` to `/_astro/` URLs and to plain
   `/images/*.gif` sources; the clone drops it (static build, no deployment id). Bytes and pixels are
   unaffected.
4. **Consent UI.** Not reproduced because it never rendered in the captured environment; the
   original's cookie/consent/analytics scripts are intentionally excluded.
5. Every other visual/interaction difference found by the harness is zero at the time of writing;
   residual pixel deltas are confined to regions that are continuously animated (pixel-garden,
   marquee phase, Matter.js tags, GIF frames, the hero's 2 s arrow loop), which is expected for two
   independent runs.

## The four product routes

All four reuse the homepage stack unchanged (same two stylesheets, same entry chunk, same self-hosted
lazy chunks) and are captured with `reference/page-split.py` into `src/markup/<page>/markup/`, emitted
through thin wrappers. Copy is extracted from the captured server DOM rather than retyped, so the
content lives in those per-section markup files instead of hand-maintained TS data modules (the same
approach already used for `/research/`). Behaviour comes from the original's own runtime:

- **`/products/`** — 5-card bento; `product-bento.*.js` clones each title into a 200 % inner track for
the hover roll and adds `.in-view` for the staggered `bento-fall` entrance; card images and the bottom
arrow loop are CSS.
- **`/our-method/`** — hero SplitText, two `slideshow-cards-feature` grids (hover/autoplay progressbar),
the `slideshow-media-feature` “Working with Mistral” tab stack, the Swiper `carousel-collection` customer
quotes (loop, arrows, dots) and the deployment grid; journey artwork reveals via `data-loaded`.
- **`/use-cases/`** — `posts.*.js` filtering is **OR across every selected chip** (not AND between
groups), counts via `.js-post-filter-count`, `display:none` list changes, scroll-to-listing-top on
every filter/page change, `?categories=` / `?page=` / `?search=` URL sync, 9 cards per page,
pagination that hides itself when a filter leaves one page, and the `cat-chilling-black.gif` empty state.
- **`/sovereign-ai/`** — the pinned diagram is GSAP `ScrollTrigger` with `scrub: true`
(`start: top+=100px`, `end: bottom 100%`), so it is scroll-scrubbed and fully reversible: tags orbit in,
collapse and return; the square scales 1 → 0.4 → 1; two circles cross-fade; the border/dots turn
`#ff8204` at the end. Four layer tabs (`slideshow-media-feature` + spoilers) and a five-anchor
`navigation-summary` scroll-spy (hash ids preserved) complete the page. The flag is the original
spritesheet GIF, served untouched.

## Detail pages

- **`/products/vibe/`** — 12 captured blocks: hero (`mistral-block-hero-vibe-app`, SplitText slot-machine
title, OS-aware download switcher), customer logo slider, feature tabs (`slideshow-media-feature`),
four pricing cards with the `mistral-atom-text-price` tax toggle and tooltip, two capability sections
(Understand / Ship) built from `navigation-summary` scroll-spy + `mistral-atom-spoiler`, the
"For individuals / developers / teams…" headline, a 12-item FAQ and the closing CTA. Everything runs
on the same self-hosted runtime — no new component code.
- **`/use-cases/<slug>/`** — one CMS template rendered for the 16 slugs through
`src/pages/use-cases/[slug].astro`. Each page is captured whole into
`src/markup/use-cases-detail/<slug>.html` and emitted by the shared `UseCaseDetail.astro`, so adding a
case study only means capturing its markup and re-running `reference/page-split.py`. Both variants are
covered: two blocks (hero + Challenge/Solution/Result body with a sticky summary card) and four blocks
(plus a related-use-cases headline and `mistral-block-slider-cards` slider). One page has an mp4 hero
(`ai-for-code-review`) and several embed a Storylane demo iframe; both are kept verbatim, and the
iframe's own vendor warning is excluded from the console-error check on both sites. Titles,
descriptions and each page's own JSON-LD graph are generated into `src/content/details.ts`.

## Product and cloud landing pages

Four more `#page-path` pages, cloned the same way as Vibe: whole blocks captured verbatim into
`src/markup/<page>/markup/`, one thin wrapper per block, the original runtime does the rest.

- **`/products/studio/`** — 5 blocks. SplitText hero that swaps Studio frames (`js-studio-image`),
a `navigation-summary` scroll-spy driving the five spoiler panels of the “Build / Iterate / Deploy /
Govern / Accelerate” section (sticky media column), the “Build what’s next.” headline, the service
card grid (`.js-card-service` hover description) and the closing CTA.
- **`/products/forge/`** — 10 blocks. Hero, infinite logo marquee, the “Why Forge?” tabbed
`slideshow-media-feature`, the six-panel system scroll-spy, a full-width graphic band, the industry
`carousel-collection` and the closing CTA.
- **`/cloud/inference/`** — 12 blocks. The hero ships `mistral-block-terminal-build` with language
tabs (Python / JavaScript / curl); sovereignty `slideshow-cards-feature`; the model catalogue
(`mistral-section-highlighted-models`) with processing/pricing tabs, the regional-pricing checkbox
and `mistral-atom-text-price`; Enterprise APIs, a quote carousel, developer resources, the closing
headline and the FAQ spoilers.
- **`/cloud/compute/`** — 9 blocks. SplitText hero, full-width compute graphic, quote carousel, the
tabbed infrastructure `slideshow-media-feature`, two service-card grids (controls and guarantees)
and the closing CTA.

Metadata (title, description, JSON-LD) for each is generated into `src/content/details.ts` by
`reference/page-split.py`; every page's header surface is `secondary`, matching the state the live
runtime applies.

## Verification

- Homepage: `pnpm verify` → `reference/verification-report.md` (111 checks).
- `/research/`: `pnpm verify --page research` → `reference/pages/research/verification-report.md`
  (139 checks: pixel diff per width/scheme, 27 landmarks, 25px navbar sweep, per-section motion
  parity, models switch, the full filter matrix, copy/link/image parity, meta, no-JS markup,
  transitions across three swaps, hover states, mobile layout, console/CLS/theme/reduced-motion).
- `/products/` (105 checks), `/our-method/` (107), `/use-cases/` (147), `/sovereign-ai/` (114) —
  473 checks when those four routes are run together. The config-driven harness in `tests/verify/site.mjs`
  runs the same six widths × two schemes, a
  25 px navbar sweep, per-region motion parity, copy/link/image/meta parity, no-JS markup, a
  six-route view-transition tour plus three back steps, and page-specific probes:
  - product bento hover/pointer sweep;
  - the shared chrome on every route: mega menu open/close height, language selector, theme toggle,
    footer cat asset and the mobile drawer + Sovereign sub-panel at 390px;
  - method card slideshows, working tabs, quote carousel and flexibility hovers;
  - the **complete use-cases filter matrix** — 18 single chips, 14 within-group and cross-group
    combinations (OR across every selected chip), pagination 1↔2, filter-after-page-2 reset and
    scroll-to-top, search hit and empty state — comparing ordered titles/hrefs, counts and URL state;
  - the sovereign-ai **84-position scroll-story probe** (42 down + 42 up) comparing opacity, scale,
    position, size, border colour and active step, plus reversibility, the four layer switches, all
    five path anchors and the mobile summary dropdown.
- `/products/vibe/` (105 checks, full six-width × two-scheme matrix) — the same probes plus the
  Understand and FAQ spoilers, the navigation-summary anchor jump, and the price/OS-control state.
  Two measurement caveats, both in the harness: the CSS-animation inventory ignores CSS
  *transitions* (an autoplaying slider samples them at arbitrary phases on both sites) and the page
  height check allows 1px for the composited footer overlay.
- `/products/studio/` (104 checks), `/products/forge/` (105), `/cloud/inference/` (105),
  `/cloud/compute/` (105) — the full six-width × two-scheme matrix for each, with the shared probes
  plus page-specific interactions: the Studio platform spoiler + anchor jump, the Forge system
  spoilers and industry carousel, the Inference hero language tabs / pricing-processing tabs /
  regional-pricing checkbox / FAQ panel, and the Compute infrastructure tabs and quote carousel.
  Worst-case pixel difference: studio 0.001 %, forge 0.164 %, inference 0.076 %, compute 0.037 %.
- `/use-cases/<slug>/` — the whole CMS template: hero, sticky summary card, Challenge/Solution/Result
  grid, optional related-use-case slider, hover state of the back/CTA buttons. `ai-for-customer-support`
  was run at the full six-width × two-scheme matrix (102 checks); the other 15 pages were re-run at
  1440 px / light with the identical probe, since they share the template and differ only in content.
- `pnpm verify --all` now runs all 25 content routes (four index pages + Vibe, Studio, Forge,
  Inference, Compute + 16 detail pages) in one browser session.
- Adding the four landings changed the shared navbar links, so the six earlier routes (`/products/`,
  `/our-method/`, `/use-cases/`, `/sovereign-ai/`, `/products/vibe/` and one detail page) were
  re-checked at 1440 px / light: identical copy, identical resolved link targets (the new local paths
  canonicalise to the same absolute URLs), identical images, identical document height and a pixel
  difference of 0.000–0.106 %. Their full-matrix reports above were left as generated.
- Individual reports: `reference/pages/<page>/verification-report.md` (+ `verification.json`,
  `animations.json|md`, `view-transitions.md|json`, `filter-matrix.json`, `scroll-story.json`).

## Reusing the harness

`tests/verify/lib.mjs` is site-agnostic: it opens two URLs with the same context, runs a scroll
program, measures geometry/computed style and screenshots. Point `ORIGIN`/`CLONE` at any pair of
pages and extend `GEOMETRY` plus the `scenarios` map in `run.mjs` with the landmarks and
interactions for the page you are cloning. The content routes are added through the `DEFINITIONS`
map in `tests/verify/site.mjs` (landmarks, motion regions, page-specific interaction probe); the 16
use-case details share one definition factory and differ only by route and report directory.
`run.mjs` dispatches `--page <name>` (including `use-cases/<slug>`) and `--all` to it.
