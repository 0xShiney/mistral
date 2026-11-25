/**
 * Route registry.
 *
 * Only the routes below are reproduced by this clone. Every other path that
 * appears in the original markup must keep pointing at the live site, otherwise
 * clicking it inside the clone lands on a 404. `route()` is the single place
 * that decides: cloned path -> local path, everything else -> absolute
 * https://mistral.ai URL (identical to the original's own link target).
 */
export const ORIGIN = 'https://mistral.ai'

export const ROUTES = {
  home: '/',
  research: '/research/',
} as const

export type RouteKey = keyof typeof ROUTES

const CLONED = new Set<string>(Object.values(ROUTES))

/** Local path for cloned routes, absolute original URL for everything else. */
export function route(path: string): string {
  if (!path.startsWith('/')) return path
  const clean = path.split('#')[0].split('?')[0]
  if (CLONED.has(clean)) return path
  return ORIGIN + path
}

/** `route()` applied to every root-relative href in a chunk of markup. */
export function rewriteHrefs(html: string): string {
  return html.replace(/href="(\/[^"]*)"/g, (_m, path: string) => `href="${route(path)}"`)
}
