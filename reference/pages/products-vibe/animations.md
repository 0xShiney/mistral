# /products/vibe/ animation inventory

Generated 2026-11-26T07:41:45.081Z by `pnpm verify --page products/vibe`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| `animate-pop-in` | 500 | linear | 0 | 1 |
| `animate-pop-in` | 500 | linear | 0 | 1 |

## Mechanisms

### Hero title slot-machine

mistral-atom-text-hero-title (data-autoplay, data-grow, data-randomness) + SplitText per character

### Feature tabs

slideshow-media-feature + mistral-atom-spoiler; .js-media[data-active] cross-fade and mistral-atom-progressbar

### Capability scroll-spy

navigation-summary.*.js + mistral-atom-spoiler[data-id]; anchors #6a0f…, mobile sticky summary

### Price tax toggle

mistral-atom-text-price .js-exclude-taxe + mistral-atom-button-tooltip

### OS download switcher

mistral-atom-button-os-download detects the platform and reveals the matching platform row


## Measured motion regions



## Pixel parity per width

- light@390: 0%
- light@768: 0.0289%
- light@1024: 0.0607%
- light@1440: 0.0001%
- light@1920: 0.0249%
- light@2560: 0.0258%
- dark@390: 0.0272%
- dark@768: 0%
- dark@1024: 0.0365%
- dark@1440: 0.3014%
- dark@1920: 0.3421%
- dark@2560: 0.0118%
