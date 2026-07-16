import { LEGACY_LOCAL_DEV_SOURCE, LEGACY_LOCAL_STORAGE_SOURCE } from '../data/adapterUtils.js'

export const browserRegressionAuthorizedFixture = Object.freeze({
  enabled: true,
  auth: Object.freeze({
    status: 'authorized',
    user: Object.freeze({
      uid: 'browser-test-approved-reader',
      email: 'approved-reader@example.com',
      displayName: 'Approved Reader',
      metadata: Object.freeze({
        lastSignInTime: '2026-07-14T12:34:56.000Z',
      }),
    }),
    approvedUser: Object.freeze({
      username: 'Reader',
      displayName: 'Approved Reader',
      profileName: 'Approved Reader',
    }),
  }),
  compatibility: Object.freeze({
    state: 'ready',
    snapshot: Object.freeze({
      status: 'ready',
      sources: Object.freeze({
        settings: Object.freeze({
          status: 'ready',
          source: LEGACY_LOCAL_STORAGE_SOURCE,
          data: Object.freeze({
            username: 'Reader',
            theme: 'sunset',
            usedGlobalThemeFallback: false,
            settings: Object.freeze({
              anniversaryConfig: 'dual',
              privacyToggles: Object.freeze({
                localOnlyMode: true,
                hideOfflineWarning: false,
                unknownFields: Object.freeze({}),
              }),
              unknownFields: Object.freeze({}),
            }),
          }),
          warnings: Object.freeze([]),
        }),
        profile: Object.freeze({
          status: 'ready',
          source: LEGACY_LOCAL_STORAGE_SOURCE,
          data: Object.freeze({
            participantOrder: Object.freeze(['Reader', 'Partner']),
            profilesByUsername: Object.freeze({
              Reader: Object.freeze({
                name: 'Approved Reader',
                bio: '',
                avatar: '',
                anniversaryView: 'dual',
                joinedDate: '2026-02-14',
                birthday: null,
                unknownFields: Object.freeze({}),
              }),
              Partner: Object.freeze({
                name: 'Partner Record',
                bio: '',
                avatar: '',
                anniversaryView: 'partner',
                joinedDate: '2026-02-14',
                birthday: null,
                unknownFields: Object.freeze({}),
              }),
            }),
            unknownTopLevelFields: Object.freeze({}),
          }),
          warnings: Object.freeze([]),
        }),
        favorites: Object.freeze({
          status: 'ready',
          source: LEGACY_LOCAL_STORAGE_SOURCE,
          data: Object.freeze({
            books: ['Fictional keepsake'],
          }),
          warnings: Object.freeze([]),
        }),
        contract: Object.freeze({
          status: 'ready',
          source: LEGACY_LOCAL_STORAGE_SOURCE,
          data: Object.freeze({
            username: 'Reader',
            accepted: true,
            activeSignature: Object.freeze({
              accepted: true,
              timestamp: '2026-07-14T00:00:00.000Z',
              version: 'fixture-3',
              history: Object.freeze([]),
              unknownFields: Object.freeze({}),
              hasLegacyPayload: true,
              redactedFields: Object.freeze(['signature-data']),
            }),
            signaturesByUsername: Object.freeze({
              Reader: Object.freeze({
                accepted: true,
                timestamp: '2026-07-14T00:00:00.000Z',
                version: 'fixture-3',
                history: Object.freeze([]),
                unknownFields: Object.freeze({}),
                hasLegacyPayload: true,
                redactedFields: Object.freeze(['signature-data']),
              }),
              Partner: Object.freeze({
                accepted: false,
                timestamp: null,
                version: 'fixture-3',
                history: Object.freeze([]),
                unknownFields: Object.freeze({}),
                hasLegacyPayload: false,
                redactedFields: Object.freeze([]),
              }),
            }),
          }),
          warnings: Object.freeze([]),
        }),
        memories: Object.freeze({
          status: 'ready',
          source: LEGACY_LOCAL_DEV_SOURCE,
          data: Object.freeze({
            count: 2,
          }),
          warnings: Object.freeze([]),
        }),
      }),
      warnings: Object.freeze([]),
    }),
    error: '',
  }),
})

export const browserRegressionSignedOutFixture = Object.freeze({
  enabled: true,
  auth: Object.freeze({
    status: 'signed-out',
  }),
})
