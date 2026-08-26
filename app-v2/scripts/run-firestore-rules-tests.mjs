import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appDir, '..')
const firestorePort = String(process.env.CB_FIRESTORE_EMULATOR_PORT || process.env.FIRESTORE_EMULATOR_PORT || '8085')

const baseConfigPath = path.join(repoRoot, 'firebase.app-v2.json')
const config = JSON.parse(fs.readFileSync(baseConfigPath, 'utf8'))
config.firestore = {
  ...(config.firestore || {}),
  rules: path.join(repoRoot, config.firestore?.rules || 'firestore.rules'),
}
config.emulators = config.emulators || {}
config.emulators.firestore = {
  ...(config.emulators.firestore || {}),
  host: '127.0.0.1',
  port: Number(firestorePort),
}
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-firestore-rules-'))
const configPath = path.join(tempDir, 'firebase.app-v2.json')
fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
const command = `npx -y firebase-tools@14.19.0 emulators:exec --only firestore --project demo-couplebook-app-v2 --config "${configPath}" "node src/test/firestore-rules.test.js"`

const child = spawn(command, {
  cwd: appDir,
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
  },
})

child.on('exit', (code) => {
  fs.rmSync(tempDir, { recursive: true, force: true })
  process.exit(code || 0)
})
