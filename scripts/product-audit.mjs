import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
const npmCommand = process.platform === 'win32' ? process.execPath : 'npm'
const npmArgs = (args) => (process.platform === 'win32' ? [npmCli, ...args] : args)

const commands = [
  [npmCommand, npmArgs(['run', 'product:qa']), repoRoot],
  [npmCommand, npmArgs(['--prefix', 'app-v2', 'run', 'test:storage-rules']), repoRoot],
  [npmCommand, npmArgs(['--prefix', 'app-v2', 'run', 'test:media-mapping']), repoRoot],
  [npmCommand, npmArgs(['--prefix', 'app-v2', 'run', 'test:product']), repoRoot],
  [npmCommand, npmArgs(['--prefix', 'app-v2', 'run', 'test:performance']), repoRoot],
  [npmCommand, npmArgs(['--prefix', 'app-v2', 'run', 'test:visual']), repoRoot],
]

for (const [command, args, cwd] of commands) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  })

  if (result.status !== 0) process.exit(result.status || 1)
}

console.log('Product audit passed.')
