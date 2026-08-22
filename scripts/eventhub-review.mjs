import { spawnSync } from 'node:child_process'
import path from 'node:path'

const repoRoot = process.cwd()
const scripts = [
  path.join(repoRoot, 'scripts', 'eventhub-status.mjs'),
  path.join(repoRoot, 'scripts', 'eventhub-compare.mjs'),
  path.join(repoRoot, 'scripts', 'check-event-hub-alignment.mjs'),
]

for (const script of scripts) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

console.log('Event Hub review passed.')
