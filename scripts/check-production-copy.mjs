import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const sourceRoots = [
  'app-v2/src/app',
  'app-v2/src/layout',
  'app-v2/src/pages',
  'app-v2/src/features',
  'apps/mobile/src/app',
  'apps/mobile/src/components',
]

const forbiddenPatterns = [
  { label: 'browser regression copy', pattern: /\bbrowser-test\b/i },
  { label: 'Event Hub product naming', pattern: /\bGather\s*&\s*Savor\b|\bEvent Hub\b/i },
  { label: 'raw local filesystem path', pattern: /[A-Z]:\\Users\\|file:\/\//i },
]

function walkJavaScriptFiles(rootDir) {
  const entries = []
  const stack = [path.join(repoRoot, rootDir)]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(next)
        continue
      }
      if (/\.(jsx?|tsx?)$/.test(entry.name)) entries.push(next)
    }
  }
  return entries
}

const failures = []

for (const rootDir of sourceRoots) {
  for (const filePath of walkJavaScriptFiles(rootDir)) {
    const source = readFileSync(filePath, 'utf8')
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(source)) {
        failures.push(`${path.relative(repoRoot, filePath)} contains ${forbidden.label}`)
      }
    }
  }
}

if (failures.length) {
  console.error('Production copy check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production copy check passed.')
