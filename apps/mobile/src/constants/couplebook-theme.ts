import {
  DEFAULT_THEME_ID,
  THEME_IDS,
  THEME_REGISTRY,
  findTheme,
} from '../../../../packages/core/src/index.js';

const mobileThemePalette = {
  [THEME_IDS.midnightRose]: {
    background: '#120d13',
    backgroundElement: '#23131e',
    backgroundSelected: '#31202c',
    backgroundMuted: '#1a1118',
    surfaceRaised: '#2a1824',
    text: '#f4eced',
    textSecondary: '#ccb9bf',
    textMuted: '#9f8690',
    border: 'rgba(244, 236, 237, 0.08)',
    accent: '#d27c99',
    accentStrong: '#b9607f',
    accentSoft: 'rgba(210, 124, 153, 0.16)',
    success: '#83bea0',
    warning: '#d8b478',
  },
  [THEME_IDS.paperHearts]: {
    background: '#f6efe6',
    backgroundElement: '#fffaf4',
    backgroundSelected: '#f1e5d8',
    backgroundMuted: '#fbf6ef',
    surfaceRaised: '#fffdf9',
    text: '#2e2427',
    textSecondary: '#5d4b4f',
    textMuted: '#887478',
    border: 'rgba(93, 67, 71, 0.1)',
    accent: '#af6476',
    accentStrong: '#954f60',
    accentSoft: 'rgba(175, 100, 118, 0.14)',
    success: '#4f7e64',
    warning: '#99713a',
  },
  [THEME_IDS.moonlit]: {
    background: '#0f1520',
    backgroundElement: '#1a2232',
    backgroundSelected: '#273144',
    backgroundMuted: '#151d2a',
    surfaceRaised: '#202a3a',
    text: '#edf0f7',
    textSecondary: '#cad0dd',
    textMuted: '#98a5bb',
    border: 'rgba(232, 238, 247, 0.08)',
    accent: '#b286c7',
    accentStrong: '#9d72b4',
    accentSoft: 'rgba(178, 134, 199, 0.14)',
    success: '#84b8ac',
    warning: '#d0bc8e',
  },
} as const;

export const DefaultCoupleBookThemeId = DEFAULT_THEME_ID;

export function getCoupleBookTheme(themeId = DefaultCoupleBookThemeId) {
  const theme = findTheme(themeId);

  return {
    ...theme,
    isDark: theme.id !== THEME_IDS.paperHearts,
    colors: mobileThemePalette[theme.id],
  };
}

export const DefaultCoupleBookTheme = getCoupleBookTheme(DefaultCoupleBookThemeId);

export const CoupleBookThemes = THEME_REGISTRY.map((theme) => ({
  ...theme,
  colors: mobileThemePalette[theme.id],
}));
