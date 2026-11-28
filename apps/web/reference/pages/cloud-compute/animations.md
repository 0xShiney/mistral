# /cloud/compute/ animation inventory

Generated 2026-11-27T06:02:57.923Z by `pnpm verify --page cloud/compute`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Mechanisms

### Hero SplitText

mistral-atom-text-hero-title (autoplay/grow/randomness) on mistral-section-hero-text

### Quote carousel

mistral-section-carousel-collection: .js-slider-item transform, .js-prev/.js-next, .js-dots

### Infrastructure slideshow

mistral-block-slideshow-media-feature with mistral-atom-spoiler + mistral-atom-progressbar; .js-media[data-active] cross-fade

### Card grid reveal

mistral-section-cards-service + .js-card-service: description/hover transition, in-view reveal


## Measured motion regions



## Pixel parity per width

- light@390: 0.0055%
- light@768: 0.0121%
- light@1024: 0.0037%
- light@1440: 0.0005%
- light@1920: 0.0052%
- light@2560: 0.0037%
- dark@390: 0%
- dark@768: 0.0008%
- dark@1024: 0.0014%
- dark@1440: 0.0001%
- dark@1920: 0%
- dark@2560: 0%
