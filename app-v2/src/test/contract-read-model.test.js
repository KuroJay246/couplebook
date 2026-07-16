import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildContractReadModel } from '../features/contract/contractReadModel.js'
import { sanitizedAuthorizedAgreementFixture } from '../test-fixtures/contract.fixture.js'

function createSignature(overrides = {}) {
  return {
    accepted: false,
    timestamp: null,
    version: null,
    history: [],
    unknownFields: {},
    hasLegacyPayload: false,
    redactedFields: [],
    ...overrides,
  }
}

function createSnapshot(overrides = {}) {
  const baseSnapshot = {
    status: 'ready',
    sources: {
      contract: {
        status: 'ready',
        source: 'legacy-local-storage',
        data: {
          username: 'Jaylan',
          accepted: true,
          activeSignature: createSignature({
            accepted: true,
            timestamp: '2026-01-01T00:00:00.000Z',
            version: '3.0',
            history: [
              {
                accepted: true,
                timestamp: '2026-01-01T00:00:00.000Z',
                version: '3.0',
                unknownFields: {},
                hasLegacyPayload: false,
                redactedFields: [],
              },
            ],
          }),
          signaturesByUsername: {
            Jaylan: createSignature({
              accepted: true,
              timestamp: '2026-01-01T00:00:00.000Z',
              version: '3.0',
              history: [
                {
                  accepted: true,
                  timestamp: '2026-01-01T00:00:00.000Z',
                  version: '3.0',
                  unknownFields: {},
                  hasLegacyPayload: false,
                  redactedFields: [],
                },
              ],
            }),
            Omia: createSignature({
              accepted: false,
              timestamp: null,
              version: '3.0',
              history: [],
            }),
          },
        },
        warnings: ['Legacy contract signatures are read-only.'],
      },
      profile: {
        status: 'ready',
        source: 'legacy-local-storage',
        data: {
          profilesByUsername: {
            Jaylan: {
              name: 'Jaylan',
              bio: '',
              avatar: '',
              anniversaryView: null,
              joinedDate: null,
              birthday: null,
              unknownFields: {},
            },
            Omia: {
              name: 'Omia',
              bio: '',
              avatar: '',
              anniversaryView: null,
              joinedDate: null,
              birthday: null,
              unknownFields: {},
            },
          },
          participantOrder: ['Jaylan', 'Omia'],
          unknownTopLevelFields: {},
        },
        warnings: [],
      },
      favorites: {
        status: 'ready',
        source: 'legacy-local-storage',
        data: {
          favoritesByOwner: {},
          participantOrder: [],
          unknownTopLevelFields: {},
        },
        warnings: [],
      },
      settings: {
        status: 'empty',
        source: 'legacy-local-storage',
        data: null,
        warnings: [],
      },
      memories: {
        status: 'unavailable',
        source: 'legacy-local-dev',
        data: null,
        warnings: [],
      },
    },
    warnings: [],
  }

  return structuredClone({
    ...baseSnapshot,
    ...overrides,
    sources: {
      ...baseSnapshot.sources,
      ...(overrides.sources || {}),
    },
  })
}

test('contract read model renders authorized agreement content and safe status summaries when protected content exists', () => {
  const model = buildContractReadModel({
    agreementSource: sanitizedAuthorizedAgreementFixture,
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    compatibilitySnapshot: createSnapshot(),
  })

  assert.equal(model.status, 'ready')
  assert.equal(model.agreement.status, 'ready')
  assert.equal(model.agreement.title, 'Our agreement')
  assert.equal(model.agreement.sections.length, 2)
  assert.equal(model.acceptance.currentUser.label, 'Accepted')
  assert.equal(model.acceptance.partner.label, 'Not yet recorded')
  assert.equal(model.signatures.currentUser.label, 'Signature recorded')
  assert.equal(model.signatures.partner.label, 'No signature recorded')
  assert.equal(model.privacy.readOnly, true)
  assert.equal(model.privacy.rawSignaturesHidden, true)
  assert.ok(model.history.length >= 1)
})

test('contract read model keeps agreement wording unavailable while still showing acceptance-only status safely', () => {
  const model = buildContractReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        contract: {
          status: 'ready',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            accepted: true,
            activeSignature: null,
            signaturesByUsername: {},
          },
          warnings: [],
        },
      },
    }),
  })

  assert.equal(model.status, 'partial')
  assert.equal(model.agreement.status, 'unavailable')
  assert.equal(model.acceptance.currentUser.label, 'Accepted')
  assert.equal(model.signatures.currentUser.label, 'Accepted record preserved')
  assert.equal(model.acceptance.partner, null)
})

