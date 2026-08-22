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

if (!Array.isArray(config.engineeringAlignmentRequired) || config.engineeringAlignmentRequired.length < 6) {
  errors.push('engineeringAlignmentRequired must list the protected engineering layers.');
}

const intentionalVisualDivergence = config.intentionalVisualDivergence || {};
const requiredVisualKeys = [
  'brand',
  'themes',
  'shell',
  'navigation',
  'typography',
  'pageComposition',
  'story',
  'album',
  'us',
  'plans',
  'more',
  'specialMoments',
  'motion',
];
for (const key of requiredVisualKeys) {
  if (intentionalVisualDivergence[key] !== true) {
    errors.push(`intentionalVisualDivergence must mark ${key} as true.`);
  }
}

if (config.activeImplementationBranch !== 'design/couplebook-distinct-product-identity') {
  errors.push('activeImplementationBranch must remain design/couplebook-distinct-product-identity.');
}

if (config.referenceEngineeringBranch !== 'rebuild/couplebook-eventhub-system-port') {
  errors.push('referenceEngineeringBranch must remain rebuild/couplebook-eventhub-system-port.');
}

if (!String(config.visualIdentityVersion || '').trim()) {
  errors.push('visualIdentityVersion must be recorded.');
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

console.log(`Event Hub alignment check passed for ${config.lastInspectedCommit} with intentional Couple Book visual divergence recorded as ${config.visualIdentityVersion}.`);
