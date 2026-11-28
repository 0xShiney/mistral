#!/usr/bin/env node
/** Derives the human-readable reference documents from the measured JSON. */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..', '..')
const REF = join(repo, 'reference', 'legal')
const read = (f) => JSON.parse(readFileSync(join(REF, f), 'utf8'))

const stack = read('stack-report.json')
const animations = read('animations.json')
const search = read('search-queries.json')
const sorts = read('sort-orders.json')
const toc = read('toc-scrollspy.json')
const vt = read('view-transitions.json')
const assets = read('assets.json')

const assetBytes = assets.reduce((s, a) => s + a.bytes, 0)
const jsFiles = assets.filter((a) => a.pathname.endsWith('.js'))
const cssFiles = assets.filter((a) => a.pathname.endsWith('.css'))
const fmt = (n) => (n / 1024).toFixed(1) + ' kB'

writeFileSync(
  join(REF, 'stack-report.md'),
  `# legal.mistral.ai — stack report

Measured from the live origin with Playwright on 2026-11-28.

## Framework

- \`meta-generator\`: **${stack.generator}**
- output: static HTML (SSG), Netlify edge cache (\`cache-status: "Netlify Edge"\`)
- view transitions: enabled=\`${stack.vtEnabled}\`, fallback=\`${stack.vtFallback}\`
- islands: **${stack.islands.length}** on the home page, all Svelte (\`renderer-url\` = \`client.svelte.*\`)

| island | component | client | ssr |
| --- | --- | --- | --- |
${[...new Map(stack.islands.map((i) => [i.name, i])).values()]
  .map((i) => `| ${i.name} | \`${i.component.split('?')[0]}\` | \`${i.client}\` | ${i.ssr} |`)
  .join('\n')}

## Routing

- every extensionless route 301s to a trailing-slash canonical (e.g. \`/ai-governance/models\` → \`/ai-governance/models/\`)
- \`/terms\` and \`/terms/\` → \`/terms/get-started\` → \`/terms/get-started/\`
- \`/ai-governance/models/LIDstral Arabic\` 301s **and lowercases** → \`/ai-governance/models/lidstral%20arabic/\`
- \`?language=\` is preserved but does not change the rendered document: \`en-US\`, \`en-GB\`, \`fr-FR\` and \`de-DE\` all 301 to the slash form and return bytes identical to the canonical page; there is no language selector (\`language-variants.json\`)
- unknown paths return the host 404 document with status 404

## Styling and assets

- one compiled stylesheet: \`${cssFiles.map((f) => f.pathname).join('`, `')}\` (${fmt(cssFiles.reduce((s, f) => s + f.bytes, 0))})
- stylesheet contains Tailwind-style utilities plus CSS custom-property tokens (264 token declarations are identical to the landing site's design system)
- fonts: \`/fonts/inter/Inter-VariableFont.ttf\`, \`/fonts/alt-mistral/ALTMistral-{Regular,Medium}.woff2\` (all byte-identical to mistral.ai)
- images: \`legal-cover.webp\`, \`models-cover.webp\`, \`systems-cover.webp\`, \`model-covers/default.png\`, \`texture.webp\`, \`cat-moving.gif\` (animated GIF, unmodified)
- themed covers: \`cover-terms.svg\` / \`cover-terms-dark.svg\`
- every \`/_astro/\` and \`/images/\` URL carries \`?dpl=<deploy id>\`; the clone keeps those query strings and ignores them for file lookup
- total assets mirrored: ${assets.length} files, ${fmt(assetBytes)} (${jsFiles.length} JS, ${jsFiles.reduce((s, f) => s + f.bytes, 0)} bytes; ${cssFiles.length} CSS)

## Search

- not Pagefind/Fuse: a **static JSON index** at \`/search-index.json\` (${(readFileSync(join(repo, 'apps/legal/public/search-index.json')).length / 1024).toFixed(1)} kB, 74 entries)
- results are filtered with \`title.toLowerCase().includes(query)\`, then sorted by \`startsWith\` (descending), then sliced to **8**
- opening the palette fetches the index once; \`⌘K\`/\`Ctrl+K\` toggles, \`Esc\` closes, ↑/↓ move, \`Enter\` navigates with a View Transition

## Hydration and scripts

- \`ClientRouter\` (\`${stack.islands.length ? 'astro:page-load' : ''}\`) is self-hosted from \`/_astro/ClientRouter.astro_astro_type_script_index_0_lang.*.js\`
- islands hydrate with \`client="load"\`, so they are server-rendered and then hydrated after load; no \`client:only\`
- the theme is applied before first paint by an inline script reading \`localStorage['mode-watcher-mode']\` and re-applied on \`astro:after-swap\`

## Response headers (origin)

\`\`\`
${Object.entries(stack.headers['/'].filter ? {} : stack.headers['/'])
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}
\`\`\`
`,
)

