const { spawnSync } = require('child_process');
const path = require('path');

const scripts = [
  'check-safety.js',
  'check-public.js',
  'check-rules.js',
  'check-mirrors.js',
  'check-services.js',
  'check-prototype.js',
  'check-docs.js',
  'check-routes.js'
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
