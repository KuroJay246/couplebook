import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateFirebaseProject, REQUIRED_PROJECT_ID } from './assert-firebase-project.mjs'
import {
  DRIVE_BACKEND_CAPABILITIES,
  DRIVE_BACKEND_ENDPOINTS,
} from '../packages/drive-contracts/src/index.js'
import {
  listDriveBackendCapabilities,
  listDriveBackendEndpointPaths,
} from '../packages/drive-backend/src/index.js'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

const REQUIRED_ENV_KEYS = Object.freeze([
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GOOGLE_CLIENT_ID',
])

const TRUSTED_BACKEND_ENDPOINTS = Object.freeze(Object.values(DRIVE_BACKEND_ENDPOINTS))
const TRUSTED_BACKEND_CAPABILITIES = DRIVE_BACKEND_CAPABILITIES

function parseDotEnv(text) {
  const values = {}
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!match) continue
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim()
  }
  return values
}

function readEnv(relativePath) {
  const fullPath = join(repoRoot, relativePath)
  if (!existsSync(fullPath)) return {}
  return parseDotEnv(readFileSync(fullPath, 'utf8'))
}

function runCommand(command, args) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, output: stdout.trim() }
  } catch (error) {
    const output = [error.stdout, error.stderr]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join('\n')
    return { ok: false, output }
  }
}

export function summarizeRulesDrift(output = '') {
  const text = String(output || '')
  return Object.freeze({
    exactMatch: /Local\/deployed exact match:\s*yes/i.test(text),
    missingMediaCoverage: /missing required media-index coverage/i.test(text),
    ownerApprovalRequired: /Owner approval is required/i.test(text),
    ruleset: /Ruleset:\s*(.+)/i.exec(text)?.[1]?.trim() || '',
    release: /Release:\s*(.+)/i.exec(text)?.[1]?.trim() || '',
    created: /Ruleset created:\s*(.+)/i.exec(text)?.[1]?.trim() || '',
  })
}

export function evaluateMediaBackendReadiness({
  backendCapabilitiesImplemented = [],
  appEnv = {},
  backendEndpointsImplemented = [],
  firebaseProject = { ok: false, errors: ['Firebase project guard was not run.'] },
  rulesDrift = {},
} = {}) {
  const missingEnvKeys = REQUIRED_ENV_KEYS.filter((key) => !appEnv[key])
  const implementedEndpoints = new Set(backendEndpointsImplemented)
  const missingBackendEndpoints = TRUSTED_BACKEND_ENDPOINTS.filter((endpoint) => !implementedEndpoints.has(endpoint))
  const implementedCapabilities = new Set(backendCapabilitiesImplemented)
  const missingBackendCapabilities = TRUSTED_BACKEND_CAPABILITIES.filter((capability) => !implementedCapabilities.has(capability))
  const blockers = []
  const warnings = []

  if (!firebaseProject.ok) {
    blockers.push(...firebaseProject.errors.map((error) => `Firebase project guard: ${error}`))
  }

  if (missingEnvKeys.length) {
    warnings.push(`Local app env is missing configured keys: ${missingEnvKeys.join(', ')}`)
  }

  if (rulesDrift.missingMediaCoverage) {
    blockers.push('Deployed Firestore rules are missing media-index read coverage for active couple members.')
  } else if (rulesDrift.exactMatch !== true) {
    warnings.push('Local and deployed Firestore rules are not an exact match.')
  }

  if (missingBackendEndpoints.length) {
    blockers.push(`Trusted Drive backend endpoints are not implemented locally: ${missingBackendEndpoints.join(', ')}`)
  }

  if (missingBackendCapabilities.length) {
    blockers.push(`Trusted Drive backend local handlers are incomplete: ${missingBackendCapabilities.join(', ')}`)
  }

  blockers.push('Persistent Drive OAuth refresh storage, Drive Changes processing, webhook handling, and partner upload mediation require an approved trusted backend deployment plan.')

  return Object.freeze({
    status: blockers.length ? 'blocked' : 'ready',
    projectId: REQUIRED_PROJECT_ID,
    env: Object.freeze({
      requiredKeyCount: REQUIRED_ENV_KEYS.length,
      configuredKeyCount: REQUIRED_ENV_KEYS.length - missingEnvKeys.length,
      missingKeys: Object.freeze(missingEnvKeys),
    }),
    rules: Object.freeze({
      exactMatch: rulesDrift.exactMatch === true,
      missingMediaCoverage: rulesDrift.missingMediaCoverage === true,
      ownerApprovalRequired: rulesDrift.ownerApprovalRequired === true,
      ruleset: rulesDrift.ruleset || '',
      release: rulesDrift.release || '',
      created: rulesDrift.created || '',
    }),
    backend: Object.freeze({
      requiredCapabilities: TRUSTED_BACKEND_CAPABILITIES,
      implementedCapabilities: Object.freeze([...implementedCapabilities]),
      missingCapabilities: Object.freeze(missingBackendCapabilities),
      requiredEndpoints: TRUSTED_BACKEND_ENDPOINTS,
      implementedEndpoints: Object.freeze([...implementedEndpoints]),
      missingEndpoints: Object.freeze(missingBackendEndpoints),
      costBoundary: 'Do not deploy trusted Drive backend hosting, enable billing, or store Google refresh credentials until the owner approves the exact plan.',
    }),
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
  })
}

