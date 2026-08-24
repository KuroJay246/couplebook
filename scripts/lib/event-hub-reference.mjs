import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const REQUIRED_REFERENCE_BRANCHES = Object.freeze([
  'refs/heads/main',
  'refs/remotes/origin/main',
])

export const REQUIRED_REFERENCE_FILES = Object.freeze([
  'src/layout/AppShell.jsx',
  'src/utils/navigation.js',
  'src/components/BrandMark.jsx',
  'src/App.jsx',
  'src/styles.css',
  'src/lib/firebase.js',
  'src/auth/AuthProvider.jsx',
  'scripts/product/routeInventory.mjs',
])

export function loadEventHubReferenceConfig(repoRoot = process.cwd()) {
  const configPath = path.join(repoRoot, 'config', 'event-hub-reference.json')
  return {
    configPath,
    config: JSON.parse(readFileSync(configPath, 'utf8')),
  }
}

function runGit(referenceRepo, args) {
  return execFileSync('git', ['-C', referenceRepo, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function gitSucceeds(referenceRepo, args) {
  try {
    runGit(referenceRepo, args)
    return true
  } catch {
    return false
  }
}

export function readReferenceFileAtCommit(referenceRepo, commit, filePath) {
  return runGit(referenceRepo, ['show', `${commit}:${filePath}`])
}

export function validateEventHubReference(config, { cwd = process.cwd() } = {}) {
  const errors = []
  const checks = []
  const referenceRepoExists = existsSync(config.referenceRepo)
  const sameRepo = path.resolve(config.referenceRepo).toLowerCase() === path.resolve(cwd).toLowerCase()
  const commitExists = referenceRepoExists && gitSucceeds(config.referenceRepo, ['cat-file', '-e', `${config.lastInspectedCommit}^{commit}`])
  const reachableBranches = commitExists
    ? REQUIRED_REFERENCE_BRANCHES.filter((branchRef) =>
        gitSucceeds(config.referenceRepo, ['merge-base', '--is-ancestor', config.lastInspectedCommit, branchRef]),
      )
    : []
  const requiredFiles = REQUIRED_REFERENCE_FILES.map((filePath) => ({
    filePath,
    readable: commitExists && gitSucceeds(config.referenceRepo, ['show', `${config.lastInspectedCommit}:${filePath}`]),
  }))

  checks.push({
    label: 'Reference repo exists',
    ok: referenceRepoExists,
    detail: config.referenceRepo,
  })
  if (!referenceRepoExists) {
    errors.push(`Reference repo not found: ${config.referenceRepo}`)
  }

  checks.push({
    label: 'Reference repo is separate from Couple Book',
    ok: !sameRepo,
    detail: config.referenceRepo,
  })
  if (sameRepo) {
    errors.push('Reference repo must not be the Couple Book repository.')
  }

  checks.push({
    label: 'Couple Book Firebase project locked',
    ok: config.coupleBookFirebaseProject === 'couplebook-97830',
    detail: config.coupleBookFirebaseProject,
  })
  if (config.coupleBookFirebaseProject !== 'couplebook-97830') {
    errors.push('Couple Book Firebase project must remain couplebook-97830.')
  }

  checks.push({
    label: 'Gather Firebase project prohibited',
    ok: Array.isArray(config.prohibitedFirebaseProjects) && config.prohibitedFirebaseProjects.includes('gathervibeshub'),
    detail: (config.prohibitedFirebaseProjects || []).join(', '),
  })
  if (!config.prohibitedFirebaseProjects?.includes('gathervibeshub')) {
    errors.push('gathervibeshub must remain prohibited in Couple Book config.')
  }

  checks.push({
    label: 'Configured reference commit exists',
    ok: commitExists,
    detail: config.lastInspectedCommit,
  })
  if (!commitExists) {
    errors.push(`Configured reference commit is missing: ${config.lastInspectedCommit}`)
  }

  checks.push({
    label: 'Configured reference commit is reachable from required branches',
    ok: reachableBranches.length === REQUIRED_REFERENCE_BRANCHES.length,
    detail: reachableBranches.length ? reachableBranches.join(', ') : '(not reachable)',
  })
  if (commitExists && reachableBranches.length !== REQUIRED_REFERENCE_BRANCHES.length) {
    errors.push(
      `Configured reference commit ${config.lastInspectedCommit} must be reachable from ${REQUIRED_REFERENCE_BRANCHES.join(', ')}.`,
    )
  }

  for (const requiredFile of requiredFiles) {
    checks.push({
      label: `Reference file readable at commit: ${requiredFile.filePath}`,
      ok: requiredFile.readable,
      detail: requiredFile.filePath,
    })
    if (commitExists && !requiredFile.readable) {
      errors.push(`Reference file is not readable from ${config.lastInspectedCommit}: ${requiredFile.filePath}`)
    }
  }

  return {
    errors,
    checks,
    reachableBranches,
    requiredFiles,
  }
}
