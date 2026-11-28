/**
 * Cross-site origins. Each app renders links to the other site through these
 * values, never by importing the other app. Defaults are the live origins so a
 * parity run compares against the same absolute URLs as the original.
 */
export const WEB_ORIGIN = (process.env.WEB_ORIGIN ?? 'https://mistral.ai').replace(/\/$/, '')
export const LEGAL_ORIGIN = (process.env.LEGAL_ORIGIN ?? 'https://legal.mistral.ai').replace(/\/$/, '')

/** Absolute URL on the landing site. */
export function webUrl(path = '/'): string {
  return `${WEB_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

/** Absolute URL on the legal site. */
export function legalUrl(path = '/'): string {
  return `${LEGAL_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
