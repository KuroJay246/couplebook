export const specialMomentConfig = Object.freeze({
  birthday: Object.freeze({
    key: 'birthday',
    route: '/birthday',
    label: 'Birthday',
    title: 'Birthday moment',
    accent: 'gold',
    accentDescription: 'parchment, muted gold, and clay',
    migrationState: 'pending',
    summary: 'A protected special page is reserved here. Its content has not been migrated into this React bundle.',
  }),
  valentine: Object.freeze({
    key: 'valentine',
    route: '/valentine',
    label: 'Valentine',
    title: 'Valentine moment',
    accent: 'rose',
    accentDescription: 'parchment, dusty rose, and restrained oxblood',
    migrationState: 'pending',
    summary: 'A protected special page is reserved here. Its content has not been migrated into this React bundle.',
  }),
  confession: Object.freeze({
    key: 'confession',
    route: '/confession',
    label: 'Confession',
    title: 'Confession moment',
    accent: 'oxblood',
    accentDescription: 'ink, parchment, and oxblood',
    migrationState: 'pending',
    summary: 'A protected special page is reserved here. Its content has not been migrated into this React bundle.',
  }),
})

export function getSpecialMomentConfig(momentKey) {
  return specialMomentConfig[momentKey] || null
}
