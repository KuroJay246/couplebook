import {
  loadEventHubReferenceConfig,
  validateEventHubReference,
} from './lib/event-hub-reference.mjs'

const { config } = loadEventHubReferenceConfig()
const validation = validateEventHubReference(config)
const errors = [...validation.errors]

if (!Array.isArray(config.doNotCopy) || config.doNotCopy.length < 5) {
  errors.push('doNotCopy must clearly list prohibited Gather copy targets.')
}

if (!Array.isArray(config.engineeringAlignmentRequired) || config.engineeringAlignmentRequired.length < 6) {
  errors.push('engineeringAlignmentRequired must list the protected engineering layers.')
}

const intentionalVisualDivergence = config.intentionalVisualDivergence || {}
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
]
for (const key of requiredVisualKeys) {
  if (intentionalVisualDivergence[key] !== true) {
    errors.push(`intentionalVisualDivergence must mark ${key} as true.`)
  }
}

if (config.referenceEngineeringBranch !== 'rebuild/couplebook-eventhub-system-port') {
  errors.push('referenceEngineeringBranch must remain rebuild/couplebook-eventhub-system-port.')
}

if (!String(config.visualIdentityVersion || '').trim()) {
  errors.push('visualIdentityVersion must be recorded.')
}

if (errors.length) {
  console.error('Event Hub alignment check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Event Hub alignment check passed for ${config.lastInspectedCommit} with intentional Couple Book visual divergence recorded as ${config.visualIdentityVersion}.`)
