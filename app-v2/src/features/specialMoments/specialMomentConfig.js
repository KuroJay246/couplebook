export const specialMomentConfig = Object.freeze({
  birthday: Object.freeze({
    key: 'birthday',
    route: '/birthday',
    label: 'Birthday',
    title: 'Birthday moment',
    accent: 'gold',
    accentDescription: 'parchment, muted gold, and clay',
    migrationState: 'runtime content',
    contentConnection: 'development-only',
    summary: 'Birthday letter, photos, and keepsakes.',
    runtimeSubtitle: 'Private birthday chapter.',
      unavailableTitle: 'Your birthday message is being kept private.',
      unavailableDescription: 'This private chapter is not available on this device right now.',
      unavailableMediaNote: 'Media is not available right now.',
  }),
  valentine: Object.freeze({
    key: 'valentine',
    route: '/valentine',
    label: 'Valentine',
    title: 'Valentine moment',
    accent: 'rose',
    accentDescription: 'parchment, dusty rose, and restrained oxblood',
    migrationState: 'runtime content',
    contentConnection: 'development-only',
    summary: 'Valentine letter and keepsakes.',
    runtimeSubtitle: 'Private Valentine chapter.',
      unavailableTitle: 'Your Valentine letter is being kept private.',
      unavailableDescription: 'This protected correspondence is not available on this device right now.',
      unavailableMediaNote: 'Media is not available right now.',
  }),
  confession: Object.freeze({
    key: 'confession',
    route: '/confession',
    label: 'Confession',
    title: 'Confession moment',
    accent: 'oxblood',
    accentDescription: 'ink, parchment, and oxblood',
    migrationState: 'runtime content',
    contentConnection: 'development-only',
    summary: 'Private confession and saved words.',
    runtimeSubtitle: 'Private confession chapter.',
      unavailableTitle: 'Your confession is being kept private.',
      unavailableDescription: 'This protected note is not available on this device right now.',
      unavailableMediaNote: 'Media is not available right now.',
  }),
})

export function getSpecialMomentConfig(momentKey) {
  return specialMomentConfig[momentKey] || null
}

export function isConfiguredSpecialMoment(momentKey) {
  return Boolean(getSpecialMomentConfig(momentKey))
}
