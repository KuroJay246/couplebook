const { spawnSync } = require('child_process');
const path = require('path');

const scripts = [
  path.join(__dirname, '..', 'check-event-hub-alignment.mjs'),
  path.join(__dirname, '..', 'check-couple-book-identity.mjs'),
  'check-safety.js',
  'check-public.js',
  'check-rules.js',
  'check-mirrors.js',
  'check-services.js',
  'check-sync-model.js',
  'check-prototype.js',
  'check-docs.js',
  'check-privacy.js',
  'check-routes.js'
];

const repoRoot = path.join(__dirname, '..', '..');
const npmCli =
  process.env.npm_execpath ||
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmCommand = process.platform === 'win32' ? process.execPath : 'npm';
const npmArgs = (args) => (process.platform === 'win32' ? [npmCli, ...args] : args);
const npmScripts = [
  'shared-contracts:check',
  'permissions:check',
  'schema:check',
  'mobile:lint',
  'mobile:typecheck',
];

for (const script of scripts) {
  const resolvedScript = path.isAbsolute(script) ? script : path.join(__dirname, script);
  const result = spawnSync(process.execPath, [resolvedScript], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

for (const scriptName of npmScripts) {
  const result = spawnSync(npmCommand, npmArgs(['run', scriptName]), {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