test('contract read model renders legacy signature status safely without exposing raw payload material', () => {
  const model = buildContractReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        contract: {
          status: 'ready',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            accepted: true,
            activeSignature: createSignature({
              accepted: true,
              timestamp: '2026-01-02T00:00:00.000Z',
              version: '3.0',
              unknownFields: {},
              hasLegacyPayload: true,
              redactedFields: ['signatureDataUrl'],
            }),
            signaturesByUsername: {
              Jaylan: createSignature({
                accepted: true,
                timestamp: '2026-01-02T00:00:00.000Z',
                version: '3.0',
                unknownFields: {},
                hasLegacyPayload: true,
                redactedFields: ['signatureDataUrl'],
              }),
            },
          },
          warnings: [],
        },
      },
    }),
  })

  assert.equal(model.status, 'partial')
  assert.equal(model.signatures.currentUser.label, 'Signature preserved in legacy data')
  assert.equal(model.signatures.currentUser.rawSignaturesHidden, true)

  const serialized = JSON.stringify(model)
  assert.doesNotMatch(serialized, /data:image|base64|strokeData|signatureDataUrl/i)
})

test('contract read model distinguishes empty, unavailable, and invalid states honestly', () => {
  const emptyModel = buildContractReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        contract: {
          status: 'empty',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            accepted: false,
            activeSignature: null,
            signaturesByUsername: {},
          },
          warnings: [],
        },
      },
    }),
  })
  const unavailableModel = buildContractReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        contract: {
          status: 'unavailable',
          source: 'legacy-local-storage',
          data: null,
          warnings: ['Browser storage is unavailable.'],
        },
      },
    }),
  })
  const invalidModel = buildContractReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    compatibilitySnapshot: createSnapshot({
      sources: {
        contract: {
          status: 'invalid',
          source: 'legacy-local-storage',
          data: {
            username: 'Jaylan',
            accepted: false,
            activeSignature: null,
            signaturesByUsername: {},
          },
          warnings: ['Stored JSON for memorybook_contract_signatures is malformed.'],
        },
      },
    }),
  })

  assert.equal(emptyModel.status, 'empty')
  assert.equal(unavailableModel.status, 'unavailable')
  assert.equal(invalidModel.status, 'invalid')
  assert.equal(emptyModel.agreement.status, 'unavailable')
  assert.equal(invalidModel.signatures.currentUser.label, 'Signature status unavailable')
})

test('contract read model keeps inputs immutable and avoids inventing partner status', () => {
  const snapshot = createSnapshot({
    sources: {
      profile: {
        status: 'empty',
        source: 'legacy-local-storage',
        data: {
          profilesByUsername: {},
          participantOrder: [],
          unknownTopLevelFields: {},
        },
        warnings: [],
      },
      contract: {
        status: 'ready',
        source: 'legacy-local-storage',
        data: {
          username: 'Jaylan',
          accepted: false,
          activeSignature: null,
          signaturesByUsername: {},
        },
        warnings: [],
      },
    },
  })
  const before = structuredClone(snapshot)

  const model = buildContractReadModel({
    approvedUser: {
      username: 'Jaylan',
      displayName: 'Jaylan',
    },
    compatibilitySnapshot: snapshot,
  })

  assert.equal(Object.isFrozen(model), true)
  assert.equal(Object.isFrozen(model.sourceStatus.items), true)
  assert.equal(model.acceptance.partner, null)
  assert.equal(model.signatures.partner, null)
  assert.deepEqual(snapshot, before)
})

test('contract feature sources stay read-only and keep unsafe public wording out of the model layer', async () => {
  const readModelSource = await readFile(new URL('../features/contract/contractReadModel.js', import.meta.url), 'utf8')
  const selectorsSource = await readFile(new URL('../features/contract/contractSelectors.js', import.meta.url), 'utf8')
  const hookSource = await readFile(new URL('../features/contract/useContractData.js', import.meta.url), 'utf8')

  assert.doesNotMatch(readModelSource, /localStorage|setItem|updateDoc|addDoc|deleteDoc|collection\(/)
  assert.doesNotMatch(selectorsSource, /pages\/contract\.html|Initialize MemoryBook|Sign & Open Vault|data:image|base64/i)
  assert.doesNotMatch(hookSource, /signIn|signOut|localStorage/)
})
