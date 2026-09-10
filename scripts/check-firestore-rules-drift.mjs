import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { validateFirebaseProject, REQUIRED_PROJECT_ID } from './assert-firebase-project.mjs'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const FIREBASE_RULES_API = 'https://firebaserules.googleapis.com/v1'
const GCLOUD_BINARY = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud'

function getArgValue(name, fallback = '') {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1] || fallback
  return fallback
}

function normalizeRules(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim()
}

function runGcloudAccessToken() {
  try {
    return execFileSync(GCLOUD_BINARY, ['auth', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    try {
      const command = process.platform === 'win32'
        ? ['powershell', ['-NoProfile', '-Command', 'gcloud auth print-access-token']]
        : ['sh', ['-lc', 'gcloud auth print-access-token']]
      return execFileSync(command[0], command[1], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
    } catch (fallbackError) {
      const stderr = String(fallbackError.stderr || error.stderr || '').trim()
      throw new Error(`Could not obtain a gcloud access token. Sign in with gcloud first. ${stderr}`)
    }
  }
}

async function fetchJson(url, { token, projectId }) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-goog-user-project': projectId,
    },
  })
  const body = await response.text()
  let parsed = null
  try {
    parsed = body ? JSON.parse(body) : null
  } catch {
    parsed = null
  }
  if (!response.ok) {
    const message = parsed?.error?.message || body || response.statusText
    throw new Error(`Rules API read failed (${response.status}): ${message}`)
  }
  return parsed
}

async function readDeployedFirestoreRules({ projectId, token }) {
  const release = await fetchJson(`${FIREBASE_RULES_API}/projects/${projectId}/releases/cloud.firestore`, { projectId, token })
  const rulesetName = release?.rulesetName || ''
  if (!rulesetName) throw new Error('The cloud.firestore release did not include a rulesetName.')
  const ruleset = await fetchJson(`${FIREBASE_RULES_API}/${rulesetName}`, { projectId, token })
  const firestoreRulesFile = ruleset?.source?.files?.find((file) => file.name === 'firestore.rules')
  if (!firestoreRulesFile?.content) throw new Error('The deployed Firestore ruleset did not include firestore.rules content.')
  return {
    releaseName: release.name || '',
    rulesetName,
    createTime: ruleset.createTime || '',
    content: firestoreRulesFile.content,
  }
}

function evaluateMediaIndexCoverage(content) {
  const checks = [
    {
      name: 'mediaItems collection path',
      ok: /match\s+\/mediaItems\/\{mediaId\}/.test(content),
    },
    {
      name: 'mediaItems active-member read',
      ok: /match\s+\/mediaItems\/\{mediaId\}\s*\{[\s\S]*?allow\s+get,\s*list:\s*if\s+isActiveCoupleMember\(coupleId\)/.test(content),
    },
    {
      name: 'mediaSync google-drive path',
      ok: /match\s+\/mediaSync\/\{provider\}/.test(content),
    },
    {
      name: 'mediaSync google-drive active-member read',
      ok: /match\s+\/mediaSync\/\{provider\}\s*\{[\s\S]*?allow\s+get,\s*list:\s*if\s+isActiveCoupleMember\(coupleId\)\s*&&\s*provider\s*==\s*'google-drive'/.test(content),
    },
  ]
  return checks
}

async function main() {
  const projectId = getArgValue('--project', REQUIRED_PROJECT_ID)
  const expected = process.env.EXPECTED_FIREBASE_PROJECT_ID || REQUIRED_PROJECT_ID
  const projectGuard = validateFirebaseProject({
    commandProjectId: projectId,
    expectedProjectId: expected,
  })
  if (!projectGuard.ok) {
    throw new Error(`Firebase project guard failed: ${projectGuard.errors.join('; ')}`)
  }

  const token = runGcloudAccessToken()
  const deployed = await readDeployedFirestoreRules({ projectId, token })
  const localRules = normalizeRules(readFileSync(join(repoRoot, 'firestore.rules'), 'utf8'))
  const deployedRules = normalizeRules(deployed.content)
  const localMediaChecks = evaluateMediaIndexCoverage(localRules)
  const deployedMediaChecks = evaluateMediaIndexCoverage(deployedRules)
  const missingLocal = localMediaChecks.filter((check) => !check.ok)
  const missingDeployed = deployedMediaChecks.filter((check) => !check.ok)
  const exactMatch = localRules === deployedRules

  console.log(`Firestore rules drift check for ${projectId}`)
  console.log(`Release: ${deployed.releaseName}`)
  console.log(`Ruleset: ${deployed.rulesetName}`)
  console.log(`Ruleset created: ${deployed.createTime || 'unknown'}`)
  console.log(`Local/deployed exact match: ${exactMatch ? 'yes' : 'no'}`)

  if (missingLocal.length) {
    console.error('Local firestore.rules is missing required media-index coverage:')
    for (const check of missingLocal) console.error(`- ${check.name}`)
    process.exit(1)
  }

  if (missingDeployed.length) {
    console.error('Deployed Firestore rules are missing required media-index coverage:')
    for (const check of missingDeployed) console.error(`- ${check.name}`)
    console.error('Owner approval is required before deploying updated Firestore rules.')
    process.exit(1)
  }

  console.log('Deployed Firestore rules include required media-index read coverage.')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
