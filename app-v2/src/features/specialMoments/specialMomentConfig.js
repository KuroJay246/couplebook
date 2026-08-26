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
    summary: 'A protected birthday chapter can now read runtime sections without putting private text in the React bundle.',
    runtimeSubtitle: 'This chapter appears only from an approved runtime source.',
      unavailableTitle: 'Your birthday message is being kept private.',
      unavailableDescription: 'This private chapter is not available on this device right now.',
      unavailableMediaNote: 'Private companion media will appear when it is available to your account.',
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
    summary: 'A protected Valentine chapter can now read runtime sections without putting private text in the React bundle.',
    runtimeSubtitle: 'This chapter appears only from an approved runtime source.',
      unavailableTitle: 'Your Valentine letter is being kept private.',
      unavailableDescription: 'This protected correspondence is not available on this device right now.',
      unavailableMediaNote: 'Private companion media will appear when it is available to your account.',
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
    summary: 'A protected confession chapter can now read runtime sections without putting private text in the React bundle.',
    runtimeSubtitle: 'This chapter appears only from an approved runtime source.',
      unavailableTitle: 'Your confession is being kept private.',
      unavailableDescription: 'This protected note is not available on this device right now.',
      unavailableMediaNote: 'Private companion media will appear when it is available to your account.',
  }),
})

export function getSpecialMomentConfig(momentKey) {
  return specialMomentConfig[momentKey] || null
}

export function isConfiguredSpecialMoment(momentKey) {
  return Boolean(getSpecialMomentConfig(momentKey))
}
