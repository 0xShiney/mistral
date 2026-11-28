# Animation inventory (original)

Source: https://mistral.ai · measured 2026-11-25T09:46:10.653Z

Every mechanism below is shipped by the clone as the same code path: the original client runtime
(Astro entry chunk + GSAP/ScrollTrigger/SplitText + Matter.js + Swiper + per-component chunks) is
self-hosted under `public/js/` and loaded by `Base.astro`, so triggers, durations and easing are the
original values rather than approximations.

## Mechanisms

| library | evidence | used for |
| --- | --- | --- |
| GSAP 3 + ScrollTrigger + SplitText | chunk ScrollTrigger.*.js (42.7 kB), SplitText.*.js, gsap.*.js imported by text-hero-title and layout entry | hero title per-character intro; footer wordmark scrub + cat wink; nav dropdown height morph; mobile menu (power3 in/out, 0.35s); feature progress bars; customer slideshow |
| Matter.js | matter.*.js chunk (physics engine, rigid bodies) imported by section-strings | "strings" tag cloud: every word is a draggable rigid body with pointer constraint |
| Swiper | swiper.*.js + slider.CmLRuZco.js imported by slider/carousel components | logo marquee track and card sliders |
| CSS animations | only 1 CSS animation running at rest in both sites | small looping indicators |
| Animated GIF | sovereign-flag.gif, cat-sitting-{black,white}.gif | hero flag, footer cat |

## Hero

- `mistral-atom-text-hero-title` splits the display line into lines→words→chars with SplitText, then runs a GSAP timeline: each char `y:100% → 0%` with 0.55s `power2.out`-style ease and a random 3–12ms-per-char stagger; a duplicated char is offset to `-50%` (slot-machine effect). Line containers get `clip-path: inset(100% 0 0 0) → inset(0%)`. The headline element starts with the `opacity-0` class and GSAP removes it on start.
- Flag GIF: `/cms-media/api/media/file/sovereign-flag.gif`, 0.8em box, translated (-0.15em, -0.1em) via `.js-title` utility selectors.
- Hero decorative pixel-garden squares/cat are GSAP-controlled (`hero-home-sentence-center` chunk): idle timeline (`repeat:-1, yoyo:true, delay:2`) slides columns every few seconds; the grapple icon follows the pointer (debounced 500ms).

## Logo strip

- `mistral-block-slider-infinite-scrolling` moves a duplicated track with GSAP; measured 60.0 px/s, 60 logo elements in the DOM (10 customers × 2 theme variants).

## Strings section

- Matter.js world: each tag is a rigid body with a pointer constraint; drag/throw with friction and bounce. Tags collide with each other and the section bounds, so idle frames always change.

## Feature block ("Mistral lets you decide…")

- `mistral-atom-navigation-summary` + four `mistral-atom-spoiler` items. Desktop: sticky column with a vertical progress bar (`mistral-atom-progressbar`, `h-0` → filled while scrolling) and an expanding media slideshow (`mistral-block-slideshow-media-feature`). Mobile: accordion (spoiler buttons, height animation).

## Customers

- Same slideshow-media-feature component driven by `mistral-atom-spoiler` tabs; logos swap black/white via `dark:` variants; progress bar tracks elapsed time.

## Footer

- `global-footer` GSAP: wordmark `y:100 → 0` scrubbed between `#sub-footer` top and bottom; cat SVG `rect` height 0 → 54 → 0 (`scrub`/`toggleActions: play none none reset`) = the wink. Theme buttons animate the `dark` class with a `no-transitions` guard.

## Page transitions

- Astro `ClientRouter` with `fallback="animate"`; the homepage root has `view-transition-name: root` and both old/new root animations are set to `animation: none`, i.e. an instant swap with no cross-fade (see view-transitions.md).

## Running CSS animations at rest (original)

```json
[
  {
    "name": "animate-pop-in",
    "duration": 500,
    "iterations": 1
  }
]
```
