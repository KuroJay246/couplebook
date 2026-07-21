import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { isFirestoreWriteMode } from '../data/writeMode.js'
import { db } from '../lib/firebaseClient.js'
import {
  currentContractPath,
  favoritesPath,
  memberPath,
  memoryPath,
  privateSettingsPath,
  profilePath,
  specialMomentPath,
} from './firestorePaths.js'

export const FAVORITE_WRITE_CATEGORIES = Object.freeze(['food', 'songs', 'movies', 'places', 'memories', 'notes'])
export const APPEARANCE_THEMES = Object.freeze(['paper', 'rose', 'olive', 'plum'])
export const MEMORY_TYPES = Object.freeze(['ordinary', 'birthday', 'valentine', 'confession'])
export const SPECIAL_SECTION_KINDS = Object.freeze(['paragraph', 'note', 'quote', 'list'])

const UNSAFE_TEXT_PATTERN = /<\s*\/?\s*(script|style|iframe|object|embed|img|video|audio)\b|on[a-z]+\s*=|javascript:|<[^>]+>/i

function cleanText(value, maxLength, label, { required = false } = {}) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (required && !text) throw new Error(`${label} is required.`)
  if (!text) return ''
  if (text.length > maxLength) throw new Error(`${label} is too long.`)
  if (UNSAFE_TEXT_PATTERN.test(text)) throw new Error(`${label} contains unsafe markup.`)
  return text
}

function cleanStringList(value, { label, maxItems = 20, maxLength = 80 } = {}) {
  if (!Array.isArray(value)) return []
  const result = []
  for (const item of value) {
    const text = cleanText(item, maxLength, label || 'Entry')
    if (text && !result.includes(text)) result.push(text)
    if (result.length >= maxItems) break
  }
  return result
}

