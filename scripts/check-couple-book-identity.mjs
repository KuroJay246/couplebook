import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const repoRoot = process.cwd()
const errors = []

const packagePath = path.join(repoRoot, 'package.json')
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
const configPath = path.join(repoRoot, 'config', 'event-hub-reference.json')
const config = JSON.parse(readFileSync(configPath, 'utf8'))

const requiredFiles = [
  'app-v2/src/theme/themeRegistry.js',
  'app-v2/src/theme/ThemeProvider.jsx',
  'app-v2/src/theme/ThemeContext.js',
  'app-v2/src/components/BrandMark.jsx',
  'app-v2/src/styles/tokens/foundation.css',
  'app-v2/src/styles/tokens/midnight-rose.css',
  'app-v2/src/styles/tokens/paper-hearts.css',
  'app-v2/src/styles/tokens/moonlit.css',
  'docs/COUPLE_BOOK_VISUAL_IDENTITY_STANDARD.md',
]

for (const relativePath of requiredFiles) {
  if (!existsSync(path.join(repoRoot, relativePath))) {
    errors.push(`Missing required identity file: ${relativePath}`)
  }
}

if (packageJson.scripts?.['identity:check'] !== 'node scripts/check-couple-book-identity.mjs') {
  errors.push('package.json must register identity:check.')
}

if (!String(config.visualIdentityVersion || '').trim()) {
  errors.push('config/event-hub-reference.json must record visualIdentityVersion.')
}

const themeRegistrySourcePath = path.join(repoRoot, 'app-v2', 'src', 'theme', 'themeRegistry.js')
const themeRegistrySource = readFileSync(themeRegistrySourcePath, 'utf8')
if (!themeRegistrySource.includes('THEME_REGISTRY') || !themeRegistrySource.includes('THEME_IDS')) {
  errors.push('themeRegistry.js must expose shared theme contracts.')
}

const themeRegistryModule = await import(pathToFileURL(themeRegistrySourcePath).href)
const exportedThemeIds = new Set((themeRegistryModule.THEME_REGISTRY || []).map((theme) => theme.id))
for (const themeId of ['midnight-rose', 'paper-hearts', 'moonlit']) {
  if (!exportedThemeIds.has(themeId)) {
    errors.push(`themeRegistry export must include ${themeId}.`)
  }
}

const mainSource = readFileSync(path.join(repoRoot, 'app-v2', 'src', 'main.jsx'), 'utf8')
for (const marker of ['ThemeProvider', 'foundation.css', 'midnight-rose.css', 'paper-hearts.css', 'moonlit.css', 'typography.css', 'forms.css', 'motion.css']) {
  if (!mainSource.includes(marker)) {
    errors.push(`main.jsx is missing identity runtime marker: ${marker}`)
  }
}

const brandSource = readFileSync(path.join(repoRoot, 'app-v2', 'src', 'components', 'BrandMark.jsx'), 'utf8')
if (!brandSource.includes('Couple Book')) {
  errors.push('BrandMark.jsx must render Couple Book wordmark text.')
}
if (/event hub|gather & savor/i.test(brandSource)) {
  errors.push('BrandMark.jsx must not mention Event Hub or Gather & Savor.')
}

const appSourcePaths = [
  path.join(repoRoot, 'app-v2', 'src', 'layout', 'AppShell.jsx'),
  path.join(repoRoot, 'app-v2', 'src', 'pages', 'LoginPage.jsx'),
  path.join(repoRoot, 'app-v2', 'src', 'features', 'settings', 'SettingsView.jsx'),
]
for (const sourcePath of appSourcePaths) {
  const source = readFileSync(sourcePath, 'utf8')
  if (/event hub|gather & savor/i.test(source)) {
    errors.push(`Visible app source must not mention Event Hub or Gather & Savor: ${path.relative(repoRoot, sourcePath)}`)
  }
}

if (errors.length > 0) {
  console.error('Couple Book identity check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Couple Book identity check passed for ${config.visualIdentityVersion}.`)
