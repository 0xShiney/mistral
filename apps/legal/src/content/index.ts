import type { LegalPage, NotFoundPage } from './types'

const modules = import.meta.glob<LegalPage>('./pages/*.json', { eager: true, import: 'default' })

/** Every rendered route in the crawled site map, sorted by path. */
export function allPages(): LegalPage[] {
  return Object.values(modules)
    .filter((page) => page.path !== '/404')
    .sort((a, b) => a.path.localeCompare(b.path))
}

/** A page by its canonical origin path (`/`, `/terms/get-started/`, …). */
export function pageByPath(path: string): LegalPage | undefined {
  return allPages().find((page) => page.path === path)
}

/** The captured origin 404 document. */
export function notFoundPage(): NotFoundPage | undefined {
  return Object.values(modules).find((page) => (page as unknown as NotFoundPage).path === '/404') as
    | unknown as NotFoundPage
    | undefined
}
