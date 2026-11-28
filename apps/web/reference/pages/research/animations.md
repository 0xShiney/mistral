# /research/ — animation & interaction inventory

Measured on the live page (`https://mistral.ai/research/`, captured 2026-11-25) and asserted against
the clone by `pnpm verify --page research`. Raw data: `animations.json` (inventory + motion probe),
`filter-matrix.json` (every filter combination), `models-switch.json`, `view-transitions.json`.

Everything below runs from the original's own client runtime, self-hosted in `public/js/`
(`hero-research`, `text-hero-title`, `models-dock`, `posts`, `input-tag-filter`, `navigation-*`,
`editorial-headline`, `cards-service`, `dropdown`, `layout` entry). The chunk that owns each effect is
named so the timing can be traced to code rather than guessed.

## 1. Global

| item | value | source |
| --- | --- | --- |
| islands | 0 (`astro-island` count) | harness `architecture · islands` |
| runtime | one Astro entry chunk + lazy per-component chunks | network |
| view transitions | `astro-view-transitions-enabled=true`, `fallback=animate`, root `animation: none`, `transition:name="root"` | meta + inline style |
| CSS animations running after settle | 3 — all `fading-arrow-scroll` (hero scroll hint) | `document.getAnimations()` |
| theme switch | `.dark` class from `localStorage.theme`, re-applied on `astro:before-swap` | inline bootstrap |
| smooth scroll hijack | none (native scrolling; `goTop()` uses `scrollTo` with −48 px offset) | `posts` chunk |
| reduced motion | `prefers-reduced-motion` only gates `raise-track` (CSS) ; JS timelines are unchanged | `page.css` + measured height parity |

## 2. Hero (`mistral-block-hero-research`)

- **Title intro** — `mistral-atom-text-hero-title` → `SplitText` splits the `h1` into lines/words/chars;
  GSAP timeline `duration .55`, ease `power4.out`-family (`gsap.t`), lines staggered `0.12s × 1.05`,
  chars offset by `rand(1,4) × 0.003`, each line `clipPath inset(100% 0 0 0) → inset(0% 0 0 0)`,
  chars `y 100% → 0`. Every 5th/8th char is duplicated for a slot-machine look. Reverts the split on
  complete. Source: `text-hero-title.BsppqQX8.js`.
- **Scroll hint** — three arrows with `fading-arrow-scroll 2s {0s,.2s,.4s} linear infinite`,
  keyframes `0%,40% opacity .2 → 50% opacity 1 → 60%,100% opacity .2`. This is the only idle motion
  in the hero: 600 ms frame sampling shows 0.004 % (original) / 0.005 % (clone) of pixels changing,
  same three animation instances.
- **Gradient / arc images** — static: `hero-research-gradient.png`, `arc-squares.png`,
  `gradient-1@0.5x.png` keep `transform: none` through a full pointer sweep. No parallax.
- **Hero icons** — `hero-research` chunk animates a trail of 10 icons on pointer move: 200 px canvas,
  random `rotate(±25deg)`, GSAP `power4.out 0.4s`, `clipPath` reveal, sparkle burst
  (`rand(1,5)×0.1+0.5` scale, `x/y rand(±75)`, 1.5 s). Both sites run the same chunk; the hover
  state of the icon list is `data-active`.

## 3. “Our models” (`mistral-section-models-dock`) — mechanism in `models-switch.md`

- **Group switch** — two `.js-tab` divs toggle the two `[data-tab-panel]` panels instantly (CSS
  `data-[active=true]:block`); the tabs themselves transition colours (`transition-colors`, surface
  `secondary → primary`, text `muted → primary`). No crossfade of the panel, no height animation, no
  URL/hash change. Panel height follows its content (755 px → 724 px at 1440 px). The tabs are not
  focusable and have no keyboard handler (same on both sites).
- **Card switch inside a group** — `[data-model-trigger]` (pointerenter, focus, click) calls
  `showModel`: incoming card `autoAlpha 0→1`, `xPercent ±25→0`, `0.45 s power3.out`; outgoing
  `autoAlpha 1→0`, `xPercent 0→∓25`, then `hidden`. Only one card is `data-active` at a time.
