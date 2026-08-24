import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  REQUIRED_REFERENCE_BRANCHES,
  loadEventHubReferenceConfig,
  validateEventHubReference,
} from './lib/event-hub-reference.mjs'

const repoRoot = process.cwd()
const routeConfigPath = path.join(repoRoot, 'app-v2', 'src', 'app', 'routeConfig.js')
const packagePath = path.join(repoRoot, 'package.json')

const { configPath, config } = loadEventHubReferenceConfig(repoRoot)

if (!existsSync(configPath)) {
  console.error(`Missing Event Hub reference config: ${configPath}`)
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
const routeConfigSource = readFileSync(routeConfigPath, 'utf8')
const validation = validateEventHubReference(config, { cwd: repoRoot })

const currentBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim()
const currentHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()

const checks = [
  {
    label: 'Couple Book branch recorded',
    ok: true,
    detail: currentBranch,
  },
  {
    label: 'Reference repo exists',
    ok: validation.checks.find((entry) => entry.label === 'Reference repo exists')?.ok === true,
    detail: config.referenceRepo,
  },
  {
    label: 'Reference commit exists',
    ok: validation.checks.find((entry) => entry.label === 'Configured reference commit exists')?.ok === true,
    detail: config.lastInspectedCommit,
  },
  {
    label: 'Reference commit reachable from required branches',
    ok: validation.reachableBranches.length === REQUIRED_REFERENCE_BRANCHES.length,
    detail: validation.reachableBranches.join(', '),
  },
  {
    label: 'Couple Book Firebase project locked',
    ok: config.coupleBookFirebaseProject === 'couplebook-97830',
    detail: config.coupleBookFirebaseProject,
  },
  {
    label: 'Gather Firebase project prohibited',
    ok: Array.isArray(config.prohibitedFirebaseProjects) && config.prohibitedFirebaseProjects.includes('gathervibeshub'),
    detail: (config.prohibitedFirebaseProjects || []).join(', '),
  },
  {
    label: 'Protected route inventory includes /plans',
    ok: /path:\s*'\/plans'/.test(routeConfigSource),
    detail: '/plans',
  },
  {
    label: 'eventhub:status script registered',
    ok: pkg.scripts?.['eventhub:status'] === 'node scripts/eventhub-status.mjs',
    detail: pkg.scripts?.['eventhub:status'] || '(missing)',
  },
  {
    label: 'eventhub:compare script registered',
    ok: pkg.scripts?.['eventhub:compare'] === 'node scripts/eventhub-compare.mjs',
    detail: pkg.scripts?.['eventhub:compare'] || '(missing)',
  },
  {
    label: 'eventhub:review script registered',
    ok: pkg.scripts?.['eventhub:review'] === 'node scripts/eventhub-review.mjs',
    detail: pkg.scripts?.['eventhub:review'] || '(missing)',
  },
  {
    label: 'identity:check script registered',
    ok: pkg.scripts?.['identity:check'] === 'node scripts/check-couple-book-identity.mjs',
    detail: pkg.scripts?.['identity:check'] || '(missing)',
  },
  {
    label: 'Visual identity version recorded',
    ok: Boolean(String(config.visualIdentityVersion || '').trim()),
    detail: config.visualIdentityVersion || '(missing)',
  },
  {
    label: 'Intentional visual divergence declared',
    ok: Object.values(config.intentionalVisualDivergence || {}).every((value) => value === true),
    detail: JSON.stringify(config.intentionalVisualDivergence || {}),
  },
]

const failed = checks.filter((entry) => !entry.ok)

console.log('Couple Book Event Hub status')
console.log(`- branch: ${currentBranch}`)
console.log(`- local HEAD: ${currentHead}`)
console.log(`- engineering branch baseline: ${config.referenceEngineeringBranch}`)
console.log(`- reference repo: ${config.referenceRepo}`)
console.log(`- inspected commit: ${config.lastInspectedCommit}`)
console.log(`- firebase project: ${config.coupleBookFirebaseProject}`)
console.log(`- visual identity version: ${config.visualIdentityVersion}`)
for (const entry of checks) {
  console.log(`- ${entry.ok ? 'OK' : 'FAIL'} ${entry.label}: ${entry.detail}`)
}

if (failed.length > 0) {
  process.exit(1)
}
