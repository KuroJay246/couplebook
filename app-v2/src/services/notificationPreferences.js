export const NOTIFICATION_PREFERENCE_KEYS = Object.freeze([
  'newMemories',
  'newMedia',
  'plans',
  'importantDates',
  'anniversaries',
  'birthdays',
  'specialMoments',
])

export function normalizeNotificationPreferences(value = {}) {
  const source = value && typeof value === 'object' ? value : {}
  return NOTIFICATION_PREFERENCE_KEYS.reduce((preferences, key) => {
    preferences[key] = source[key] === true
    return preferences
  }, {})
}
