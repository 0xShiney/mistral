# Monorepo

pnpm workspaces + Turborepo. Package scope `@mistral-clone/*`.

```
apps/
  web/      the mistral.ai reproduction (Astro 5.14, static, zero islands)
  legal/    the legal.mistral.ai reproduction (Astro 7.0.7, static, Svelte islands)
packages/
  assets/   byte-identical shared fonts + `sync` into each app's public/
  config/   WEB_ORIGIN / LEGAL_ORIGIN helpers
  tokens/   generated record of the 230 identical design tokens
  verify/   report writer + text/route comparison helpers
```

## Separation rules (enforced)

`pnpm check:boundaries` fails the build when:

1. an app imports from another app (`apps/*` → `apps/other`);
2. a package imports from an app;
3. an app imports a package through an internal path instead of its declared `exports` entry;
4. a file is duplicated between `apps/web/src/content` and `apps/legal/src/content`
   (same relative path, or identical bytes under a different name);
5. a cross-app path is referenced from source.

CI must run: boundaries → typecheck → build → verify, per app.

## Commands

| command | effect |
| --- | --- |
| `pnpm dev` | both apps (web :4321, legal :4322) |
| `pnpm dev:web` / `pnpm dev:legal` | one app |
| `pnpm build` | both apps, cached by Turbo |
| `pnpm preview` | both preview servers |
| `pnpm typecheck` | `astro check` (legal) and `tsc` over the web app's TypeScript modules (`apps/web/tsconfig.check.json`; the landing app's captured markup has pre-existing `astro check` attribute-inference errors, so template checking is scoped out rather than masked) |
| `pnpm check:boundaries` | separation gate |
| `pnpm sync:assets` | copy + checksum-verify shared assets |
| `pnpm verify --app web --all` | landing harness (unchanged) |
| `pnpm verify --app legal --tier 1` / `--all` | legal harness |
| `pnpm extract:legal` | re-crawl the origin into `apps/legal` (HTML, content JSON, assets, redirects) |

Each app also runs standalone: `pnpm --filter @mistral-clone/legal dev`.

## Deploy

Two independent projects; no cross-app build dependency and no shared runtime:

- `apps/web` publishes its own `dist/` (its existing host config).
- `apps/legal` publishes its own `dist/`; `apps/legal/netlify.toml` + `public/_headers`
  send `X-Robots-Tag: noindex, nofollow`, and `public/robots.txt` is `Disallow: /`.

## Migration gate

Before any legal code was written:

- baseline: `apps/web/baseline/build-manifest.json` (864 files, sha256 each) captured from the untouched repo;
- after `git mv` into `apps/web` + workspace install: rebuild produced **864/864 identical
  files (0 content diffs)**, only absolute paths changed. This is recorded in
  `apps/web/baseline/README.md`.
