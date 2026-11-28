#!/usr/bin/env node
/** Compares the current apps/web build against the pre-monorepo baseline. */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(repo, 'apps/web/dist')
const baseline = JSON.parse(readFileSync(join(repo, 'apps/web/baseline/build-manifest.json'), 'utf8'))

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

if (!existsSync(dist)) {
  console.error('apps/web/dist missing — run `pnpm --filter @mistral-clone/web build` first')
  process.exit(2)
}

// Compare content multisets: duplicate files (shared images) must keep their counts.
const key = (size, sha) => `${size}:${sha}`
const count = (items) => {
  const m = new Map()
  for (const it of items) m.set(it.key, (m.get(it.key) || 0) + 1)
  return m
}
const want = count(
  baseline.map((f) => ({ key: key(f.size, f.sha), file: f.f })),
)
const gotFiles = walk(dist).map((f) => {
  const buf = readFileSync(f)
  return { key: key(buf.length, createHash('sha256').update(buf).digest('hex')), file: relative(dist, f) }
})
const got = count(gotFiles)

let diffs = 0
for (const [k, n] of want) {
  const have = got.get(k) || 0
  if (have !== n) {
    diffs++
    const names = [...gotFiles, ...baseline.map((f) => ({ key: key(f.size, f.sha), file: f.f }))].filter((x) => x.key === k).map((x) => x.file)
    console.log(`COUNT MISMATCH ${k}: baseline ${n}, current ${have} — ${names.slice(0, 4).join(', ')}`)
  }
}
for (const [k, n] of got) if (!want.has(k)) (diffs++, console.log(`NEW ${k} ×${n}`))

console.log(`baseline ${baseline.length}, current ${gotFiles.length}, content multisets differing ${diffs}`)
process.exit(diffs ? 1 : 0)
