import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const configPath = path.resolve('config/event-hub-reference.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const errors = [];

if (!existsSync(config.referenceRepo)) {
  errors.push(`Reference repo not found: ${config.referenceRepo}`);
}

if (path.resolve(config.referenceRepo).toLowerCase() === process.cwd().toLowerCase()) {
  errors.push('Reference repo must not be the Couple Book repository.');
}

if (config.coupleBookFirebaseProject !== 'couplebook-97830') {
  errors.push('Couple Book Firebase project must remain couplebook-97830.');
}

if (!config.prohibitedFirebaseProjects?.includes('gathervibeshub')) {
  errors.push('gathervibeshub must remain prohibited in Couple Book config.');
}

if (!Array.isArray(config.doNotCopy) || config.doNotCopy.length < 5) {
  errors.push('doNotCopy must clearly list prohibited Gather copy targets.');
}

if (!errors.length) {
  const currentCommit = execFileSync('git', ['-C', config.referenceRepo, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  if (currentCommit !== config.lastInspectedCommit && process.env.COUPLEBOOK_ALIGNMENT_ALLOW_DRIFT !== '1') {
    errors.push(
      `Gather reference drifted: expected ${config.lastInspectedCommit}, found ${currentCommit}. ` +
        'Re-read Gather docs, then update config/event-hub-reference.json.'
    );
  }
}

if (errors.length) {
  console.error('Event Hub alignment check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Event Hub alignment check passed for ${config.lastInspectedCommit}.`);
