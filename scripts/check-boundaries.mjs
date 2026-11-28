#!/usr/bin/env node
/**
 * Enforces the monorepo separation rules:
 *  1. apps/* must not import from another app (source, config or content).
 *  2. packages/* must not import from any app.
 *  3. apps may only import a package through its declared public entry point.
 *  4. no file is duplicated between apps/web/src/content and apps/legal/src/content.
 *  5. apps must not read each other's public/ or reference/ directories.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const fail = (rule, file, detail) => failures.push({ rule, file: relative(repo, file), detail })

const codeExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.astro', '.svelte', '.vue', '.json', '.css', '.md', '.mdx'])
const skipDirs = new Set(['node_modules', 'dist', '.astro', '.turbo', 'screenshots', 'source', 'baseline'])

function walk(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (codeExt.has(extname(entry.name))) out.push(full)
  }
  return out
}

const apps = readdirSync(join(repo, 'apps')).filter((a) => statSync(join(repo, 'apps', a)).isDirectory() && a !== 'node_modules')
const packages = existsSync(join(repo, 'packages'))
  ? readdirSync(join(repo, 'packages')).filter((p) => statSync(join(repo, 'packages', p)).isDirectory() && p !== 'node_modules')
  : []

// Declared public entries per package.
const packageEntries = new Map()
for (const pkg of packages) {
  const manifest = join(repo, 'packages', pkg, 'package.json')
  if (!existsSync(manifest)) continue
  const json = JSON.parse(readFileSync(manifest, 'utf8'))
  const exportsField = json.exports ?? {}
  const entries = new Set()
  for (const target of Object.values(exportsField)) {
    if (typeof target === 'string') entries.add(join(repo, 'packages', pkg, target))
  }
  packageEntries.set(json.name, { dir: join(repo, 'packages', pkg), entries })
}

// 1 + 5: cross-app imports and paths.
for (const app of apps) {
  const appDir = join(repo, 'apps', app)
  const siblings = apps.filter((a) => a !== app)
  for (const file of walk(appDir)) {
    const text = readFileSync(file, 'utf8')
    for (const other of siblings) {
      const patterns = [
        new RegExp(`(?:from|import|require)\\s*\\(?\\s*['"][^'"]*apps/${other}`, 'g'),
        new RegExp(`@mistral-clone/${other}`, 'g'),
        new RegExp(`\\.\\./\\.\\./${other}/`, 'g'),
      ]
      for (const rx of patterns) {
        if (rx.test(text)) fail('cross-app-import', file, `imports app "${other}"`)
      }
    }
  }
}

// 2 + 3: packages.
for (const [name, { dir, entries }] of packageEntries) {
  for (const file of walk(dir)) {
    const text = readFileSync(file, 'utf8')
    // Only import statements count; the assets package legitimately names app
    // public directories as copy targets (it never imports their code).
    if (/(?:from|import|require)\s*\(?\s*['"][^'"]*apps\//.test(text)) fail('package-imports-app', file, 'package imports an app directory')
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1]
      if (!spec.startsWith('@mistral-clone/')) continue
      const target = packageEntries.get(spec)
      if (!target) fail('unknown-package-import', file, spec)
      else if (target.dir !== dir) {
        const resolved = join(repo, 'packages', spec.replace('@mistral-clone/', ''))
        if (![...packageEntries.values()].some((p) => p.dir === resolved)) fail('unknown-package-import', file, spec)
      }
    }
  }
}

// 3: apps import packages only via public entries.
for (const app of apps) {
  for (const file of walk(join(repo, 'apps', app))) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](@mistral-clone\/[^'"]+)['"]/g)) {
      const spec = m[1]
      const meta = packageEntries.get(spec)
      if (!meta) {
        const base = spec.split('/').slice(0, 2).join('/')
        const anyMeta = packageEntries.get(base)
        if (anyMeta) fail('package-internal-path', file, `${spec} (use the package entry point)`)
        else fail('unknown-package-import', file, spec)
      } else {
        // Resolved spec must be one of the declared entry targets.
        const resolved = join(repo, 'packages', spec.replace('@mistral-clone/', ''), 'src')
        if (![...meta.entries].some((e) => e.startsWith(resolved))) fail('package-internal-path', file, spec)
      }
    }
  }
}

// 4: duplicated content files between the two apps.
const webContent = join(repo, 'apps/web/src/content')
const legalContent = join(repo, 'apps/legal/src/content')
if (existsSync(webContent) && existsSync(legalContent)) {
  const hash = (dir) => {
    const map = new Map()
    const walkAll = (d) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name)
        if (entry.isDirectory()) walkAll(full)
        else map.set(relative(dir, full).split(sep).join('/'), createHash('sha256').update(readFileSync(full)).digest('hex'))
      }
    }
    walkAll(dir)
    return map
  }
  const a = hash(webContent)
  const b = hash(legalContent)
  for (const [name, sum] of a) {
    if (b.has(name)) fail('duplicated-content', join(webContent, name), `same path also in legal (${sum.slice(0, 12)})`)
    for (const [otherName, otherSum] of b) {
      if (sum === otherSum && otherName !== name) fail('duplicated-content', join(webContent, name), `identical bytes to legal/${otherName}`)
    }
  }
}

if (failures.length) {
  console.error(`boundary check FAILED with ${failures.length} violation(s):`)
  for (const f of failures) console.error(`  [${f.rule}] ${f.file}: ${f.detail}`)
  process.exit(1)
}
console.log(`boundary check passed (${apps.length} apps, ${packages.length} packages)`)
