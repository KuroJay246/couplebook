import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appDir, '..')

const configPath = path.join(repoRoot, 'firebase.app-v2.json')
const command = `npx -y firebase-tools@14.19.0 emulators:exec --only firestore --project demo-couplebook-app-v2 --config "${configPath}" "node src/test/firestore-rules.test.js"`

const child = spawn(command, {
  cwd: appDir,
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085',
  },
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
