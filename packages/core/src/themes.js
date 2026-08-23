export const THEME_STORAGE_KEY = 'couplebook:appearance-theme'

export const THEME_IDS = Object.freeze({
  midnightRose: 'midnight-rose',
  paperHearts: 'paper-hearts',
  moonlit: 'moonlit',
})

export const DEFAULT_THEME_ID = THEME_IDS.midnightRose

export const THEME_REGISTRY = Object.freeze([
  {
    id: THEME_IDS.midnightRose,
    name: 'Midnight Rose',
    description: 'Deep aubergine, warm ivory, and a close-at-night mood.',
    shortDescription: 'Intimate dark',
    accent: '#d27c99',
    surface: '#23131e',
    nav: '#18111b',
    text: '#f4eced',
  },
  {
    id: THEME_IDS.paperHearts,
    name: 'Paper Hearts',
    description: 'A warm editorial journal with dusty rose and ink.',
    shortDescription: 'Light journal',
    accent: '#af6476',
    surface: '#fffaf3',
    nav: '#f1e5d8',
    text: '#2b2124',
  },
  {
    id: THEME_IDS.moonlit,
    name: 'Moonlit',
    description: 'Cool midnight blue-charcoal with lavender quiet.',
    shortDescription: 'Cool dark',
    accent: '#b286c7',
    surface: '#1a2232',
    nav: '#131a27',
    text: '#edf0f7',
  },
])

export const LEGACY_THEME_ID_ALIASES = Object.freeze({
  dark: THEME_IDS.midnightRose,
  kuromi: THEME_IDS.midnightRose,
  plum: THEME_IDS.midnightRose,
  moonlight: THEME_IDS.moonlit,
  olive: THEME_IDS.moonlit,
  sunset: THEME_IDS.moonlit,
  light: THEME_IDS.paperHearts,
  paper: THEME_IDS.paperHearts,
  rose: THEME_IDS.paperHearts,
})

const THEME_ID_SET = new Set(THEME_REGISTRY.map((theme) => theme.id))
const SUPPORTED_THEME_INPUT_SET = new Set([...THEME_ID_SET, ...Object.keys(LEGACY_THEME_ID_ALIASES)])

export function normalizeThemeId(value) {
  const themeId = String(value || '').trim().toLowerCase()
  if (THEME_ID_SET.has(themeId)) return themeId
  return LEGACY_THEME_ID_ALIASES[themeId] || DEFAULT_THEME_ID
}

export function isSupportedThemeInput(value) {
  const themeId = String(value || '').trim().toLowerCase()
  return SUPPORTED_THEME_INPUT_SET.has(themeId)
}

export function findTheme(themeId) {
  return THEME_REGISTRY.find((theme) => theme.id === normalizeThemeId(themeId)) || THEME_REGISTRY[0]
}
