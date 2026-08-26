const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_SERVER_URL = 'http://127.0.0.1:3000';
const FALLBACK_SERVER_URL = 'http://127.0.0.1:4177';
const DEFAULT_ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/timeline',
  '/gallery',
  '/profile',
  '/plans',
  '/favorites',
  '/settings',
  '/contract',
  '/birthday',
  '/valentine',
  '/confession'
];

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: false,
    ...options
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function serverUrl() {
  return process.env.COUPLEBOOK_QA_BASE_URL || DEFAULT_SERVER_URL;
}

function httpRequest(route) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, serverUrl());
    const req = http.get(url, (res) => {
      res.resume();
      resolve({
        route,
        statusCode: res.statusCode
      });
    });

    req.on('error', reject);
    req.setTimeout(4000, () => {
      req.destroy(new Error(`Timeout requesting ${route}`));
    });
  });
}

async function isServerAvailable() {
  try {
    const response = await httpRequest('/');
    return response.statusCode === 200;
  } catch (_error) {
    return false;
  }
}

async function waitForServer(timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerAvailable()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function withServer(callback) {
  const alreadyRunning = await isServerAvailable();
  if (alreadyRunning) {
    const body = await new Promise((resolve, reject) => {
      const request = http.get(new URL('/', serverUrl()), (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { text += chunk; });
        response.on('end', () => resolve(text));
      });
      request.on('error', reject);
    });
    if (body.includes('/assets/') && body.includes('Couple Book')) {
      log(`Using existing Couple Book app-v2 server on ${serverUrl()}`);
      return callback();
    }
    log(`Port ${new URL(serverUrl()).port} is occupied by another app; starting an isolated app-v2 preview.`);
  }

  const previousBaseUrl = process.env.COUPLEBOOK_QA_BASE_URL;
  const fallbackPort = new URL(FALLBACK_SERVER_URL).port;
  process.env.COUPLEBOOK_QA_BASE_URL = FALLBACK_SERVER_URL;
  log(`Starting app-v2 preview server for route checks on ${FALLBACK_SERVER_URL}`);
  const child = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'npx',
    process.platform === 'win32'
      ? ['/d', '/s', '/c', `npx vite preview --host 127.0.0.1 --port ${fallbackPort}`]
      : ['vite', 'preview', '--host', '127.0.0.1', '--port', fallbackPort],
    {
    cwd: path.join(REPO_ROOT, 'app-v2'),
    stdio: 'ignore'
    }
  );

  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error('Local dev server did not become ready on port 3000');
    }
    return await callback();
  } finally {
    child.kill();
    if (previousBaseUrl === undefined) delete process.env.COUPLEBOOK_QA_BASE_URL;
    else process.env.COUPLEBOOK_QA_BASE_URL = previousBaseUrl;
  }
}

function walkFiles(rootDir) {
  const results = [];

  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      results.push(absolutePath);
    }
  }

  if (fs.existsSync(rootDir)) {
    visit(rootDir);
  }

  return results;
}

module.exports = {
  DEFAULT_ROUTES,
  REPO_ROOT,
  fail,
  httpRequest,
  log,
  runCommand,
  walkFiles,
  withServer
};
