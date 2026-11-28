# Page transitions on /research/

Both pages are Astro `ClientRouter` documents with `<html transition:animate="none" transition:name="root">`,
`astro-view-transitions-enabled="true"` and `fallback="animate"` — i.e. the original's own
configuration, so `/` ↔ `/research/` navigations behave the same on both sites.

Evidence: `view-transitions.json` (recorded by `pnpm verify --page research`), plus the
`transitions` group in `verification-report.md`. Original and clone values below are byte-identical.

## Measured

| navigation | original | clone |
| --- | --- | --- |
| click the logo (`/`) from research | `path /`, header `rgb(251,251,248)`, Research not active (correct: home has no active nav item), h1 “Mistral is #1 in Sovereign AI.” | identical |
| click “Research” from home | `path /research/`, header `rgb(245,244,239)`, Research active (`bg-surface-brand-primary`), h1 “We advance the open frontier.” | identical |
| browser Back | returns to `/`, header `#fbfbf8`, Research inactive, home h1 | identical |
| filter state across a round trip | “3” (audio filter still applied after returning) — `syncUrlParams()` re-applies `?categories=` on `astro:after-swap` | identical |
| three consecutive swaps, then a control | URL `/research/`, `.js-tab` still toggles (`data-active=true`), 3 running CSS animations, counter `21`, header `#f5f4ef`, Research active | identical |

## What is persisted

- **Navbar**: no `transition:persist` anywhere in the original markup, so the header is re-rendered on
  every swap — the active state and surface come from the incoming page's server HTML
  (`bg-surface-brand-secondary` + active item on `/research/`, `bg-surface-brand-primary` on `/`).
  Any script re-initialises through `astro:page-load`; the harness confirms no duplicate listeners
  (`after 3 swaps` state is unchanged and the tab/filter controls still respond).
- **Root**: `animation: none` — the document itself does not fade; sections simply appear.
- **Filters / tabs**: DOM state resets with the swap, then the filter selection is restored from the
  URL (`?categories=`), which is exactly what the original does.

## Batch note

The research page and the homepage share the same `<html>` transition configuration and the same
Astro version, so the transition duration/easing (`animation: none`) and the named-view-transition
list are identical by construction; the harness asserts the meta tags, the root style and the
post-swap state.

## Known deviation

Uncloned routes (`/about/`, `/news/`, …) resolve to `https://mistral.ai/…` through the route registry
(`src/content/routes.ts`), so clicking them on the clone is a normal cross-origin navigation to the
live site instead of an in-app `ClientRouter` swap. This is deliberate: the clone only serves `/` and
`/research/`.
