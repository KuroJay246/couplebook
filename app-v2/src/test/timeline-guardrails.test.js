import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

async function collectFiles(directoryUrl) {
  const directoryPath = fileURLToPath(directoryUrl)
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(new URL(`${entry.name}/`, directoryUrl))))
      continue
    }

    if (/\.(js|jsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

test('timeline memory-domain sources keep private dataset imports, static runtime imports, and writes out of app-v2', async () => {
  const sourceFiles = await collectFiles(new URL('../features/timeline/', import.meta.url))
  const sourceEntries = await Promise.all(
    sourceFiles.map(async (filePath) => ({
      filePath,
      content: await readFile(filePath, 'utf8'),
    })),
  )

  const combinedSource = sourceEntries.map((entry) => entry.content).join('\n')
  assert.doesNotMatch(combinedSource, /import\s+.+memories\.json/i)
  assert.doesNotMatch(combinedSource, /new URL\(.+memories\.json/i)
  assert.doesNotMatch(combinedSource, /pages\/timeline\.html|js\/timeline\.js|core\/firestoreSync\.js/i)
  assert.doesNotMatch(combinedSource, /\blocalStorage\s*\./)
  assert.doesNotMatch(combinedSource, /\bwindow\.localStorage\b/)
  assert.doesNotMatch(combinedSource, /\.setItem\s*\(|\.removeItem\s*\(/)
  assert.doesNotMatch(combinedSource, /\bsetDoc\s*\(|\bupdateDoc\s*\(|\baddDoc\s*\(|\bdeleteDoc\s*\(/)
})

test('memory fixtures remain explicitly fictional and do not reference the real legacy dataset directly', async () => {
  const [legacyFixtureSource, timelineTestSource] = await Promise.all([
    readFile(new URL('../test-fixtures/legacy-memory.fixture.js', import.meta.url), 'utf8'),
    readFile(new URL('./timeline-memory-domain.test.js', import.meta.url), 'utf8'),
  ])

  assert.match(legacyFixtureSource, /fictional|imaginary/i)
  assert.match(timelineTestSource, /fictional/i)
  assert.doesNotMatch(legacyFixtureSource, /core\/memories\.json|public\/core\/memories\.json/i)
})
