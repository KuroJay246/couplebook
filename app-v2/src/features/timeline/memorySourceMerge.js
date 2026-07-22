import { isPlainObject, toTrimmedString } from '../../data/adapterUtils.js'

function parseSortTimestamp(dateValue) {
  const normalized = toTrimmedString(dateValue)
  if (!normalized) return null

  const timestamp = Date.parse(normalized)
  return Number.isNaN(timestamp) ? null : timestamp
}

function cloneRecord(record, overrides = {}) {
  return {
    ...record,
    ...overrides,
    tags: Array.isArray(overrides.tags || record.tags) ? [...(overrides.tags || record.tags)] : [],
    unknownFields: isPlainObject(overrides.unknownFields || record.unknownFields)
      ? { ...(overrides.unknownFields || record.unknownFields) }
      : {},
  }
}

function createSortEnvelope(record, mergeOrdinal) {
  return {
    mergeOrdinal,
    sortTimestamp: parseSortTimestamp(record.dateLabel),
    record: cloneRecord(record),
  }
}

function compareEnvelopes(left, right) {
  if (left.sortTimestamp !== null && right.sortTimestamp !== null && left.sortTimestamp !== right.sortTimestamp) {
    return right.sortTimestamp - left.sortTimestamp
  }

  if (left.sortTimestamp !== null && right.sortTimestamp === null) return -1
  if (left.sortTimestamp === null && right.sortTimestamp !== null) return 1

  return left.mergeOrdinal - right.mergeOrdinal
}

export function mergeLegacyMemorySources({
  baseMemories = [],
  customMemories = [],
  deletedIds = [],
  overrides = {},
} = {}) {
  const deletedIdSet = new Set(
    Array.isArray(deletedIds)
      ? deletedIds.flatMap((entry) => {
          const normalized = toTrimmedString(entry)
          return normalized ? [normalized] : []
        })
      : [],
  )
  const overrideMap = isPlainObject(overrides) ? overrides : {}
  const envelopes = []
  let mergeOrdinal = 0

  for (const memory of Array.isArray(baseMemories) ? baseMemories : []) {
    const memoryId = toTrimmedString(memory?.id)
    if (!memoryId || deletedIdSet.has(memoryId)) {
      continue
    }

    const override = overrideMap[memoryId]
    if (isPlainObject(override)) {
      envelopes.push(
        createSortEnvelope(
          cloneRecord(memory, {
            ...override,
            id: memoryId,
            source: 'local-override',
          }),
          mergeOrdinal,
        ),
      )
      mergeOrdinal += 1
      continue
    }

    envelopes.push(createSortEnvelope(memory, mergeOrdinal))
    mergeOrdinal += 1
  }

  for (const memory of Array.isArray(customMemories) ? customMemories : []) {
    const memoryId = toTrimmedString(memory?.id)
    if (!memoryId || deletedIdSet.has(memoryId)) {
      continue
    }

    envelopes.push(createSortEnvelope(memory, mergeOrdinal))
    mergeOrdinal += 1
  }

  return envelopes.sort(compareEnvelopes).map((entry) => entry.record)
}
