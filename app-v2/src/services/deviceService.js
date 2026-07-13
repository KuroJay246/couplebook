import { FIRESTORE_SOURCE, createCompatibilityResult } from '../data/adapterUtils.js'

export function buildDeviceDocumentPath(deviceId) {
  const normalizedId = String(deviceId || '').trim()
  if (!normalizedId) throw new Error('A deviceId is required before building device paths.')
  return `devices/${normalizedId}`
}

export async function getRegisteredDevice() {
  return createCompatibilityResult({
    status: 'unavailable',
    source: FIRESTORE_SOURCE,
    warnings: ['Device registration remains disabled in app-v2 until a trusted backend session-management flow exists.'],
  })
}
