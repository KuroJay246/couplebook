const { fail, log, runCommand } = require('./lib');

const SENSITIVE_PATTERN = 'assets/photos/|assets/videos/|OUR MEMORIES/|users_export.json|Alkaline-High-Props|use me.jpg|thats-so-cheesy|i-know-this|whatsapp video 2025-12-27|couplebook-pre-filter.bundle';

function main() {
  let hasFailure = false;

  const tracked = runCommand('git', ['ls-files']);
  if (tracked.status !== 0) {
    fail(`git ls-files failed:\n${tracked.stderr || tracked.stdout}`);
    process.exitCode = 1;
    return;
  }

  const trackedMatches = tracked.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => new RegExp(SENSITIVE_PATTERN, 'i').test(line));

  if (trackedMatches.length > 0) {
    hasFailure = true;
    fail(`Tracked sensitive files found:\n${trackedMatches.join('\n')}`);
  } else {
    log('Tracked file safety check passed.');
  }

  const history = runCommand('git', ['rev-list', '--objects', '--all']);
  if (history.status !== 0) {
    fail(`git rev-list failed:\n${history.stderr || history.stdout}`);
    process.exitCode = 1;
    return;
  }

  const historyMatches = history.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => new RegExp(SENSITIVE_PATTERN, 'i').test(line));

  if (historyMatches.length > 0) {
    hasFailure = true;
    fail(`Sensitive history paths found:\n${historyMatches.join('\n')}`);
  } else {
    log('Reachable history safety check passed.');
  }

  if (hasFailure) {
    process.exitCode = 1;
    return;
  }

  log('Safety check passed.');
}

main();
