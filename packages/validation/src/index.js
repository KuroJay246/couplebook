export function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    const normalized = toTrimmedString(entry)
    return normalized ? [normalized] : []
  })
}

export function isOneOf(value, allowedValues) {
  return allowedValues.includes(toTrimmedString(value).toLowerCase())
}
