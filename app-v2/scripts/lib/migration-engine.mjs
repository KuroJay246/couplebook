import { documentChecksum, stableStringify } from './checksum.mjs'
import { validateMigrationPackage } from './migration-package.mjs'

function selectPackageFields(existing, proposed) {
  const selected = {}
  for (const key of Object.keys(proposed)) selected[key] = existing?.[key]
  return selected
}

function canMergeUserAccessDocument(path, existing, proposed) {
  if (!path.startsWith('users/')) return false
  const existingKeys = new Set(Object.keys(existing || {}))
  const proposedKeys = Object.keys(proposed)
  const missingKeys = proposedKeys.filter((key) => !existingKeys.has(key))
  const differingKeys = proposedKeys.filter((key) => existingKeys.has(key) && stableStringify(existing[key]) !== stableStringify(proposed[key]))
  const allowedDifferingKeys = new Set(['username', 'displayName'])
  return missingKeys.length > 0 && differingKeys.every((key) => allowedDifferingKeys.has(key))
}

export async function planMigrationOperations(db, migrationPackage) {
  const validation = validateMigrationPackage(migrationPackage)
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      operations: [],
      summary: { create: 0, alreadyCorrect: 0, mergeUserAccessFields: 0, conflict: 0, invalid: 0 },
    }
  }

  const operations = []
  const summary = { create: 0, alreadyCorrect: 0, mergeUserAccessFields: 0, conflict: 0, invalid: 0 }

  for (const document of migrationPackage.documents) {
    const snapshot = await db.doc(document.path).get()
    if (!snapshot.exists) {
      operations.push({ type: 'CREATE', path: document.path, document })
      summary.create += 1
      continue
    }

    const existingSelected = selectPackageFields(snapshot.data(), document.data)
    if (stableStringify(existingSelected) === stableStringify(document.data)) {
      operations.push({ type: 'ALREADY_CORRECT', path: document.path, document })
      summary.alreadyCorrect += 1
      continue
    }

    if (canMergeUserAccessDocument(document.path, snapshot.data(), document.data)) {
      operations.push({ type: 'MERGE_USER_ACCESS_FIELDS', path: document.path, document })
      summary.mergeUserAccessFields += 1
      continue
    }

    operations.push({
      type: 'CONFLICT',
      path: document.path,
      document,
      existingChecksum: documentChecksum(existingSelected),
      proposedChecksum: document.checksum,
    })
    summary.conflict += 1
  }

  return { ok: summary.conflict === 0 && summary.invalid === 0, errors: [], operations, summary }
}

export async function applyCreateOperations(db, operations) {
  const creates = operations.filter((operation) => operation.type === 'CREATE')
  for (let index = 0; index < creates.length; index += 400) {
    const batch = db.batch()
    for (const operation of creates.slice(index, index + 400)) {
      batch.create(db.doc(operation.path), operation.document.data)
    }
    await batch.commit()
  }
  const userMerges = operations.filter((operation) => operation.type === 'MERGE_USER_ACCESS_FIELDS')
  for (let index = 0; index < userMerges.length; index += 400) {
    const batch = db.batch()
    for (const operation of userMerges.slice(index, index + 400)) {
      batch.set(db.doc(operation.path), operation.document.data, { merge: true })
    }
    await batch.commit()
  }
  return {
    created: creates.length,
    mergedUserAccessFields: userMerges.length,
  }
}

export async function verifyMigrationDocuments(db, migrationPackage) {
  const failures = []
  const counts = {}
  for (const document of migrationPackage.documents) {
    const snapshot = await db.doc(document.path).get()
    if (!snapshot.exists) {
      failures.push({ path: document.path, reason: 'missing' })
      continue
    }
    const selected = selectPackageFields(snapshot.data(), document.data)
    if (stableStringify(selected) !== stableStringify(document.data)) {
      failures.push({ path: document.path, reason: 'mismatch' })
      continue
    }
    counts[document.domain] = (counts[document.domain] || 0) + 1
  }
  return { ok: failures.length === 0, failures, counts }
}
