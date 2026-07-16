import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createMigrationPlan } from '../../scripts/plan-firestore-migration.mjs'

test('migration planner returns deterministic counts-only output and blockers', () => {
  const plan = createMigrationPlan({
    memories: [
      { id: 'one', title: 'Fictional one', date: '2026-01-01', media: '' },
      { id: 'one', title: 'Fictional duplicate', date: 'bad-date', media: 'C:\\Users\\Private\\photo.jpg' },
      { id: '', title: '', date: '2026-01-03' },
    ],
    specialPayloads: {
      birthday: { moment: { type: 'birthday', title: 'Fictional', sections: [{ kind: 'paragraph', content: 'Safe' }] } },
      anniversary: { moment: { type: 'anniversary', title: 'Unsupported' } },
    },
  })

  assert.equal(plan.domains.memories.sourceCount, 3)
  assert.equal(plan.domains.memories.validCount, 1)
  assert.equal(plan.blockers['duplicate-id'], 1)
  assert.equal(plan.blockers['invalid-date'], 1)
  assert.equal(plan.blockers['unsafe-media-path'], 1)
  assert.equal(plan.blockers['unsupported-special-type'], 1)
  assert.equal(plan.writesPlanned, 0)
  assert.equal(JSON.stringify(plan).includes('Fictional duplicate'), false)
})

test('migration planner script imports no Firestore write methods', async () => {
  const source = await readFile(new URL('../../scripts/plan-firestore-migration.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /setDoc|addDoc|updateDoc|deleteDoc|writeBatch|runTransaction/)
})
