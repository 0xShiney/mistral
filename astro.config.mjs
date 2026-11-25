// @ts-check
import { defineConfig } from 'astro/config'

// Static-first output, same as the original site. The original exposes
// `meta-astro-view-transitions-*` and ships ClientRouter, which is wired up in
// src/layouts/Base.astro.
export default defineConfig({
  site: 'https://mistral.ai',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // Keep the original asset layout: hashed files live under /_astro/.
    assets: '_astro',
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  vite: {
    // Cloud preview: the VM is reached through this chat's preview hostname.
    server: { allowedHosts: ['pv-b9b712126208-40cb556b-0ada-4f0f-a1b2-aa1b9e69d995.style.dev'] },
    preview: { allowedHosts: ['pv-b9b712126208-40cb556b-0ada-4f0f-a1b2-aa1b9e69d995.style.dev'] },
    build: {
      // The original stylesheet is already authored/minified by its own
      // pipeline; keep it byte-exact so no rule (or typo the site relies on)
      // is rewritten by a second minifier.
      cssMinify: false,
    },
  },
})
