import { spawn } from 'node:child_process'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const npmCommand = 'npm'
const commandShell = process.env.ComSpec || 'cmd.exe'
const nodeCommand = process.execPath

const childEnv = {
  ...process.env,
  PORT: process.env.COUPLEBOOK_LEGACY_BRIDGE_PORT || '3003',
  VITE_ENABLE_LEGACY_LOCAL_BRIDGE: 'true',
  VITE_LEGACY_LOCAL_BASE_URL: process.env.VITE_LEGACY_LOCAL_BASE_URL || 'http://127.0.0.1:3003',
}

const children = []
let shuttingDown = false

function spawnChild(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || process.cwd(),
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: options.shell ?? false,
  })

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`)
  })
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`)
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    shuttingDown = true
    process.stderr.write(`[${label}] exited with ${signal || code}\n`)
    stopChildren()
    process.exitCode = typeof code === 'number' ? code : 1
  })

  children.push(child)
  return child
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill(isWindows ? undefined : 'SIGTERM')
    }
  }
}

process.on('SIGINT', () => {
  shuttingDown = true
  stopChildren()
  process.exit(130)
})

process.on('SIGTERM', () => {
  shuttingDown = true
  stopChildren()
  process.exit(143)
})

process.stdout.write('Starting Couple Book owner-review local runtime.\n')
process.stdout.write(`Private legacy bridge: ${childEnv.VITE_LEGACY_LOCAL_BASE_URL}\n`)
process.stdout.write('Vite app: http://localhost:5173\n')

spawnChild('bridge', nodeCommand, ['server.js'])
if (isWindows) {
  spawnChild('vite', commandShell, ['/d', '/s', '/c', `${npmCommand} --prefix app-v2 run dev`])
} else {
  spawnChild('vite', npmCommand, ['--prefix', 'app-v2', 'run', 'dev'])
}
