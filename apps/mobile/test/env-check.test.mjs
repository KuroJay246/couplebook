import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const repoRoot = path.resolve(import.meta.dirname, '..')
const scriptPath = path.join(repoRoot, 'scripts', 'check-env.mjs')

function runCheck({ envFile = '', extraEnv = {} } = {}) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'couplebook-mobile-env-'))
  try {
    writeFileSync(path.join(tempDir, '.env.local'), envFile)
    return spawnSync(process.execPath, [scriptPath], {
      cwd: tempDir,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ...extraEnv,
      },
      encoding: 'utf8',
    })
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

const validEnv = [
  'EXPO_PUBLIC_FIREBASE_API_KEY=test-api-key',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=couplebook-97830.firebaseapp.com',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID=couplebook-97830',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=couplebook-97830.appspot.com',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890',
  'EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456',
].join('\n')

test('mobile env check passes for the Couple Book project', () => {
  const result = runCheck({ envFile: validEnv })
  assert.equal(result.status, 0)
  assert.match(result.stdout, /Couple Book mobile env check passed/i)
})

test('mobile env check fails when required variables are missing', () => {
  const result = runCheck({ envFile: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID=couplebook-97830\n' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Missing variables/i)
  assert.doesNotMatch(result.stderr, /test-api-key|1234567890:web/i)
})

test('mobile env check rejects the prohibited Event Hub project', () => {
  const result = runCheck({
    envFile: validEnv
      .replace('EXPO_PUBLIC_FIREBASE_PROJECT_ID=couplebook-97830', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID=gathervibeshub')
      .replace('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=couplebook-97830.firebaseapp.com', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=gathervibeshub.firebaseapp.com')
      .replace('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=couplebook-97830.appspot.com', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=gathervibeshub.appspot.com'),
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /prohibited/i)
})

test('mobile env check rejects unsupported mobile write modes', () => {
  const result = runCheck({
    envFile: `${validEnv}\nEXPO_PUBLIC_FIREBASE_WRITE_MODE=always-write\n`,
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Unsupported write mode/i)
})
