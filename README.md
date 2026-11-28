# Mistral study replicas — monorepo

Two independent reproduction apps and a small set of shared packages.

| app | original | stack |
| --- | --- | --- |
| [`apps/web`](apps/web/README.md) | `https://mistral.ai/` (27 routes) | Astro 5, static, zero islands |
| [`apps/legal`](apps/legal/README.md) | `https://legal.mistral.ai/` (64 routes + 404) | Astro 7.0.7, static, Svelte islands |

> **`apps/legal` is an unofficial, non-authoritative study replica. It is not
> operated by Mistral AI, it is not legal advice, and it is not the
> authoritative terms.** It ships `robots.txt` with `Disallow: /` and an
> `X-Robots-Tag: noindex, nofollow` header. The rendered DOM is kept identical
> to the origin for parity testing; the safeguards live in headers, robots and
> these docs only.

## Layout

```
apps/
  web/        landing-site reproduction (own content, routes, templates, public/, reference/)
  legal/      legal-site reproduction (own content, routes, templates, public/, reference/)
packages/
  assets/     byte-identical shared fonts + checksum-verified sync into each app
  config/     WEB_ORIGIN / LEGAL_ORIGIN helpers
  tokens/     generated record of the 230 verified-identical design tokens
  verify/     harness core: report writer, text/route comparison
docs/
  monorepo.md            layout, commands, boundaries, deploy
  sharing-decisions.md   what is shared and the evidence for each decision
reference/
  legal/                 legal-site recon, content snapshots, verification report
```

`apps/web` and `apps/legal` never import from each other and share no content,
route registry, template or deploy config. `pnpm check:boundaries` enforces it
(cross-app imports, package internals, duplicated content files).

## Commands

```bash
pnpm install
pnpm dev                        # web :4321, legal :4322
pnpm build
pnpm check:boundaries
pnpm typecheck
pnpm verify --app web --all     # landing harness (unchanged, baseline-gated)
pnpm verify --app legal --tier 1
pnpm verify --app legal --all
pnpm extract:legal              # re-crawl legal.mistral.ai into apps/legal
pnpm sync:assets
```

Each app runs standalone too: `pnpm --filter @mistral-clone/legal dev`.

## Migration guarantee

The landing app was moved into `apps/web` untouched. `apps/web/baseline/`
holds a sha256 manifest captured **before** the migration; after the move and
workspace install, `node scripts/compare-baseline.mjs` reports
**864 files, 0 content differences**. No landing code was rewritten and no
design token or behaviour changed.

## Verification

`reference/legal/verification-report.md` records every measured check for the
legal app: byte-level HTML parity for all routes, PIxel/geometry/style diffs at
390–2560 px in light, dark and system, interactions (search, theme, FAQ, tabs,
sort, TOC, mobile menu, print), architecture (islands, generator), assets and
quality gates. The web app keeps its own reports under `apps/web/reference/`.
