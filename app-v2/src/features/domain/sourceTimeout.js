const DEFAULT_SOURCE_TIMEOUT_MS = 12000

export function createSourceTimeoutError(domainKey) {
  const label = String(domainKey || 'This section').replace(/[-_]+/g, ' ')
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1)
  return new Error(`${displayLabel} is taking too long to load. Check the connection and try again.`)
}

export function withSourceTimeout(promise, domainKey, timeoutMs = DEFAULT_SOURCE_TIMEOUT_MS) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise

  let timeoutId = null
  const timeout = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => reject(createSourceTimeoutError(domainKey)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== null) globalThis.clearTimeout(timeoutId)
  })
}
