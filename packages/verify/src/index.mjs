export { createReport } from './report.mjs'

/** Normalizes text the way both DOMs are compared: collapse whitespace, keep punctuation. */
export function normalizeText(text) {
  return String(text ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Character-level drift between two strings, for text parity failures. */
export function textDiff(actual, expected) {
  const a = normalizeText(actual)
  const b = normalizeText(expected)
  if (a === b) return null
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  const context = (s) => s.slice(Math.max(0, i - 40), i + 80)
  return {
    index: i,
    actual: context(a),
    expected: context(b),
    actualLength: a.length,
    expectedLength: b.length,
  }
}

/** Sorts normalize pathname keys: trailing slash and case are significant in the original. */
export function routeKey(url) {
  return new URL(url, 'https://x.invalid').pathname.replace(/\/index\.html$/, '/')
}
