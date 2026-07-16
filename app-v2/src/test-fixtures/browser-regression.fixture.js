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
            profileName: 'Approved Reader',
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
          status: 'empty',
          source: LEGACY_LOCAL_STORAGE_SOURCE,
          data: null,
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