function cleanDate(value) {
  const text = cleanText(value, 10, 'Date', { required: true })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Date must use YYYY-MM-DD.')
  const parsed = new Date(`${text}T00:00:00.000Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new Error('Date must be a real calendar date.')
  }
  return text
}

function docRef(firestore, path, createDoc = doc) {
  return createDoc(firestore, ...path)
}

function resolveCoupleId(approvedUser) {
  return approvedUser?.coupleId || approvedUser?.raw?.coupleId || ''
}

async function assertWriteContext({ approvedUser, createDoc = doc, env, firestore = db, getDocument = getDoc, user }) {
  if (!firestore) throw new Error('Firestore is not configured.')
  if (!isFirestoreWriteMode(env)) {
    throw new Error('Firestore writes are disabled outside approved Firestore write mode.')
  }
  if (!user?.uid || !approvedUser?.uid || user.uid !== approvedUser.uid) {
    throw new Error('An authenticated approved user is required before writing.')
  }

  const coupleId = resolveCoupleId(approvedUser)
  if (!coupleId) throw new Error('Approved user document must provide the coupleId.')

  const membership = await getDocument(docRef(firestore, memberPath(coupleId, user.uid), createDoc))
  const membershipData = membership.exists() ? membership.data() : null
  if (membershipData?.active !== true || membershipData?.role !== 'member') {
    throw new Error('Active couple membership is required before writing.')
  }

  return { coupleId, createDoc, firestore, getDocument, uid: user.uid }
}

export async function saveOwnProfile(payload, context) {
  const { coupleId, createDoc, firestore, uid } = await assertWriteContext(context)
  const writeDocument = context.setDocument || setDoc
  const next = {
    schemaVersion: 1,
    name: cleanText(payload.name, 80, 'Name', { required: true }),
    bio: cleanText(payload.bio, 500, 'Bio'),
    anniversaryView: cleanText(payload.anniversaryView, 40, 'Anniversary view'),
    joinedDate: payload.joinedDate ? cleanDate(payload.joinedDate) : '',
    birthday: payload.birthday ? cleanDate(payload.birthday) : '',
  }
  await writeDocument(docRef(firestore, profilePath(coupleId, uid), createDoc), next, { merge: true })
  return next
}

export async function saveOwnFavorites(payload, context) {
  const { coupleId, createDoc, firestore, uid } = await assertWriteContext(context)
  const writeDocument = context.setDocument || setDoc
  const next = { schemaVersion: 1 }
  for (const category of FAVORITE_WRITE_CATEGORIES) {
    next[category] = cleanStringList(payload[category], { label: category, maxItems: 50, maxLength: 120 })
  }
  await writeDocument(docRef(firestore, favoritesPath(coupleId, uid), createDoc), next, { merge: true })
  return next
}

export async function saveOwnSettings(payload, context) {
  const { coupleId, createDoc, firestore, uid } = await assertWriteContext(context)
  const writeDocument = context.setDocument || setDoc
  const theme = cleanText(payload.theme, 40, 'Theme') || 'paper'
  if (!APPEARANCE_THEMES.includes(theme)) throw new Error('Theme is not supported.')
  const next = {
    schemaVersion: 1,
    theme,
    anniversaryView: cleanText(payload.anniversaryView, 40, 'Anniversary view'),
    privacy: {
      localOnlyMode: payload.localOnlyMode === true,
      reducedMotion: payload.reducedMotion === true,
    },
  }
  await writeDocument(docRef(firestore, privateSettingsPath(coupleId, uid), createDoc), next, { merge: true })
  return next
}

export async function saveMemory(memoryId, payload, context) {
  const { coupleId, createDoc, firestore, uid } = await assertWriteContext(context)
  const writeDocument = context.setDocument || setDoc
  const type = cleanText(payload.specialMomentType, 40, 'Memory type') || 'ordinary'
  if (!MEMORY_TYPES.includes(type)) throw new Error('Memory type is not supported.')
  const next = {
    schemaVersion: 1,
    title: cleanText(payload.title, 180, 'Title', { required: true }),
    description: cleanText(payload.description, 2000, 'Description'),
    date: cleanDate(payload.date),
    tags: cleanStringList(payload.tags, { label: 'Tag', maxItems: 30, maxLength: 60 }),
    mediaState: 'none',
    createdBy: uid,
    updatedBy: uid,
    status: payload.status === 'archived' ? 'archived' : 'active',
  }
  if (type !== 'ordinary') next.specialMomentType = type
  await writeDocument(docRef(firestore, memoryPath(coupleId, memoryId), createDoc), next, { merge: true })
  return next
}

export async function acceptContract(context) {
  const { coupleId, createDoc, firestore, getDocument, uid } = await assertWriteContext(context)
  const writeDocument = context.setDocument || setDoc
  const reference = docRef(firestore, currentContractPath(coupleId), createDoc)
  const snapshot = await getDocument(reference)
  const acceptedBy = new Set(snapshot.exists() && Array.isArray(snapshot.data().acceptedBy) ? snapshot.data().acceptedBy : [])
  acceptedBy.add(uid)
  const next = {
    acceptedBy: [...acceptedBy].slice(0, 2),
    signatureStatus: 'status-only',
    schemaVersion: 1,
  }
  await writeDocument(reference, next, { merge: true })
  return next
}

export async function saveSpecialMomentText(momentType, payload, context) {
  const { coupleId, createDoc, firestore } = await assertWriteContext(context)
  const writeDocument = context.setDocument || setDoc
  const sections = Array.isArray(payload.sections) ? payload.sections : []
  const next = {
    schemaVersion: 1,
    title: cleanText(payload.title, 120, 'Title', { required: true }),
    subtitle: cleanText(payload.subtitle, 180, 'Subtitle'),
    date: payload.date ? cleanDate(payload.date) : '',
    sections: sections.slice(0, 8).map((section) => {
      const kind = cleanText(section.kind, 20, 'Section type') || 'paragraph'
      if (!SPECIAL_SECTION_KINDS.includes(kind)) throw new Error('Section type is not supported.')
      return {
        kind,
        content: cleanText(section.content, 1200, 'Section content', { required: true }),
      }
    }),
  }
  await writeDocument(docRef(firestore, specialMomentPath(coupleId, momentType), createDoc), next, { merge: true })
  return next
}

export async function archiveMemory(memoryId, context) {
  const { coupleId, createDoc, firestore, uid } = await assertWriteContext(context)
  const patchDocument = context.updateDocument || updateDoc
  const next = { status: 'archived', updatedBy: uid, schemaVersion: 1 }
  await patchDocument(docRef(firestore, memoryPath(coupleId, memoryId), createDoc), next)
  return next
}
