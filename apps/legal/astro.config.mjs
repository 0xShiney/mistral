// @ts-check
import { defineConfig } from 'astro/config'

/**
 * The legal origin is Astro 7.0.7, static output, with the original's compiled
 * View Transition router shipped as a self-hosted asset inside the captured
 * markup (see reference/legal/stack-report.md). This app therefore does not
 * rebuild the router: it renders the captured document verbatim, which keeps
 * the router, Svelte islands and inline bootstraps byte-identical.
 */
export default defineConfig({
  site: 'https://legal.mistral.ai',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    assets: '_astro',
    format: 'directory',
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  vite: {
    build: { cssMinify: false },
    server: { allowedHosts: true },
    preview: { allowedHosts: true },
  },
})
