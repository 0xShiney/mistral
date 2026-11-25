# mistral.ai homepage — Astro reproduction

A pixel- and behaviour-faithful reproduction of the [mistral.ai](https://mistral.ai/) homepage,
built on the same architecture as the original: **Astro 5, static output, zero framework islands,
custom elements + GSAP/Matter.js/Swiper for motion**.

This is a design study. Mistral AI, the Mistral logo, the customer logos (AXA, ASML, Cisco,
Snowflake, CMA CGM, HSBC, Ericsson, TotalEnergies, ESA, BMW, BNP Paribas, European Patent Office) and
all copy belong to their owners and are used only to reproduce the page for study.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build && pnpm preview
pnpm verify         # Playwright comparison against the live original
```

`pnpm verify` needs the network (it loads `https://mistral.ai` for the side-by-side run). Point it
elsewhere with `ORIGIN=… CLONE=…`, and narrow the matrix with `WIDTHS=390,1440 SCHEMES=light`.
The report is written to `reference/verification-report.md`.

## Structure

```
src/
  layouts/Base.astro          head, metadata, theme bootstrap, ClientRouter, skip link, runtime
  pages/index.astro           composition of the 10 top-level blocks of #page-path
  components/
    GlobalNavigation.astro    <global-navigation> header + mega menus + mobile drawer
    GlobalFooter.astro        footer, language switcher, theme buttons, gradient, pixel cat
    sections/                 Hero, VibeBar, LogoMarquee, Strings, FeatureHeadline, FeatureBody,
                              CustomersHeadline, CustomersTabs, DeeperHeadline, DeeperCards
  styles/base.css             original compiled stylesheet (theme tokens, fonts, Tailwind utilities)
  styles/page.css             original page stylesheet
public/
  js/                         original client runtime + lazy component chunks (self-hosted)
  fonts/                      ALTMistral (4 weights + italics), Inter variable, DM Mono, Space Mono
  cms-media/ images/ media/   every original asset, original filenames; GIFs untouched
reference/                    recon + measured data + screenshots + verification report
tests/verify/                 Playwright harness (run.mjs), static server, reference extractor
```

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

## Known deviations

1. **Single route.** Only the homepage is reproduced, so there is no second internal route on which
   to watch a live `ClientRouter` swap. The transition configuration (meta tags, `animation: none`
   root) is the original's and is asserted by the harness; see `reference/view-transitions.md`.
2. **WebP location.** Hashed WebP files are served from `/media/` instead of `/_astro/` (build-dir
   collision), with identical filenames and `srcset` widths.
3. **Consent UI.** Not reproduced because it never rendered in the captured environment; the
   original's cookie/consent scripts are intentionally excluded.
4. Every other visual/interaction difference found by the harness is zero at the time of writing;
   residual pixel deltas (0.1–0.3 %) are confined to regions that are continuously animated
   (pixel-garden, marquee phase, Matter.js tags, GIF frames), which is expected for two independent
   runs.

## Reusing the harness

`tests/verify/lib.mjs` is site-agnostic: it opens two URLs with the same context, runs a scroll
program, measures geometry/computed style and screenshots. Point `ORIGIN`/`CLONE` at any pair of
pages and extend `GEOMETRY` plus the `scenarios` map in `run.mjs` with the landmarks and
interactions for the page you are cloning.
