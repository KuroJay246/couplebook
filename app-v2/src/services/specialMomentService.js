import { readLegacySpecialMoment } from '../data/legacySpecialMomentAdapter.js'

export async function getLegacySpecialMoment(momentKey, options = {}) {
  const read = options.readLegacySpecialMoment || readLegacySpecialMoment
  return read(momentKey, options)
}
