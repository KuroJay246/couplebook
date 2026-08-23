export const SPECIAL_MOMENT_KEYS = Object.freeze(['birthday', 'valentine', 'confession'])

export const SPECIAL_MOMENT_ROUTES = Object.freeze({
  birthday: '/birthday',
  valentine: '/valentine',
  confession: '/confession',
})

export function isSpecialMomentKey(value) {
  return SPECIAL_MOMENT_KEYS.includes(String(value || '').trim().toLowerCase())
}
