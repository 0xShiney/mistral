# reference/legal

Measured from https://legal.mistral.ai on 2026-11-28. Regenerate with
`pnpm --filter @mistral-clone/legal extract` (HTML/assets/content) and
`node apps/legal/scripts/recon.mjs` (tokens/animations/interactions).

| file | contents |
| --- | --- |
| `site-map.json` | every crawled URL: status, redirect target, title, description, outgoing links, island count |
| `stack-report.md/.json` | Astro version, islands, routing, headers, asset weight |
| `tokens.json` | computed styles per element × width × scheme, layout boxes |
| `animations.json/.md` | `getAnimations()` dumps idle/FAQ/search/tab, transitions, cat GIF |
| `search-queries.json` | 47 queries and the origin's ordered results |
| `sort-orders.json` | all four model sort orders and the counter |
| `toc-scrollspy.json` | 40 scroll positions and the active TOC anchor |
| `view-transitions.md/.json` | transition metadata, tours, animations during swaps |
| `language-variants.json` | `?language=` probe: status, redirect, byte identity with the canonical page |
| `assets.json` | every mirrored asset with size + sha256 |
| `source/` | raw server HTML per rendered route (git-ignored) |
| `verification-report.md/.json` | harness result |
| `screenshots/` | per scheme/width screenshots (git-ignored) |
