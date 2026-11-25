# View transitions

## Original

- `<meta name="astro-view-transitions-enabled" content="true">` and `<meta name="astro-view-transitions-fallback" content="animate">`.
- Astro `ClientRouter` module in `<head>`.
- `<html data-astro-transition-scope="astro-…">` and an inline style block declaring `view-transition-name: root` with `::view-transition-old/new(root) { animation: none }` and `::view-transition-group(root) { animation: none }` — i.e. the homepage opts out of the cross-fade and swaps instantly; `mix-blend-mode: normal`.
- No `transition:name` / `transition:persist` / `data-astro-reload` attributes are used on the homepage (the header is re-rendered, not persisted).
- Theme bootstrap re-applies the `dark` class on `astro:before-swap` so the incoming document keeps the theme without a flash.

## Clone

- `ClientRouter` with `fallback="animate"` in `src/layouts/Base.astro`; Astro emits the same two meta tags.
- The root scope is declared explicitly on the document element:
  `<html lang="en" class transition:animate="none" transition:name="root">`. Without those two
  directives Astro still emits the meta tags but *no* transition scope, and the swap would fall back
  to the browser's default cross-fade. With them the built HTML contains exactly the original's
  block: `[data-astro-transition-scope="astro-…"] { view-transition-name: root; }` plus
  `::view-transition-old/new/group(root) { animation: none }` (`old` also `opacity: 0;
  mix-blend-mode: normal`). Only the generated scope hash differs, since it is build-specific on
  both sites (`astro-v2o6jcai-1` on the original).
- The same inline theme bootstrap runs on `astro:before-swap`.
- All behaviour is attached via custom elements and `astro:page-load` listeners in the original runtime, so it re-initialises after a swap (no `DOMContentLoaded`-only listeners).

## Limitation

This project recreates only the homepage, so there is no second internal route to navigate to and
observe a live swap on the clone. The transition configuration above is the original one; the
harness verifies the meta tags, the root `view-transition-name`, the `animation: none` rules and
that no named/persisted elements exist on either site (check `document · view-transition meta +
root style` in `verification-report.md`). Run `pnpm dev` and add any route if you need to watch the swap itself.