function printReport(report) {
  console.log('Couple Book media backend readiness')
  console.log(`Project: ${report.projectId}`)
  console.log(`Status: ${report.status.toUpperCase()}`)
  console.log(`Env configured keys: ${report.env.configuredKeyCount}/${report.env.requiredKeyCount}`)
  console.log(`Rules release: ${report.rules.release || 'unknown'}`)
  console.log(`Ruleset: ${report.rules.ruleset || 'unknown'}`)
  console.log(`Ruleset created: ${report.rules.created || 'unknown'}`)
  console.log(`Rules exact match: ${report.rules.exactMatch ? 'yes' : 'no'}`)
  console.log(`Rules media-index coverage deployed: ${report.rules.missingMediaCoverage ? 'no' : 'yes or not proven missing'}`)
  console.log(`Trusted backend endpoints implemented: ${report.backend.implementedEndpoints.length}/${report.backend.requiredEndpoints.length}`)
  console.log(`Trusted backend local handler capabilities implemented: ${report.backend.implementedCapabilities.length}/${report.backend.requiredCapabilities.length}`)

  if (report.warnings.length) {
    console.log('\nWarnings:')
    for (const warning of report.warnings) console.log(`- ${warning}`)
  }

  if (report.blockers.length) {
    console.log('\nOWNER DECISION REQUIRED / Blockers:')
    for (const blocker of report.blockers) console.log(`- ${blocker}`)
  }

  console.log(`\nCost boundary: ${report.backend.costBoundary}`)
}

export function runMediaBackendReadinessCheck() {
  const appEnv = readEnv('app-v2/.env.local')
  const projectGuard = validateFirebaseProject({
    commandProjectId: REQUIRED_PROJECT_ID,
    expectedProjectId: REQUIRED_PROJECT_ID,
    appEnv,
  })
  const rulesCommand = runCommand(process.execPath, ['scripts/check-firestore-rules-drift.mjs', '--project', REQUIRED_PROJECT_ID])
  const rulesDrift = summarizeRulesDrift(rulesCommand.output)

  return evaluateMediaBackendReadiness({
    appEnv,
    backendCapabilitiesImplemented: listDriveBackendCapabilities(),
    backendEndpointsImplemented: listDriveBackendEndpointPaths(),
    firebaseProject: projectGuard,
    rulesDrift,
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = runMediaBackendReadinessCheck()
  printReport(report)
  process.exit(report.status === 'ready' ? 0 : 1)
}
