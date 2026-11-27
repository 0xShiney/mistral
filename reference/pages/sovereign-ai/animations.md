# /sovereign-ai/ animation inventory

Generated 2026-11-26T05:53:44.998Z by `pnpm verify --page sovereign-ai`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| `animate-pop-in` | 500 | linear | 0 | 1 |

## Mechanisms

### Pinned, scrubbed sovereignty diagram

scrolling-sovereignty.*.js: GSAP timeline + ScrollTrigger {trigger: this, start:"top+=100px", end:"bottom 100%", scrub:true}; tags orbit then collapse, square scale 1→0.4→1, circles 2/3, border #ff8204

### Layer tabs

slideshow-media-feature + spoilers; .js-media[data-active] cross-fade, .js-progressbar height

### Scroll-spy path

navigation-summary.*.js + mistral-atom-spoiler[data-id]; anchors #6abe…; mobile summary label

### Flag spritesheet

/images/spritesheets/flag.gif above the h1; GIF left unoptimised

### Hero SplitText

mistral-atom-text-hero-title autoplay/grow/randomness; .js-title opacity handled by SplitText


## Measured motion regions



## Pixel parity per width

- light@390: 0%
- light@768: 0%
- light@1024: 0.0015%
- light@1440: 0%
- light@1920: 0%
- light@2560: 0%
- dark@390: 0%
- dark@768: 0%
- dark@1024: 0.0021%
- dark@1440: 0%
- dark@1920: 0%
- dark@2560: 0%
