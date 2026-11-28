# legal.mistral.ai — animation inventory

Every entry is measured from the live site (`animations.json` holds the raw
`document.getAnimations()` dumps and computed transition values).

## Idle

| region | animations at rest |
| --- | --- |
| home | 0 running animations after load (none) |
| cat GIF | `/images/cat-moving.gif?dpl=6b09be635aa060ae1ecdb1ae` — animated GIF, 256×224, plays continuously (no script, no reaction to pointer) |

## Interactions

### FAQ accordion (home, model detail)

| property | value | evidence |
| --- | --- | --- |
| header background | `background-color` 150 ms `cubic-bezier(0.4, 0, 0.2, 1)` | `interactions.faqOpen[0]` |
| chevron | `rotate` 150 ms `cubic-bezier(0.4, 0, 0.2, 1)` | `interactions.faqOpen[1]` |
| panel | `transform` + `opacity` 300 ms linear, fill forwards | `interactions.faqOpen[2]` |
| one-vs-multiple | multiple may be open at once (independent state) | `interactions` test |

### Search palette (⌘K)

- overlay + panel use a Svelte transition with `duration: 100` ms (`b.trim(n,()=>k,()=>({duration:100}))` in the shipped chunk)
- overlay: full-width, `top-12`, `bg-surface-brand-primary/90 backdrop-blur-md`
- scroll lock: `document.body.classList.add('overflow-hidden')` while open
- keyboard: Ctrl/⌘K toggles, Esc closes, ArrowUp/Down wrap, Enter navigates

### Theme switcher

- menu button labelled "Select theme"; options System / Light / Dark
- persists to `localStorage['mode-watcher-mode']`; `.dark` class + `color-scheme` on `<html>`
- no page-wide color transition: the inline bootstrap re-applies before paint on `astro:after-swap`

### Model detail tabs

- "Model Lifecycle" / "Technical Documentation" swap panels; no indicator animation measured (`interactions.tabSwitch` = 0 animations after the swap)

## View transitions

See `view-transitions.md`. Fallback is `none`, and the per-page scope rules set
`animation: none; opacity: 0` on the old root, i.e. navigation is an instant swap.
