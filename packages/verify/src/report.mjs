import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Collects check results and writes the markdown + JSON report pair.
 * A check is { id, group, ok, detail } — detail carries the measured numbers.
 */
export function createReport({ app, origin, clone, tier, meta = {} }) {
  const started = new Date()
  const checks = []

  function check(group, id, ok, detail = '') {
    checks.push({ group, id, ok: Boolean(ok), detail })
    return ok
  }

  function equal(group, id, actual, expected, tolerance = 0) {
    const ok =
      typeof actual === 'number' && typeof expected === 'number'
        ? Math.abs(actual - expected) <= tolerance
        : JSON.stringify(actual) === JSON.stringify(expected)
    check(group, id, ok, ok ? `match` : `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
    return ok
  }

  function summary() {
    const passed = checks.filter((c) => c.ok).length
    return { total: checks.length, passed, failed: checks.length - passed }
  }

  function markdown() {
    const { total, passed, failed } = summary()
    const groups = [...new Set(checks.map((c) => c.group))]
    const lines = [
      `# Verification report — ${app}`,
      '',
      `- original: ${origin}`,
      `- clone: ${clone}`,
      `- tier: ${tier}`,
      ...Object.entries(meta).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`),
      `- run: ${started.toISOString()}`,
      `- result: **${passed}/${total} passed, ${failed} failed**`,
      '',
      '| group | check | result | detail |',
      '| --- | --- | --- | --- |',
      ...checks.map(
        (c) =>
          `| ${c.group} | ${c.id.replaceAll('|', '\\|')} | ${c.ok ? 'PASS' : 'FAIL'} | ${String(c.detail).replaceAll('|', '\\|').slice(0, 240)} |`,
      ),
      '',
      ...groups
        .map((g) => {
          const inGroup = checks.filter((c) => c.group === g)
          const bad = inGroup.filter((c) => !c.ok)
          return `## ${g}\n\n${inGroup.length - bad.length}/${inGroup.length} passed${bad.length ? `\n\nFailures:\n${bad.map((b) => `- ${b.id}: ${b.detail}`).join('\n')}` : ''}\n`
        })
        .join('\n'),
    ]
    return lines.join('\n')
  }

  function write(mdPath) {
    const jsonPath = mdPath.replace(/\.md$/, '.json')
    const payload = { app, origin, clone, tier, meta, started: started.toISOString(), ...summary(), checks }
    mkdirSync(dirname(mdPath), { recursive: true })
    writeFileSync(mdPath, markdown())
    writeFileSync(jsonPath, JSON.stringify(payload, null, 2))
    return summary()
  }

  return { check, equal, summary, markdown, write, checks }
}
