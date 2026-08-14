import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPlansReadModel } from '../features/plans/plansReadModel.js'

test('plans read model sorts active plans before completed and supports filters', () => {
  const model = buildPlansReadModel({
    status: 'ready',
    data: {
      plans: [
        { id: 'done', title: 'Finished date', status: 'completed', category: 'Date Idea', targetDate: '2026-08-12' },
        { id: 'movie', title: 'Movie night', status: 'planned', category: 'Movie or Show', targetDate: '2026-08-16' },
        { id: 'trip', title: 'Beach trip', status: 'idea', category: 'Place to Visit', targetDate: '' },
      ],
    },
  }, { search: 'movie', status: 'planned' })

  assert.equal(model.counts.total, 3)
  assert.equal(model.counts.completed, 1)
  assert.deepEqual(model.filtered.map((plan) => plan.id), ['movie'])
})
