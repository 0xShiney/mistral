# /customers/ animation inventory

Generated 2026-11-28T08:03:09.499Z by `pnpm verify --page customers`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Mechanisms

### Collection hero title

mistral-atom-text-hero-title (data-autoplay, data-grow, data-randomness) + SplitText chunk; the h1 is sr-only and the visible copy is aria-hidden

### Featured slider

mistral-block-slider-cards-collection + slider-cards-collection.*.js (Swiper): the six featured stories are one draggable track

### Post grid

mistral-section-posts with data-filtering="false" data-load-more="false" data-post-per-page="-1": all 42 cards are server-rendered, the runtime adds no controls

### Card hover

.js-slider-item:hover { opacity: .9 } (300ms transition); the image fades in on load via onload


## Measured motion regions



## Pixel parity per width

- light@390: 0%
- light@768: 0%
- light@1024: 0%
- light@1440: 0%
- light@1920: 0%
- light@2560: 0%
- dark@390: 0%
- dark@768: 0%
- dark@1024: 0%
- dark@1440: 0%
- dark@1920: 0%
- dark@2560: 0%
