#!/usr/bin/env node
/**
 * Copies the shared asset set (files that are byte-identical in both originals)
 * into each app's `public/`, then verifies every destination checksum.
 *
 * Shared fonts were verified against both live sites:
 *   /fonts/inter/Inter-VariableFont.ttf             (web = legal)
 *   /fonts/alt-mistral/ALTMistral-Medium.woff2      (web = legal)
 *   /fonts/alt-mistral/ALTMistral-Regular.woff2     (web = legal)
 * Everything else stays app-local; see docs/sharing-decisions.md.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..')
const source = join(here, 'assets')
const targets = ['apps/web/public', 'apps/legal/public'].map((p) => join(repo, p))

function walk(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full, base))
    else out.push(relative(base, full))
  }
  return out
}

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const files = walk(source)
const manifest = {}

for (const target of targets) {
  for (const rel of files) {
    const dest = join(target, rel)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(join(source, rel), dest)
    const got = sha(dest)
    const want = sha(join(source, rel))
    if (got !== want) {
      console.error(`checksum mismatch: ${dest}`)
      process.exit(1)
    }
    manifest[`${relative(repo, dest)}`] = got
  }
  if (!existsSync(target)) {
    console.error(`missing app public dir: ${target}`)
    process.exit(1)
  }
}

console.log(`synced ${files.length} shared files into ${targets.length} apps`)
for (const [file, hash] of Object.entries(manifest).sort()) console.log(`  ${hash.slice(0, 12)}  ${file}`)
