# /our-method/ animation inventory

Generated 2026-11-26T05:32:18.803Z by `pnpm verify --page our-method`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Mechanisms

### Hero image + SplitText intro

mistral-section-hero-default data-loaded="false" flipped by hero-default.*.js; .js-title SplitText per character

### Value / flexibility card slideshow

slideshow-cards-feature + slideshow.CWoS44AO.js: hover trigger, auto progressbar (.js-progressbar) and .js-card-spoiler height

### Working with Mistral tab stack

slideshow-media-feature + mistral-atom-spoiler: trigger click/hover switches .js-media[data-active] and the panel spoiler

### Customer quotes slider

carousel-collection + Swiper (slider.CmLRuZco.js), loop:true, .js-next/.js-prev + navigation dots

### Journey graphic reveal

data-loaded on the section; CSS fade/translate once in view


## Measured motion regions



## Pixel parity per width

- light@390: 0%
- light@768: 0%
- light@1024: 0.0012%
- light@1440: 0.0001%
- light@1920: 0.0001%
- light@2560: 0.0007%
- dark@390: 0%
- dark@768: 0%
- dark@1024: 0.0153%
- dark@1440: 0.0007%
- dark@1920: 0.0001%
- dark@2560: 0.0006%
