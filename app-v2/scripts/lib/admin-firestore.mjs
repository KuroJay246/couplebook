import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import process from 'node:process'
import { assertProjectArg, getArgValue, REQUIRED_PROJECT_ID } from './project-guard.mjs'

export function assertMediaBucketArg(args, projectId = REQUIRED_PROJECT_ID) {
  const bucketName = getArgValue(args, '--bucket')
  if (!bucketName) {
    throw new Error('--bucket is required for media apply.')
  }
  if (!/^[a-z0-9][a-z0-9.-]{2,120}[a-z0-9]$/.test(bucketName)) {
    throw new Error('Storage bucket name is malformed.')
  }
  if (!bucketName.includes(projectId)) {
    throw new Error('Storage bucket must belong to the Couple Book Firebase project.')
  }
  if (bucketName.includes('gathervibeshub')) {
    throw new Error('Refusing to use a prohibited Storage bucket.')
  }
  return bucketName
}

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

export async function initializeAdminMediaServices(args = process.argv.slice(2)) {
  const { db, projectId } = await initializeAdminFirestore(args)
  const app = getApps().find((candidate) => candidate.name === 'couplebook-migration')
  const bucketName = assertMediaBucketArg(args, projectId)
  const bucket = getStorage(app).bucket(bucketName)
  return { bucket, bucketName, db, projectId }
}
