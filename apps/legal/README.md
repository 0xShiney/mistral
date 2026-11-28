# legal.mistral.ai — study replica

> **Unofficial replica. Not legal advice. Not the authoritative terms.**
>
> This app is a non-authoritative study reproduction of the Mistral AI Legal
> Center (`https://legal.mistral.ai/`), built to study its layout and
> behaviour. It is **not** operated by Mistral AI, and nothing it renders is a
> binding agreement, notice or legal statement. The authoritative documents are
> the ones published by Mistral AI on `legal.mistral.ai`.

## Safeguards

- `public/robots.txt` is `Disallow: /`.
- `public/_headers` and `netlify.toml` send `X-Robots-Tag: noindex, nofollow`.
- No analytics, consent SDK, GTM or tracking scripts are loaded (the origin's
  shipped runtime contains none either).
- The safeguards live in headers/robots/docs, never in page markup: the served
  DOM stays identical to the origin's so parity can be measured.

## What is here

- Astro **7.0.7** (the origin's own version), static output.
- One generated route file per origin URL (`src/pages/[...path].astro`), plus
  `/404.html`. The 64 rendered documents and the 404 are captured verbatim,
  including the origin's head, inline theme bootstrap, `<astro-island>` props
  and `?dpl=` asset URLs, so the Svelte islands (`Search`, `FaqItem`,
  `ThemeSwitcher`, `ModeWatcher`) and the Astro View Transition router behave
  exactly as they do upstream.
- The origin's compiled stylesheet, JS chunks, fonts, covers, metadata and
  `search-index.json` are self-hosted under `public/` with original paths.
- `src/content/pages/*.json`: typed per-route content (title, description, OG,
  headings with ids, text, links, images, islands, full document).
- `scripts/extract.mjs` regenerates all of the above from the live site.
  `node scripts/extract.mjs --check` reports upstream drift.

## Commands

```bash
pnpm dev                 # http://localhost:4322
pnpm build && pnpm preview
pnpm extract             # re-crawl + re-download (writes reference/legal/source)
pnpm extract:check       # diff the live site against the stored snapshot
pnpm recon               # refresh reference/legal measured artefacts
pnpm verify              # Playwright parity harness (tier 1)
```

## Known deviations

1. **Trailing-slash redirects on a bare static host.** Astro emits directory
   output; `public/_redirects` + `netlify.toml` reproduce the origin's 301s on
   deploy, and `src/middleware.ts` implements `/terms` → `/terms/get-started/`
   for both slash forms in `dev`. `astro preview` does not perform
   trailing-slash 301s; the verify harness uses `tests/verify/serve.mjs`, which
   reads `_redirects` and does.
2. **`?language=` redirect.** The origin 301s `/terms/privacy-policy?language=…`
   to the slash form. A static host cannot match query strings; the clone
   serves the same bytes at either form (content is identical upstream).
3. **`?dpl=`** query strings are preserved verbatim. File lookup ignores them.
4. The uppercase `LIDstral Arabic` path is 301'd to the lowercase canonical by
   `_redirects`. The canonical page is pre-rendered at the space path and also
   copied to the literal `%20` directory so servers that do not decode before
   lookup still find it.
5. **The origin is live.** A capture is a point-in-time snapshot (the model
   index changed upstream between two captures during development). Run
   `pnpm extract:check` to see upstream drift; re-running `pnpm extract`
   refreshes content and assets. The verification report records the capture
   it was measured against.

Everything else is byte-identical to the origin's server HTML for all 64
rendered routes; see `../../reference/legal/verification-report.md`.
