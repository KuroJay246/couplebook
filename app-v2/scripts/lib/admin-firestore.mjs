import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import process from 'node:process'
import { assertProjectArg, REQUIRED_PROJECT_ID } from './project-guard.mjs'

export async function initializeAdminFirestore(args = process.argv.slice(2)) {
  const projectId = assertProjectArg(args)
  if (projectId !== REQUIRED_PROJECT_ID) {
    throw new Error('Refusing to initialize Admin SDK for an unexpected project.')
  }

  const credential = applicationDefault()
  try {
    await credential.getAccessToken()
  } catch {
    throw new Error('Application Default Credentials are unavailable for the privileged migration.')
  }

  const app = getApps().find((candidate) => candidate.name === 'couplebook-migration') || initializeApp(
    {
      credential,
      projectId,
    },
    'couplebook-migration',
  )
  const db = getFirestore(app)

  await db.doc('_migrationCredentialChecks/project').get()

  return { db, projectId }
}
