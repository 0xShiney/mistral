#!/usr/bin/env node
/**
 * Root verify dispatcher.
 *   pnpm verify --app web --all
 *   pnpm verify --app legal --tier 1
 *   pnpm verify --app legal --all
 * Each app owns its adapter; this only routes the flags.
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const appIndex = args.indexOf('--app')
const app = appIndex >= 0 ? args[appIndex + 1] : null
const rest = args.filter((_, i) => i !== appIndex && i !== appIndex + 1)

if (!app || !['web', 'legal'].includes(app)) {
  console.error('usage: pnpm verify --app <web|legal> [--all|--tier 1|--tier 2] [--quick]')
  process.exit(2)
}

const script = app === 'web' ? ['tests/verify/run.mjs'] : ['tests/verify/legal.mjs']
const child = spawn(process.execPath, [...script, ...rest], {
  cwd: join(repo, 'apps', app),
  stdio: 'inherit',
  env: process.env,
})
child.on('exit', (code) => process.exit(code ?? 1))
