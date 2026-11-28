#!/usr/bin/env node
/**
 * Probes the origin's `?language=` handling and writes
 * reference/legal/language-variants.json.
 *
 * Finding: the parameter is a redirect/cache concern only — the rendered
 * document is byte-identical for en-US, en-GB and fr-FR, and there is no
 * language selector in the UI. The clone therefore serves one document and
 * lets static hosting ignore the query string.
 */
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..', '..')
const ORIGIN = (process.env.ORIGIN || 'https://legal.mistral.ai').replace(/\/$/, '')
const sha = (b) => createHash('sha256').update(b).digest('hex')

const canonical = await fetch(ORIGIN + '/terms/privacy-policy/')
const canonicalBuf = Buffer.from(await canonical.arrayBuffer())

const probes = []
for (const lang of ['en-US', 'en-GB', 'fr-FR', 'de-DE', '']) {
  const url = `/terms/privacy-policy${lang ? `?language=${lang}` : ''}`
  const first = await fetch(ORIGIN + url, { redirect: 'manual' })
  const followed = await fetch(ORIGIN + url, { redirect: 'follow' })
  const buf = Buffer.from(await followed.arrayBuffer())
  probes.push({
    url,
    status: first.status,
    location: first.headers.get('location') || null,
    finalUrl: followed.url,
    finalStatus: followed.status,
    bytes: buf.length,
    sha256: sha(buf),
    identicalToCanonical: sha(buf) === sha(canonicalBuf),
    title: (buf.toString('utf8').match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '',
  })
}

const html = canonicalBuf.toString('utf8')
const hasSelector = /<select[^>]*lang|aria-label="[^"]*language[^"]*"|role="combobox"/i.test(html)
writeFileSync(
  join(repo, 'reference/legal/language-variants.json'),
  JSON.stringify({ hasLanguageSelector: hasSelector, probes }, null, 2),
)
console.log(probes.map((p) => `${p.status} ${p.url} -> ${p.finalUrl} identical=${p.identicalToCanonical}`).join('\n'))
