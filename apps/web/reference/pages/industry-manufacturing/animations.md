# /industry/manufacturing/ animation inventory

Generated 2026-11-28T09:39:35.098Z by `pnpm verify --page industry/manufacturing`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| `fading-arrow-scroll` | 2000 | linear | 0 | Infinity |
| `fading-arrow-scroll` | 2000 | linear | 200 | Infinity |
| `fading-arrow-scroll` | 2000 | linear | 400 | Infinity |

## Mechanisms

### Static vertical landing page

Fourteen captured blocks in one #page-path: hero, cover, trusted headline + cards, logo strip, sovereignty headline + cards, capabilities headline + tabbed media, experts headline + service cards, use-case headline + slider, closing CTA

### Logo strip + card sliders

mistral-section-slider-logo-scrolling / mistral-block-slideshow-cards-feature / mistral-block-slider-cards are the original Swiper components, driven by the self-hosted runtime

### Scroll-reveal media

data-loaded="false" on the cover frame, flipped by the original runtime once the WebP decodes (opacity/blur transition)


## Measured motion regions



## Pixel parity per width

- light@1440: 0.1183%
