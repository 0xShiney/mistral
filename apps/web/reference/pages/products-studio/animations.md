# /products/studio/ animation inventory

Generated 2026-11-27T05:54:22.182Z by `pnpm verify --page products/studio`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| `animate-pop-in` | 500 | linear | 0 | 1 |

## Mechanisms

### Hero product animation

mistral-section-hero-product-studio: mistral-atom-text-hero-title (autoplay/grow/randomness) plus the js-studio-image / js-studio-background frame swap driven by hero-product-studio.*.js

### Platform scroll-spy + spoilers

mistral-atom-navigation-summary (navigation-summary.*.js) drives a.js-anchor[data-active] and the mistral-atom-spoiler[data-id] panels of section 2; anchored by the #69f2… ids

### Sticky media panel

.js-sticky / .js-media: the left column pins while the spoiler list scrolls; progressbar height follows the trigger

### Service card hover

.js-card-service:hover reveals .js-card-service-description (opacity/transform transition)


## Measured motion regions



## Pixel parity per width

- light@390: 0.0035%
- light@768: 0.0011%
- light@1024: 0.002%
- light@1440: 0%
- light@1920: 0.0006%
- light@2560: 0.0004%
- dark@390: 0%
- dark@768: 0%
- dark@1024: 0%
- dark@1440: 0.0008%
- dark@1920: 0.0005%
- dark@2560: 0.0002%
