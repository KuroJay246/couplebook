import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REQUIRED_PROJECT_ID = 'couplebook-97830'
export const PROHIBITED_PROJECT_ID = 'gathervibeshub'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'))
}

function readTextIfPresent(relativePath) {
  const fullPath = join(repoRoot, relativePath)
  if (!existsSync(fullPath)) return ''
  return readFileSync(fullPath, 'utf8')
}

function parseDotEnv(text) {
  const values = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!match) continue
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim()
  }
  return values
}

function isValidProjectId(value) {
  return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value)
}

function assertProjectId(value, label, errors) {
  if (!value) {
    errors.push(`${label} is missing`)
    return
  }
  if (!isValidProjectId(value)) {
    errors.push(`${label} is malformed`)
    return
  }
  if (value === PROHIBITED_PROJECT_ID) {
    errors.push(`${label} points to prohibited project ${PROHIBITED_PROJECT_ID}`)
    return
  }
  if (value !== REQUIRED_PROJECT_ID) {
    errors.push(`${label} must be ${REQUIRED_PROJECT_ID}`)
  }
}

function assertContainsNoProhibitedTarget(value, label, errors) {
  if (typeof value === 'string' && value.includes(PROHIBITED_PROJECT_ID)) {
    errors.push(`${label} contains prohibited project ${PROHIBITED_PROJECT_ID}`)
  }
}

export function validateFirebaseProject(options = {}) {
  const errors = []
  const expectedProjectId = options.expectedProjectId || process.env.EXPECTED_FIREBASE_PROJECT_ID || ''
  const commandProjectId = options.commandProjectId || ''

  assertProjectId(expectedProjectId, 'EXPECTED_FIREBASE_PROJECT_ID', errors)
  assertProjectId(commandProjectId, 'explicit command project', errors)

  const firebaserc = options.firebaserc || readJson('.firebaserc')
  assertProjectId(firebaserc?.projects?.default || '', '.firebaserc default project', errors)

  const firebaseJsonText = options.firebaseJsonText || readTextIfPresent('firebase.json')
  const firebaseAppV2JsonText = options.firebaseAppV2JsonText || readTextIfPresent('firebase.app-v2.json')
  assertContainsNoProhibitedTarget(firebaseJsonText, 'firebase.json', errors)
  assertContainsNoProhibitedTarget(firebaseAppV2JsonText, 'firebase.app-v2.json', errors)

  const appEnv = options.appEnv || parseDotEnv(readTextIfPresent('app-v2/.env.local'))
  const appProjectId = appEnv.VITE_FIREBASE_PROJECT_ID || ''
  assertProjectId(appProjectId, 'app-v2 Firebase project ID', errors)

  const authDomain = appEnv.VITE_FIREBASE_AUTH_DOMAIN || ''
  if (authDomain && !authDomain.includes(REQUIRED_PROJECT_ID)) {
    errors.push('app-v2 Firebase auth domain does not match required project')
  }
  assertContainsNoProhibitedTarget(authDomain, 'app-v2 Firebase auth domain', errors)

  const storageBucket = appEnv.VITE_FIREBASE_STORAGE_BUCKET || ''
  if (storageBucket && !storageBucket.includes(REQUIRED_PROJECT_ID)) {
    errors.push('app-v2 Firebase storage bucket does not match required project')
  }
  assertContainsNoProhibitedTarget(storageBucket, 'app-v2 Firebase storage bucket', errors)

  const deploymentTarget = options.deploymentProjectId || commandProjectId
  const migrationTarget = options.migrationProjectId || commandProjectId
  assertProjectId(deploymentTarget, 'deployment project target', errors)
  assertProjectId(migrationTarget, 'migration project target', errors)

  return {
    ok: errors.length === 0,
    errors,
    projectId: REQUIRED_PROJECT_ID,
  }
}

function getArgValue(name) {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1] || ''
  return ''
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const commandProjectId = getArgValue('--project')
  const result = validateFirebaseProject({ commandProjectId })

  if (!result.ok) {
    console.error('Firebase project preflight failed:')
    for (const error of result.errors) console.error(`- ${error}`)
    process.exit(1)
  }

  console.log(`Firebase project preflight passed for ${result.projectId}`)
}
