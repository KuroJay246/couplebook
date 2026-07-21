import crypto from 'node:crypto'

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

export function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex')
}

export function documentChecksum(data) {
  return sha256(data)
}

export function withoutKeys(value, keysToRemove) {
  if (Array.isArray(value)) return value.map((entry) => withoutKeys(entry, keysToRemove))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !keysToRemove.has(key))
      .map(([key, entry]) => [key, withoutKeys(entry, keysToRemove)]),
  )
}
