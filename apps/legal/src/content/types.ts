/** Shape of the generated content JSON written by scripts/extract.mjs. */
export interface LegalPage {
  /** Canonical path as served by the origin, always trailing-slash except `/`. */
  path: string
  title: string
  description: string
  generator: string
  viewport: string
  ogTitle: string
  ogDescription: string
  ogUrl: string
  ogImage: string
  twitterCard: string
  headings: { level: number; id: string; text: string }[]
  links: { href: string; text: string }[]
  images: { src: string; alt: string }[]
  islands: { name: string; component: string; client: string; ssr: boolean }[]
  text: string
  /** The origin's complete server document (head, body, inline hydration data). */
  html: string
}

export interface NotFoundPage {
  path: '/404'
  status: number
  html: string
  text: string
}

export type RouteKind =
  | 'home'
  | 'terms-document'
  | 'models-index'
  | 'model-detail'
  | 'systems-index'
  | 'system-detail'

export function routeKind(path: string): RouteKind {
  if (path === '/') return 'home'
  if (path.startsWith('/terms/')) return 'terms-document'
  if (path === '/ai-governance/models/') return 'models-index'
  if (path.startsWith('/ai-governance/models/')) return 'model-detail'
  if (path === '/ai-governance/ai-systems/') return 'systems-index'
  return 'system-detail'
}
