# View transitions

- `meta-astro-view-transitions-enabled` = `true`
- `meta-astro-view-transitions-fallback` = `none`
- root scope: `view-transition-name: astro-<hash>`; the emitted `@layer astro` rules set
  `::view-transition-old/new(<scope>) { animation: none; opacity: 0; mix-blend-mode: normal }`
  and `::view-transition-group(<scope>) { animation: none }`

Measured tours (raw data in `view-transitions.json`):

| from | to | animations during swap | persisted/named elements | final path |
| --- | --- | --- | --- | --- |
| `/` | `/terms/get-started/` | 0 | 0 | `/` |
| `/terms/get-started/` | `/ai-governance/models/` | 0 | 0 | `/terms/get-started/` |
| `/ai-governance/models/` | `/ai-governance/models/voxtral-3/` | 0 | 0 | `/ai-governance/models/` |

The clone ships the origin's own router chunk and identical `data-astro-transition-scope`
markup, so the same instant swap, the same back/forward behaviour and the same script
re-initialisation after a swap apply.
