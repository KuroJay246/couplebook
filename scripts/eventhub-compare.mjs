import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const config = JSON.parse(readFileSync(path.join(repoRoot, 'config', 'event-hub-reference.json'), 'utf8'))

const comparisons = [
  {
    area: 'Application shell',
    referenceFile: 'src/layout/AppShell.jsx',
    targetFiles: ['app-v2/src/layout/AppShell.jsx', 'app-v2/src/app/routeConfig.js'],
    markers: ['mobile-tab-bar', 'Navigation menu', 'Open all navigation', 'Home', 'Story', 'Album', 'Us', 'Plans'],
  },
  {
    area: 'Mobile navigation helper',
    referenceFile: 'src/utils/navigation.js',
    targetFiles: ['app-v2/src/utils/navigation.js'],
    markers: ['mobilePrimaryNavigation', 'mobilePrimary'],
  },
  {
    area: 'Brand mark placement',
    referenceFile: 'src/components/BrandMark.jsx',
    targetFiles: ['app-v2/src/components/BrandMark.jsx'],
    markers: ['BrandMark'],
  },
  {
    area: 'Boot and route tree',
    referenceFile: 'src/App.jsx',
    targetFiles: ['app-v2/src/app/routeConfig.js'],
    markers: ['/dashboard', '/timeline', '/gallery', '/profile', '/plans', '/settings'],
  },
  {
    area: 'Global style system',
    referenceFile: 'src/styles.css',
    targetFiles: ['app-v2/src/main.jsx'],
    markers: ['tokens.css', 'shell.css', 'navigation.css'],
  },
  {
    area: 'Firebase entry',
    referenceFile: 'src/lib/firebase.js',
    targetFiles: ['app-v2/src/lib/firebase.js'],
    markers: ['VITE_FIREBASE_USE_EMULATORS', 'initializeFirestore', 'connectFirestoreEmulator'],
  },
  {
    area: 'Auth foundation',
    referenceFile: 'src/auth/AuthProvider.jsx',
    targetFiles: ['app-v2/src/auth/AuthProvider.jsx'],
    markers: ['AuthProvider'],
  },
  {
    area: 'QA and route inventory',
    referenceFile: 'scripts/product/routeInventory.mjs',
    targetFiles: ['app-v2/scripts/validate-event-hub-shell-port.mjs'],
    markers: ['Home', 'Story', 'Album', 'Us', 'Plans'],
  },
]

let failures = 0

console.log('Couple Book Event Hub comparison')
console.log(`- reference repo: ${config.referenceRepo}`)
console.log(`- inspected commit: ${config.lastInspectedCommit}`)

for (const comparison of comparisons) {
  const referencePath = path.join(config.referenceRepo, comparison.referenceFile)
  const targetPaths = comparison.targetFiles.map((targetFile) => path.join(repoRoot, targetFile))
  const referenceExists = existsSync(referencePath)
  const missingTargets = targetPaths.filter((targetPath) => !existsSync(targetPath))

  if (!referenceExists || missingTargets.length > 0) {
    const missingPath = !referenceExists ? referencePath : missingTargets.join(', ')
    console.log(`- FAIL ${comparison.area}: missing ${missingPath}`)
    failures += 1
    continue
  }

  const targetSource = comparison.targetFiles
    .map((targetFile) => readFileSync(path.join(repoRoot, targetFile), 'utf8'))
    .join('\n')
  const missingMarkers = comparison.markers.filter((marker) => !targetSource.includes(marker))

  if (missingMarkers.length > 0) {
    console.log(`- FAIL ${comparison.area}: missing markers in ${comparison.targetFiles.join(', ')}: ${missingMarkers.join(', ')}`)
    failures += 1
    continue
  }

  console.log(`- OK ${comparison.area}: ${comparison.referenceFile} -> ${comparison.targetFiles.join(', ')}`)
}

if (failures > 0) {
  process.exit(1)
}
