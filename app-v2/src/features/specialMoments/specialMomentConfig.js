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
    unavailableTitle: 'The birthday message remains safely in the legacy book.',
    unavailableDescription: 'This private chapter has not been connected on this origin yet.',
    unavailableMediaNote: 'Birthday companion media remains private and is not rendered in this build.',
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
    unavailableTitle: 'The Valentine letter remains safely in the legacy book.',
    unavailableDescription: 'This protected correspondence has not been connected on this origin yet.',
    unavailableMediaNote: 'Valentine companion media remains private and is not rendered in this build.',
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
    unavailableTitle: 'The confession remains safely in the legacy book.',
    unavailableDescription: 'This protected note has not been connected on this origin yet.',
    unavailableMediaNote: 'Confession companion media remains private and is not rendered in this build.',
  }),
})

export function getSpecialMomentConfig(momentKey) {
  return specialMomentConfig[momentKey] || null
}

export function isConfiguredSpecialMoment(momentKey) {
  return Boolean(getSpecialMomentConfig(momentKey))
}
