# Sharing decisions

Rule: code moves into `packages/*` only when the two origins serve the **same
value or bytes**. Everything else stays inside its app. Evidence below was
measured on 2026-11-28.

| item | decision | evidence |
| --- | --- | --- |
| `/fonts/inter/Inter-VariableFont.ttf` | **shared** (`packages/assets`) | sha256 `0be2399e…` on mistral.ai and legal.mistral.ai |
| `/fonts/alt-mistral/ALTMistral-Regular.woff2` | **shared** | sha256 `9b2f9238…` on both |
| `/fonts/alt-mistral/ALTMistral-Medium.woff2` | **shared** | sha256 `9eefb5ae…` on both |
| design tokens (CSS custom properties) | **shared values, recorded only** (`packages/tokens`) | 230 token declarations are identical between the two shipped stylesheets; the full sets differ (279 in legal, 776 in web). Both apps must keep serving their own compiled CSS byte-for-byte, so the package records the shared scale but does not replace either bundle. |
| UI components (header, footer, logo, nav, search, theme switcher) | **not shared** | legal's chrome is Svelte islands (`FaqItem`, `Search`, `ThemeSwitcher`, `ModeWatcher`); web's is zero-JS Astro markup with a different DOM, classes and behaviour. No component markup is identical. |
| header/footer markup | **not shared** | legal header is `nav` + `Legal Center` + `Terms`/`AI Governance`; web header is `<global-navigation>` with a mega menu. Different DOM, different scripts. |
| page templates (`DocsLayout`, sidebar, TOC, cards) | **not shared** | exist only on legal; web has no docs layout |
| route registries | **not shared** | `apps/web/src/content/routes.ts` vs legal's generated `src/content/pages/*.json`; URLs do not overlap |
| content | **not shared** | enforced by `pnpm check:boundaries` (no shared path, no identical bytes between the two `src/content` trees) |
| CSS | **not shared** | legal `Layout.CdK3j_XA.css` (58.6 kB) vs web `base.css` + `page.css` (255.9 kB); different bundles |
| Astro version | **not shared** | legal origin reports Astro **7.0.7**; web clone uses Astro **5.14.x** (its origin's stack). Each app pins its own. |
| Playwright harness | **core shared, adapters per app** | `packages/verify` provides the report writer and text/route helpers; `apps/web/tests/verify/*` and `apps/legal/tests/verify/*` keep their own page-specific probes. The web harness was left untouched during the migration to guarantee a zero-diff build. |
| origins config | **shared** (`packages/config`) | pure TypeScript: `WEB_ORIGIN`, `LEGAL_ORIGIN` with the live defaults |

## Why `packages/ui` does not exist

The suggested layout includes a shared `ui` package. There is no component that
is identical in both origins: the legal site's UI is Svelte-island based, the
landing site's is static Astro markup with its own custom elements. Creating a
shared package would mean inventing a component neither site uses, which the
sharing policy forbids. Assets that are genuinely identical live in
`packages/assets`; the shared token scale lives in `packages/tokens`.
