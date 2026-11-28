import { WEB_ORIGIN } from '@mistral-clone/config'

/**
 * The captured documents contain absolute links to the landing site
 * (`https://mistral.ai/...`). Rewrite only that origin so a deployment can
 * point at a different landing host through `WEB_ORIGIN`. With the default the
 * substitution is a no-op and the served bytes stay identical to the origin.
 */
export function rewriteWebOrigin(html: string): string {
  if (WEB_ORIGIN === 'https://mistral.ai') return html
  return html.replaceAll('https://mistral.ai/', `${WEB_ORIGIN}/`)
}
