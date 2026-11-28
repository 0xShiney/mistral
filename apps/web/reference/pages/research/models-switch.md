# “Our models” group switch (`mistral-section-models-dock`)

Measured on the live page, then asserted against the clone (`models-switch.json`).

## Mechanism

| question | answer |
| --- | --- |
| tabs, toggle, scroll-spy or stacked groups? | **tabs** — two `.js-tab` buttons, two `[data-tab-panel]` panels, `data-active="true"/"false"` on both |
| markup switch | CSS only: panels are `js-tab-content hidden data-[active=true]:block`; the runtime flips `data-active` |
| is a panel crossfade / slide / height animation applied? | **no** — the panel swaps instantly; only the tab buttons animate (`transition-colors`, surface `secondary ↔ primary`, text `muted ↔ primary`) |
| URL / hash sync? | none (no hash, no query parameter) |
| keyboard | **none** — the tabs are plain `<div>`s (`class="js-tab"`), not focusable, so `Enter` on them is a no-op. Measured: `focusable: false` and no state change on both sites (parity, not an omission) |
| mobile layout (390 px) | tabs stay side by side, the panel stacks, the model dock wraps (`flex-wrap: wrap`, 254 px wide) — no carousel, no accordion |
| height change on switch | the panel resizes with its content: **755 px → 724 px** at 1440 px, and the page reflows; measured identical on both sites |

## Cards inside a group

Each panel holds all of its model cards stacked in the same grid cell
(`w-full col-start-1 row-start-1`); exactly one carries `data-active="true"` and only it is
displayed. Switching is done from the icon dock below the card.

`models-dock` (`public/js/models-dock.BQnwq0Wr.js`) on `pointerenter`, `focus` and `click` of a
`[data-model-trigger]`:

1. previous card: `gsap.to(autoAlpha: 0, xPercent: ∓25, duration: .45, ease: power3.out)` then `hidden`;
2. incoming card: `hidden` removed, `gsap.fromTo(autoAlpha 0→1, xPercent ±25→0, duration .45, ease power3.out)`;
3. `data-active` is moved on the trigger and all cards.

Direction is derived from the index delta, so the card always enters from the side it comes from.

## Dock magnify

`pointermove` on `[data-dock]`:

```
n     = max(0, 1 − |pointerX − centreX(trigger)| / 110)
scale = 1 + n × 0.35
y     = −n × 12px    →  transform: translate3d(0, -y, 0) scale(scale)
```

No transition while tracking (`transition: none`); on `pointerleave` every trigger gets
`transition: transform .45s cubic-bezier(.34,1.56,.64,1)` (back-out overshoot) and an empty transform.

Measured sequence (1440 px, identical JSON on both sites):

| step | visible panel | panel height | visible card | chips | active dock index |
| --- | --- | --- | --- | --- | --- |
| load | General purpose | 755 px | Mistral Large 4 | `1.05T`, `52 Active` | 0 |
| click “Specialist” | Specialist | 724 px | OCR 4.1 | — | 0 |
| click dock item 4 | Specialist | 724 px | Voxtral Mini Transcribe 3 | `4B` | 3 |
| focus tab 1 + `Enter` | Specialist (unchanged) | 724 px | Voxtral Mini Transcribe 3 | `4B` | 3 |

Measured with the pointer held on the second trigger (1440 px):

| element | original | clone |
| --- | --- | --- |
| hovered trigger | `matrix(1.34682, 0, 0, 1.34682, 0, -11.8909)` | identical |
| neighbour trigger | `matrix(1.13682, 0, 0, 1.13682, 0, -4.69091)` | identical |
| after pointer leaves | `transform: none` | identical |

## What the clone does

Nothing bespoke: the section markup is the original's server HTML (`src/markup/research/markup/models.html`)
and the behaviour is the original's `models-dock` chunk, loaded by the same custom-element registry as
on the live site (`<mistral-section-models-dock>`). No extra JS, no island, no wrapper.
