# legal.mistral.ai — stack report

Measured from the live origin with Playwright on 2026-11-28.

## Framework

- `meta-generator`: **Astro v7.0.7**
- output: static HTML (SSG), Netlify edge cache (`cache-status: "Netlify Edge"`)
- view transitions: enabled=`true`, fallback=`none`
- islands: **18** on the home page, all Svelte (`renderer-url` = `client.svelte.*`)

| island | component | client | ssr |
| --- | --- | --- | --- |
| ModeWatcher | `/_astro/index.Do_9lL7I.js` | `load` | false |
| Search | `/_astro/search.DNpscTUM.js` | `load` | false |
| FaqItem | `/_astro/faq-item.r-3N7oyS.js` | `load` | false |
| ThemeSwitcher | `/_astro/theme-switcher.B0lvFYjl.js` | `load` | false |

## Routing

- every extensionless route 301s to a trailing-slash canonical (e.g. `/ai-governance/models` → `/ai-governance/models/`)
- `/terms` and `/terms/` → `/terms/get-started` → `/terms/get-started/`
- `/ai-governance/models/LIDstral Arabic` 301s **and lowercases** → `/ai-governance/models/lidstral%20arabic/`
- `?language=` is preserved but does not change the rendered document: `en-US`, `en-GB`, `fr-FR` and `de-DE` all 301 to the slash form and return bytes identical to the canonical page; there is no language selector (`language-variants.json`)
- unknown paths return the host 404 document with status 404

## Styling and assets

- one compiled stylesheet: `/_astro/Layout.CdK3j_XA.css` (58.6 kB)
- stylesheet contains Tailwind-style utilities plus CSS custom-property tokens (264 token declarations are identical to the landing site's design system)
- fonts: `/fonts/inter/Inter-VariableFont.ttf`, `/fonts/alt-mistral/ALTMistral-{Regular,Medium}.woff2` (all byte-identical to mistral.ai)
- images: `legal-cover.webp`, `models-cover.webp`, `systems-cover.webp`, `model-covers/default.png`, `texture.webp`, `cat-moving.gif` (animated GIF, unmodified)
- themed covers: `cover-terms.svg` / `cover-terms-dark.svg`
- every `/_astro/` and `/images/` URL carries `?dpl=<deploy id>`; the clone keeps those query strings and ignores them for file lookup
- total assets mirrored: 108 files, 14741.8 kB (25 JS, 379655 bytes; 1 CSS)

## Search

- not Pagefind/Fuse: a **static JSON index** at `/search-index.json` (6.4 kB, 74 entries)
- results are filtered with `title.toLowerCase().includes(query)`, then sorted by `startsWith` (descending), then sliced to **8**
- opening the palette fetches the index once; `⌘K`/`Ctrl+K` toggles, `Esc` closes, ↑/↓ move, `Enter` navigates with a View Transition

## Hydration and scripts

- `ClientRouter` (`astro:page-load`) is self-hosted from `/_astro/ClientRouter.astro_astro_type_script_index_0_lang.*.js`
- islands hydrate with `client="load"`, so they are server-rendered and then hydrated after load; no `client:only`
- the theme is applied before first paint by an inline script reading `localStorage['mode-watcher-mode']` and re-applied on `astro:after-swap`

## Response headers (origin)

```
accept-ranges: bytes
age: 7942
cache-control: public,max-age=0,must-revalidate
cache-status: "Netlify Edge"; hit; ttl=31528058
content-encoding: br
content-length: 9864
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; frame-src *; style-src 'self' 'unsafe-inline'; img-src * blob: data:; media-src *; connect-src *; font-src 'self' data:; form-action 'self'; frame-ancestors 'self' https://legal.mistral.ai https://legal-center-v2.netlify.app; upgrade-insecure-requests;
content-type: text/html; charset=UTF-8
date: Sat, 28 Nov 2026 03:54:36 GMT
etag: W/"1c56e865bd347bb67cb942ebe934223d-ssl"
server: Netlify
strict-transport-security: max-age=31536000
vary: Accept-Encoding
x-nf-request-id: 01M8G4MSSBTZR3BHKJF3ZVGB95
```
