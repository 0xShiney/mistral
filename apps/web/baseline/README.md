# Baseline

`build-manifest.json` was captured on the untouched single-app repository
(before the monorepo migration): 864 files, sha256 + size per file.

After moving the project to `apps/web` and installing the pnpm workspace, the
same `astro build` produced **864 files with byte-identical content** to this
manifest — 0 new, 0 missing, 0 changed (hashes compare content, not absolute
paths). The comparison script is reproduced in `docs/monorepo.md`.

Any later change to `apps/web` must be checked against this manifest:
`node scripts/compare-baseline.mjs` (from the repo root).
