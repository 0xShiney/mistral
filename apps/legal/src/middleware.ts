import { defineMiddleware } from 'astro:middleware'

/**
 * Dev-server parity for redirects that the deployed site gets from
 * `public/_redirects`. Static output ignores middleware, so this changes no
 * built bytes. Astro's own `redirects` config cannot cover both `/terms` and
 * `/terms/` without a route collision, hence the explicit map.
 */
const REDIRECTS: Record<string, string> = {
  '/terms': '/terms/get-started/',
  '/terms/': '/terms/get-started/',
}

export const onRequest = defineMiddleware((context, next) => {
  const target = REDIRECTS[context.url.pathname]
  if (target) return context.redirect(target, 301)
  return next()
})
