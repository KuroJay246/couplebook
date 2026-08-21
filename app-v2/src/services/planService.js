import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'
import { db } from '../lib/firebase.js'
import { plansPath } from './firestorePaths.js'
import { readCollection, requireSchemaVersion, safeString } from './firestoreReaders.js'

const PLAN_STATUSES = new Set(['idea', 'planned', 'completed', 'archived'])
const PLAN_CATEGORIES = new Set([
  'Date Idea',
  'Place to Visit',
  'Restaurant',
  'Movie or Show',
  'Goal',
  'Gift or Surprise',
  'Bucket List',
  'Other',
])

function normalizeTimestampLabel(value) {
  if (!value) return ''
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value === 'string') return value
  return ''
}

export function normalizePlan(id, data, warnings) {
  if (!requireSchemaVersion(data, warnings)) return null
  const status = safeString(data.status, 20)
  const category = safeString(data.category, 40)
  if (!PLAN_STATUSES.has(status) || !PLAN_CATEGORIES.has(category)) {
    warnings.push('A plan used an unsupported status or category and was withheld.')
    return null
  }
  return {
    id,
    title: safeString(data.title, 160),
    category,
    status,
    targetDate: safeString(data.targetDate, 10),
    notes: safeString(data.notes, 1200),
    createdBy: safeString(data.createdBy, 120),
    updatedBy: safeString(data.updatedBy, 120),
    createdAt: normalizeTimestampLabel(data.createdAt),
    updatedAt: normalizeTimestampLabel(data.updatedAt),
    convertedMemoryId: safeString(data.convertedMemoryId, 120),
    revision: Number.isInteger(data.revision) && data.revision > 0 ? data.revision : 0,
    schemaVersion: data.schemaVersion,
  }
}

export async function getPlansForCouple(coupleId, options = {}) {
  const result = await readCollection({
    firestore: options.firestore || db,
    path: plansPath(coupleId),
    getCollection: options.getCollection,
    normalizeEntry: normalizePlan,
  })

  return createCompatibilityResult({
    status: result.status,
    source: FIRESTORE_SOURCE,
    data: {
      plans: result.data?.entries || [],
    },
    warnings: result.warnings,
  })
}
