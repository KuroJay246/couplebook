const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SERVER_URL = 'http://127.0.0.1:3000';
const DEFAULT_ROUTES = [
  '/',
  '/pages/login.html',
  '/pages/dashboard.html',
  '/pages/timeline.html',
  '/pages/media.html',
  '/pages/profile.html',
  '/pages/favorites.html',
  '/pages/settings.html',
  '/pages/legacy.html?module=confession/index.html',
  '/pages/confession/index.html',
  '/pages/valentine/index.html',
  '/pages/omnia-happy-birthday.html'
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

function httpRequest(route) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, SERVER_URL);
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
    log('Using existing local server on http://127.0.0.1:3000');
    return callback();
  }

  log('Starting local dev server for route checks');
  const child = spawn(process.execPath, ['server.js'], {
    cwd: REPO_ROOT,
    stdio: 'ignore'
  });

  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error('Local dev server did not become ready on port 3000');
    }
    return await callback();
  } finally {
    child.kill();
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
