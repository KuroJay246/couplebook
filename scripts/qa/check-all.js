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

for (const script of scripts) {
  const resolvedScript = path.isAbsolute(script) ? script : path.join(__dirname, script);
  const result = spawnSync(process.execPath, [resolvedScript], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
