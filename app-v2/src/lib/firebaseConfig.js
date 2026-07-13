function resolveAuthDomain(configuredDomain) {
  if (typeof window === 'undefined') return configuredDomain

  const currentHost = window.location.hostname
  if (currentHost.endsWith('.web.app') || currentHost.endsWith('.firebaseapp.com')) {
    return currentHost
  }

  return configuredDomain
}

function readEnv() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env
  }

  return {}
}

export function createFirebaseConfig(env = readEnv()) {
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: resolveAuthDomain(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  }
}

export function getMissingFirebaseConfigKeys(config = createFirebaseConfig()) {
  return ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'].filter((key) => {
    return typeof config[key] !== 'string' || config[key].trim().length === 0
  })
}

export function formatMissingFirebaseConfigMessage(missingKeys) {
  if (!missingKeys.length) return ''
  return `Firebase configuration is incomplete: ${missingKeys.join(', ')}`
}

export const firebaseConfig = createFirebaseConfig()
export const firebaseProjectId = firebaseConfig.projectId
export const missingFirebaseConfigKeys = getMissingFirebaseConfigKeys(firebaseConfig)
export const missingFirebaseConfigMessage = formatMissingFirebaseConfigMessage(missingFirebaseConfigKeys)
export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0
