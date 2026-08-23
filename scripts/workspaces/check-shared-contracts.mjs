import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const packagesRoot = path.join(repoRoot, 'packages')

if (!fs.existsSync(packagesRoot)) {
  console.error('packages/ is missing.')
  process.exit(1)
}

const testFiles = fs.readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const testDir = path.join(packagesRoot, entry.name, 'test')
    if (!fs.existsSync(testDir)) return []

    return fs.readdirSync(testDir)
      .filter((file) => file.endsWith('.test.js'))
      .map((file) => path.join(testDir, file))
  })

if (testFiles.length === 0) {
  console.error('No shared contract tests were found under packages/*/test.')
  process.exit(1)
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: repoRoot,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