- **Dock magnify** — `pointermove` on `[data-dock]`: influence `n = max(0, 1 − |px − centre| / 110)`,
  `scale = 1 + n·0.35`, `translateY = −n·12px`. On `pointerleave` each trigger animates back with
  `transform .45s cubic-bezier(.34,1.56,.64,1)` (back-out overshoot). Measured on both sites with the
  pointer held on the second trigger: `matrix(1.34682, 0, 0, 1.34682, 0, -11.8909)` on it and
  `matrix(1.13682, 0, 0, 1.13682, 0, -4.69091)` on its neighbour — identical to five decimals.
- **No idle motion** in the section (Δpixels 0 %, 0 running animations).

## 4. “Publications.” (`mistral-section-posts`)

- **Filter model** — 9 `mistral-atom-input-tag-filter` checkboxes. The slug list is written to the URL
  with `history.replaceState` (`?categories=audio,vision`), so reload/back restores the selection;
  `syncUrlParams()` also runs on `astro:after-swap`.
- **Semantics: OR** — `post.dataset.categories.split(',').some(c => selected.includes(c))`.
- **Counts** — 21 rows total; unfiltered listing shows **6** (`data-post-per-page=6`) and
  “Load more”; one click reveals all 21 and swaps the control for “Show less”. While filtering, the
  list shows **every** match (pagination is bypassed) and both buttons are hidden.
- **Counter** — `.js-post-filter-count` is rewritten with the number of visible rows (`21`, `5`, `1`…),
  no animation, no singular/plural switch (the label is always “results”).
- **Empty state** — `.js-empty-result` (cat GIF `cat-chilling-black.gif`, alt “Search”, “No results”)
  is shown only when zero rows match. No combination of the nine topics produces zero matches, so the
  state is present-but-hidden on this data set (same on both sites).
- **Scroll on filter change** — `onCategory` calls `goTop()`, which scrolls the window to the top of the
  posts section with a −48 px offset. Verified identical on both sites.
- **Row hover** — `group-hover/publications:opacity-30` on siblings, hovered row `opacity 1`;
  the tag is a static chip. No transform on hover.

## 5. “Research areas.” / “Build on our open weight models.” (`mistral-section-cards-service`)

- Cards come from the shared `cards-service` chunk: reveal on enter (IntersectionObserver) and a
  pointer-follow highlight; measured hover keeps `transform: none` on the card itself, the accent is
  the inner border/icon. No idle motion.
- Build cards (Hugging Face / GitHub) use the same card component with `connector-*` WebP logos.

## 6. “Inside the work.” (`section.inverted`)

- 7 post cards in a `mistral-section-posts`-independent slider/grid; card hover moves the arrow
  (`group-hover/button` translate on the shared button component, `300 ms`, icon `-40px→0`,
  text `+28px`, right icon `+40px`).
- Decorative icons (`Icon-Model-Large 3.svg`, `icon-m-flower.svg`, `icon-m-lightbulb.svg`) are
  rendered statically in this section — no transform over 1.2 s of frame sampling (same on both).

## 7. “Join us.” CTA + footer

- CTA button uses the shared button component (arrow slide on hover, `300 ms`); entrance is the
  section reveal (no scroll-linked scrub).
- Footer: gradient + sitting-cat GIF, GSAP-scrubbed wordmark (`y 100→0`, `scrub: 1`) and the cat wink
  (`rect height 0→…` on `90% bottom`), identical to the homepage footer (byte-identical markup).

## 8. Parity evidence

| probe | original | clone |
| --- | --- | --- |
| running CSS animations after settle | 3 | 3 |
| hero frame delta (600 ms) | 0.004 % | 0.005 % |
| dock magnify transform | `1.34682 / −11.8909` | `1.34682 / −11.8909` |
| idle sections moving | none | none |
| model card switch state | identical JSON | identical JSON |
| filter matrix (9 singles, 6 combos, load more, show less) | — | identical JSON |
| page transition state after 3 swaps | identical JSON | identical JSON |
