import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const sourceRoots = [
  'app-v2/src',
  'apps/mobile/src',
  'packages',
]

const forbiddenPatterns = [
  { label: 'raw local path', pattern: /[A-Z]:\\Users\\|[A-Z]:\\Documents\\|\/Users\/Jaylan\/|file:\/\//i },
  {
    label: 'private media folder path',
    pattern: /Couple Book Private Media|couplebook\.private-import|(?:^|[\\/])OUR MEMORIES(?:[\\/]|$)/i,
  },
]

function walkFiles(rootDir) {
  const entries = []
  const stack = [path.join(repoRoot, rootDir)]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'test' || entry.name === 'test-fixtures') continue
        stack.push(next)
        continue
      }
      if (/\.(js|jsx|ts|tsx|mjs|cjs|json|md)$/.test(entry.name)) entries.push(next)
    }
  }
  return entries
}

const failures = []

for (const rootDir of sourceRoots) {
  for (const filePath of walkFiles(rootDir)) {
    const source = readFileSync(filePath, 'utf8')
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(source)) {
        failures.push(`${path.relative(repoRoot, filePath)} contains ${forbidden.label}`)
      }
    }
  }
}

if (failures.length) {
  console.error('Production path check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production path check passed.')
