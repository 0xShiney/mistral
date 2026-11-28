/**
 * Route registry.
 *
 * Only the routes below are reproduced by this clone. Every other path that
 * appears in the original markup must keep pointing at the live site, otherwise
 * clicking it inside the clone lands on a 404. `route()` is the single place
 * that decides: cloned path -> local path, everything else -> absolute
 * https://mistral.ai URL (identical to the original's own link target).
 */
import { CUSTOMER_STORIES } from './customers'
import { INDUSTRY_VERTICALS } from './industry'

export const ORIGIN = 'https://mistral.ai'

export const ROUTES = {
  home: '/',
  research: '/research/',
  products: '/products/',
  vibe: '/products/vibe/',
  studio: '/products/studio/',
  forge: '/products/forge/',
  inference: '/cloud/inference/',
  compute: '/cloud/compute/',
  method: '/our-method/',
  useCases: '/use-cases/',
  sovereign: '/sovereign-ai/',
  customers: '/customers/',
  industry: '/industry/',

  // /use-cases/<slug>/ detail pages (see src/content/details.ts for metadata).
  'use-case/ai-fact-checking-for-live-broadcasts': '/use-cases/ai-fact-checking-for-live-broadcasts/',
  'use-case/ai-for-cad-workflows': '/use-cases/ai-for-cad-workflows/',
  'use-case/ai-for-code-review': '/use-cases/ai-for-code-review/',
  'use-case/ai-for-credit-analysis': '/use-cases/ai-for-credit-analysis/',
  'use-case/ai-for-customer-support': '/use-cases/ai-for-customer-support/',
  'use-case/ai-for-deal-sourcing': '/use-cases/ai-for-deal-sourcing/',
  'use-case/ai-for-industrial-site-monitoring': '/use-cases/ai-for-industrial-site-monitoring/',
  'use-case/ai-for-kyc-onboarding': '/use-cases/ai-for-kyc-onboarding/',
  'use-case/ai-for-logistics-document-extraction': '/use-cases/ai-for-logistics-document-extraction/',
  'use-case/ai-for-pandid-analysis': '/use-cases/ai-for-pandid-analysis/',
  'use-case/ai-for-penetration-testing': '/use-cases/ai-for-penetration-testing/',
  'use-case/ai-for-rfp-responses': '/use-cases/ai-for-rfp-responses/',
  'use-case/ai-guardrails-for-chatbots': '/use-cases/ai-guardrails-for-chatbots/',
  'use-case/physics-ai-for-aerodynamic-optimization': '/use-cases/physics-ai-for-aerodynamic-optimization/',
  'use-case/physics-ai-for-injection-molding-simulation': '/use-cases/physics-ai-for-injection-molding-simulation/',
  'use-case/voice-ai-for-customer-support': '/use-cases/voice-ai-for-customer-support/',
} as const

export type RouteKey = keyof typeof ROUTES

const CLONED = new Set<string>(Object.values(ROUTES))

// /customers/<slug>/ pages are generated from the capture, so their paths come
// from the registry rather than being listed here one by one.
for (const story of CUSTOMER_STORIES) CLONED.add(story.path)
for (const vertical of INDUSTRY_VERTICALS) CLONED.add(vertical.path)

/** Local path for cloned routes, absolute original URL for everything else. */
export function route(path: string): string {
  if (!path.startsWith('/')) return path
  const at = path.search(/[?#]/)
  const pathname = at === -1 ? path : path.slice(0, at)
  const suffix = at === -1 ? '' : path.slice(at)
  if (CLONED.has(pathname)) return path
  // Detail heroes and the industry CTAs link to a cloned route without the
  // trailing slash (`/use-cases`, `/customers?categories=energy`); the live site
  // 301s those to the slash form. Point them at the local route, query and hash
  // intact.
  if (CLONED.has(pathname + '/')) return pathname + '/' + suffix
  return ORIGIN + path
}

/** `route()` applied to every root-relative href in a chunk of markup. */
export function rewriteHrefs(html: string): string {
  return html.replace(/href="(\/[^"]*)"/g, (_m, path: string) => `href="${route(path)}"`)
}
