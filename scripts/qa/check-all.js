const { spawnSync } = require('child_process');
const path = require('path');

const scripts = [
  'check-safety.js',
  'check-public.js',
  'check-rules.js',
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
