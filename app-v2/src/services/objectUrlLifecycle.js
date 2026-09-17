export function createManagedObjectUrl(source) {
  if (typeof URL?.createObjectURL !== 'function') {
    return { url: '', revoke: () => false }
  }

  try {
    const createUrl = URL.createObjectURL.bind(URL)
    const url = createUrl(source)
    let active = true

    return {
      url,
      revoke() {
        if (!active || !url || typeof URL?.revokeObjectURL !== 'function') return false
        active = false
        try {
          URL.revokeObjectURL(url)
        } catch {
          // Best-effort cleanup only.
        }
        return true
      },
    }
  } catch {
    return { url: '', revoke: () => false }
  }
}

export function createObjectUrlRegistry() {
  const managedUrls = new Map()

  return {
    create(source) {
      const managed = createManagedObjectUrl(source)
      if (managed.url) managedUrls.set(managed.url, managed)
      return managed.url
    },
    revoke(url) {
      const managed = managedUrls.get(url)
      if (!managed) return false
      const revoked = managed.revoke()
      managedUrls.delete(url)
      return revoked
    },
    revokeAll() {
      for (const managed of managedUrls.values()) {
        managed.revoke()
      }
      managedUrls.clear()
    },
    has(url) {
      return managedUrls.has(url)
    },
  }
}