writeFileSync(
  join(REF, 'animations.md'),
  `# legal.mistral.ai — animation inventory

Every entry is measured from the live site (\`animations.json\` holds the raw
\`document.getAnimations()\` dumps and computed transition values).

## Idle

| region | animations at rest |
| --- | --- |
| home | ${animations.idle.home.length} running animations after load (none) |
| cat GIF | \`${animations.cat?.src}\` — animated GIF, ${animations.cat?.width}×${animations.cat?.height}, plays continuously (no script, no reaction to pointer) |

## Interactions

### FAQ accordion (home, model detail)

| property | value | evidence |
| --- | --- | --- |
| header background | \`background-color\` 150 ms \`cubic-bezier(0.4, 0, 0.2, 1)\` | \`interactions.faqOpen[0]\` |
| chevron | \`rotate\` 150 ms \`cubic-bezier(0.4, 0, 0.2, 1)\` | \`interactions.faqOpen[1]\` |
| panel | \`transform\` + \`opacity\` 300 ms linear, fill forwards | \`interactions.faqOpen[2]\` |
| one-vs-multiple | multiple may be open at once (independent state) | \`interactions\` test |

### Search palette (⌘K)

- overlay + panel use a Svelte transition with \`duration: 100\` ms (\`b.trim(n,()=>k,()=>({duration:100}))\` in the shipped chunk)
- overlay: full-width, \`top-12\`, \`bg-surface-brand-primary/90 backdrop-blur-md\`
- scroll lock: \`document.body.classList.add('overflow-hidden')\` while open
- keyboard: Ctrl/⌘K toggles, Esc closes, ArrowUp/Down wrap, Enter navigates

### Theme switcher

- menu button labelled "Select theme"; options System / Light / Dark
- persists to \`localStorage['mode-watcher-mode']\`; \`.dark\` class + \`color-scheme\` on \`<html>\`
- no page-wide color transition: the inline bootstrap re-applies before paint on \`astro:after-swap\`

### Model detail tabs

- "Model Lifecycle" / "Technical Documentation" swap panels; no indicator animation measured (\`interactions.tabSwitch\` = ${animations.interactions.tabSwitch.length} animations after the swap)

## View transitions

See \`view-transitions.md\`. Fallback is \`none\`, and the per-page scope rules set
\`animation: none; opacity: 0\` on the old root, i.e. navigation is an instant swap.
`,
)

writeFileSync(
  join(REF, 'view-transitions.md'),
  `# View transitions

- \`meta-astro-view-transitions-enabled\` = \`${stack.vtEnabled}\`
- \`meta-astro-view-transitions-fallback\` = \`${stack.vtFallback}\`
- root scope: \`view-transition-name: astro-<hash>\`; the emitted \`@layer astro\` rules set
  \`::view-transition-old/new(<scope>) { animation: none; opacity: 0; mix-blend-mode: normal }\`
  and \`::view-transition-group(<scope>) { animation: none }\`

Measured tours (raw data in \`view-transitions.json\`):

| from | to | animations during swap | persisted/named elements | final path |
| --- | --- | --- | --- | --- |
${vt
  .map(
    (t) =>
      `| \`${t.from}\` | \`${t.to}\` | ${t.during.flat().length} | ${t.named.length} | \`${t.finalPath}\` |`,
  )
  .join('\n')}

The clone ships the origin's own router chunk and identical \`data-astro-transition-scope\`
markup, so the same instant swap, the same back/forward behaviour and the same script
re-initialisation after a swap apply.
`,
)

// search-queries.json and sort-orders.json are already raw data; add a short index.
writeFileSync(
  join(REF, 'README.md'),
  `# reference/legal

Measured from https://legal.mistral.ai on 2026-11-28. Regenerate with
\`pnpm --filter @mistral-clone/legal extract\` (HTML/assets/content) and
\`node apps/legal/scripts/recon.mjs\` (tokens/animations/interactions).

| file | contents |
| --- | --- |
| \`site-map.json\` | every crawled URL: status, redirect target, title, description, outgoing links, island count |
| \`stack-report.md/.json\` | Astro version, islands, routing, headers, asset weight |
| \`tokens.json\` | computed styles per element × width × scheme, layout boxes |
| \`animations.json/.md\` | \`getAnimations()\` dumps idle/FAQ/search/tab, transitions, cat GIF |
| \`search-queries.json\` | ${search.length} queries and the origin's ordered results |
| \`sort-orders.json\` | all four model sort orders and the counter |
| \`toc-scrollspy.json\` | ${toc.length} scroll positions and the active TOC anchor |
| \`view-transitions.md/.json\` | transition metadata, tours, animations during swaps |
| \`language-variants.json\` | \`?language=\` probe: status, redirect, byte identity with the canonical page |
| \`assets.json\` | every mirrored asset with size + sha256 |
| \`source/\` | raw server HTML per rendered route (git-ignored) |
| \`verification-report.md/.json\` | harness result |
| \`screenshots/\` | per scheme/width screenshots (git-ignored) |
`,
)

console.log('wrote stack-report.md, animations.md, view-transitions.md, README.md')
