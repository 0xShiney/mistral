# /cloud/inference/ animation inventory

Generated 2026-11-27T04:05:57.312Z by `pnpm verify --page cloud/inference`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| `flow-dot` | 2000 | linear | 600 | Infinity |
| `flow-dot` | 2000 | linear | 1600 | Infinity |

## Mechanisms

### Hero terminal build

mistral-block-terminal-build types the code sample; mistral-atom-navigation-tabs (.js-tabs/.js-tab/.js-tab-content) switches Python/JavaScript/curl

### Sovereignty slideshow cards

mistral-block-slideshow-cards-feature + mistral-atom-navigation-dots + mistral-atom-progressbar; .js-media[data-active]

### Model catalogue tabs

mistral-section-highlighted-models: mistral-atom-navigation-tab-processing/-pricing, mistral-atom-input-checkbox-regional and mistral-atom-text-price (js-text-price/regional discount)

### Quote carousel

mistral-section-carousel-collection (.js-slider-item, .js-prev/.js-next)

### FAQ spoilers

mistral-atom-spoiler + .js-spoiler-trigger in the final section


## Measured motion regions



## Pixel parity per width

- light@390: 0.0461%
- light@768: 0.0509%
- light@1024: 0.0187%
- light@1440: 0.0616%
- light@1920: 0.0021%
- light@2560: 0.0643%
- dark@390: 0.0456%
- dark@768: 0.0013%
- dark@1024: 0.0026%
- dark@1440: 0.0619%
- dark@1920: 0.0763%
- dark@2560: 0.001%
