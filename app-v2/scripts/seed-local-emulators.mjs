import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')
const envFilePath = path.join(appRoot, '.env.emulator.local')

function parseEnvFile(contents) {
  const values = {}
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

async function loadLocalEnvFile(filePath) {
  try {
    const contents = await readFile(filePath, 'utf8')
    return parseEnvFile(contents)
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
}

function requireValue(key, runtimeEnv) {
  const value = String(runtimeEnv[key] || '').trim()
  if (!value) {
    throw new Error(`${key} is required for local emulator seeding.`)
  }
  return value
}

async function clearAuthUsers(authHost, projectId) {
  const response = await globalThis.fetch(`http://${authHost}/emulator/v1/projects/${projectId}/accounts`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to clear Auth emulator accounts: ${response.status} ${response.statusText}`)
  }
}

async function createAuthUser(authHost, email, password) {
  const response = await globalThis.fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.localId) {
    throw new Error(`Failed to create Auth emulator user: ${payload?.error?.message || response.statusText}`)
  }
  return payload
}

async function seedFirestore(projectId, firestoreHost, firestorePort, ownerUid) {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: firestoreHost,
      port: firestorePort,
    },
  })

  try {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      const partnerUid = 'partner_reader'
      const coupleId = 'couple_alpha'

      await setDoc(doc(db, 'users', ownerUid), {
        approved: true,
        accessStatus: 'active',
        coupleId,
        username: 'Jaylan',
        profile: { name: 'Jaylan' },
        contractAccepted: true,
        theme: 'sunset',
        favorites: { food: ['Ramen'] },
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'users', partnerUid), {
        approved: true,
        accessStatus: 'active',
        coupleId,
        username: 'Omia',
        profile: { name: 'Omia' },
        contractAccepted: false,
        theme: 'paper',
        favorites: { food: ['Fruit tea'] },
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId), {
        title: 'Jaylan and Omia',
        migrationVersion: 2,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'members', ownerUid), {
        active: true,
        role: 'member',
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'members', partnerUid), {
        active: true,
        role: 'member',
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'profiles', ownerUid), {
        name: 'Jaylan',
        bio: 'Local emulator owner profile for Couple Book QA.',
        anniversaryView: 'jaylan',
        joinedDate: '2026-02-14',
        birthday: '1995-07-21',
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'profiles', partnerUid), {
        name: 'Omia',
        bio: 'Local emulator partner profile for Couple Book QA.',
        anniversaryView: 'omia',
        joinedDate: '2026-02-14',
        birthday: '1996-02-18',
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'favorites', ownerUid), {
        food: ['Ramen', 'Jerk chicken'],
        songs: ['Safe and Sound'],
        movies: ['Pride & Prejudice'],
        places: ['Harbour walk'],
        memories: ['First trip'],
        notes: ['Local QA seed'],
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'favorites', partnerUid), {
        food: ['Fruit tea'],
        songs: ['Best Part'],
        movies: ['Past Lives'],
        places: ['Clifftop view'],
        memories: ['Sunset dinner'],
        notes: ['Partner local QA seed'],
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'settings', 'shared'), {
        theme: 'paper',
        anniversaryView: 'dual',
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'settings', ownerUid), {
        appearanceTheme: 'midnight-rose',
        anniversaryView: 'dual',
        privacy: {
          localOnlyMode: true,
          reducedMotion: false,
        },
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'contracts', 'current'), {
        title: 'Shared Relationship Contract',
        bodyStatus: 'ready',
        acceptedBy: [ownerUid],
        signatureStatus: 'status-only',
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'memories', 'seed_memory_active_001'), {
        title: 'First harbor walk',
        description: 'A local emulator seed memory for Story and Album QA.',
        date: '2026-05-10',
        tags: ['qa', 'album'],
        mediaState: 'none',
        createdBy: ownerUid,
        updatedBy: ownerUid,
        status: 'active',
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'memories', 'seed_memory_archived_001'), {
        title: 'Archived café note',
        description: 'An archived seed memory for archive-view QA.',
        date: '2026-03-02',
        tags: ['qa', 'archived'],
        mediaState: 'none',
        createdBy: ownerUid,
        updatedBy: ownerUid,
        status: 'archived',
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'plans', 'seed_plan_idea_001'), {
        title: 'Bookstore date',
        category: 'Date Idea',
        status: 'idea',
        targetDate: '2026-09-12',
        notes: 'Seed plan for create/edit/filter QA.',
        createdBy: ownerUid,
        updatedBy: ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        convertedMemoryId: '',
        revision: 1,
        schemaVersion: 1,
      })
      await setDoc(doc(db, 'couples', coupleId, 'plans', 'seed_plan_completed_001'), {
        title: 'Anniversary dinner',
        category: 'Restaurant',
        status: 'completed',
        targetDate: '2026-06-14',
        notes: 'Completed seed plan for plan-to-memory QA.',
        createdBy: ownerUid,
        updatedBy: ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        convertedMemoryId: '',
        revision: 1,
        schemaVersion: 1,
      })
      for (const [momentKey, title] of [
        ['birthday', 'Birthday chapter'],
        ['valentine', 'Valentine chapter'],
        ['confession', 'Confession chapter'],
      ]) {
        await setDoc(doc(db, 'couples', coupleId, 'specialMoments', momentKey), {
          title,
          subtitle: 'Local emulator QA seed',
          date: '2026-08-01',
          sections: [
            { kind: 'paragraph', content: `Seed content for ${momentKey}.` },
            { kind: 'list', heading: 'Seeded details', items: ['One', 'Two'] },
          ],
          revision: 1,
          schemaVersion: 1,
        })
      }
    })
  } finally {
    await env.cleanup()
  }
}

async function main() {
  const fileEnv = await loadLocalEnvFile(envFilePath)
  const runtimeEnv = { ...fileEnv, ...process.env }

  const projectId = String(runtimeEnv.COUPLEBOOK_EMULATOR_PROJECT_ID || 'couplebook-97830').trim()
  const authHost = String(runtimeEnv.COUPLEBOOK_AUTH_EMULATOR_HOST || '127.0.0.1:9099').trim()
  const [firestoreHost, firestorePortValue] = String(runtimeEnv.COUPLEBOOK_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085').trim().split(':')
  const firestorePort = Number.parseInt(firestorePortValue || '8085', 10)
  const ownerEmail = requireValue('COUPLEBOOK_EMULATOR_OWNER_EMAIL', runtimeEnv)
  const ownerPassword = requireValue('COUPLEBOOK_EMULATOR_OWNER_PASSWORD', runtimeEnv)

  await clearAuthUsers(authHost, projectId)
  const ownerAccount = await createAuthUser(authHost, ownerEmail, ownerPassword)
  await seedFirestore(projectId, firestoreHost || '127.0.0.1', firestorePort, ownerAccount.localId)

  process.stdout.write(`Local Couple Book emulators seeded for ${projectId}.\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
