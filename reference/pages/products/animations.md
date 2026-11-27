# /products/ animation inventory

Generated 2026-11-26T05:23:16.851Z by `pnpm verify --page products`.

Running `document.getAnimations()` after load, full scroll pass and settle, compared 1:1 with the live original (identical list required by the harness).

| animation | duration | easing | delay | iterations |
| --- | --- | --- | --- | --- |
| `bento-fall` | 500 | linear | 400 | 1 |
| `bento-fall` | 500 | linear | 300.00000000000006 | 1 |
| `bento-fall` | 500 | linear | 200 | 1 |
| `bento-fall` | 500 | linear | 100 | 1 |
| `bento-fall` | 500 | linear | 0 | 1 |

## Mechanisms

### Hero title slot-machine

mistral-atom-text-hero-title (data-autoplay, data-grow, data-randomness) + SplitText chunk; per-character swap on load

### Bento entrance

.bento-card[--i] + .in-view class added by product-bento.*.js show(); CSS transition

### Card image lift on hover

.js-product-card:hover img { transform: scale3d(1.05,1.05,1.05) } (300ms cubic-bezier(.4,0,.2,1)); the runtime additionally wires a title roll when a .js-title exists — the current markup has none, and the original logs the same warning

### Bottom arrow loop

animate-fading-arrow-scroll-1..3 on the scroll hint


## Measured motion regions



## Pixel parity per width

- light@390: 0%
- light@768: 0%
- light@1024: 0%
- light@1440: 0%
- light@1920: 0%
- light@2560: 0%
- dark@390: 0.0208%
- dark@768: 0%
- dark@1024: 0%
- dark@1440: 0%
- dark@1920: 0%
- dark@2560: 0%
