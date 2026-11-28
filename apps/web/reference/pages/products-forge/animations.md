# /products/forge/ animation inventory

Generated 2026-11-27T03:56:40.002Z by `pnpm verify --page products/forge`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| `animate-pop-in` | 500 | linear | 0 | 1 |

## Mechanisms

### Hero product animation

mistral-section-hero-product-forge + mistral-atom-text-hero-title; js-forge-image frame swap

### Infinite logo marquee

mistral-block-slider-infinite-scrolling copies the track twice and translates it in a loop

### Why Forge: tabbed media slideshow

mistral-block-slideshow-media-feature with mistral-atom-spoiler + mistral-atom-progressbar; .js-media[data-active] cross-fade

### System scroll-spy

mistral-atom-navigation-summary a.js-anchor[data-active] scrolls the six spoiler panels of section 6

### Industry carousel

mistral-section-carousel-collection: .js-slider/.js-slider-item, .js-prev/.js-next and .js-dots


## Measured motion regions



## Pixel parity per width

- light@390: 0.0999%
- light@768: 0%
- light@1024: 0.0945%
- light@1440: 0.1639%
- light@1920: 0.0445%
- light@2560: 0.0004%
- dark@390: 0.0907%
- dark@768: 0.0482%
- dark@1024: 0.0788%
- dark@1440: 0.1357%
- dark@1920: 0.0552%
- dark@2560: 0.0529%
