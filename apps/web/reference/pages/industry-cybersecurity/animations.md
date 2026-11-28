# /industry/cybersecurity/ animation inventory

Generated 2026-11-28T09:25:20.999Z by `pnpm verify --page industry/cybersecurity`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Mechanisms

### Static vertical landing page

Fourteen captured blocks in one #page-path: hero, cover, trusted headline + cards, logo strip, sovereignty headline + cards, capabilities headline + tabbed media, experts headline + service cards, use-case headline + slider, closing CTA

### Logo strip + card sliders

mistral-section-slider-logo-scrolling / mistral-block-slideshow-cards-feature / mistral-block-slider-cards are the original Swiper components, driven by the self-hosted runtime

### Scroll-reveal media

data-loaded="false" on the cover frame, flipped by the original runtime once the WebP decodes (opacity/blur transition)


## Measured motion regions



## Pixel parity per width

- light@390: 0.1076%
- light@768: 0.0093%
- light@1024: 0.062%
- light@1440: 0.0634%
- light@1920: 0.0621%
- light@2560: 0.0757%
- dark@390: 0.1403%
- dark@768: 0.0692%
- dark@1024: 0.0004%
- dark@1440: 0.0959%
- dark@1920: 0.0012%
- dark@2560: 0.0631%
