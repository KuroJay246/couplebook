import { readUserProfileByUid } from './userService.js'

export function deriveDisplayName(firebaseUser, approvedUser) {
  if (approvedUser?.username) return approvedUser.username
  if (approvedUser?.profileName) return approvedUser.profileName

  const source = firebaseUser?.displayName || firebaseUser?.email || ''
  const prefix = source.split('@')[0] || ''
  if (!prefix) return ''
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase()
}

export async function resolveApprovedUser(firebaseUser, options = {}) {
  if (!firebaseUser?.uid) {
    return { status: 'signed-out', approvedUser: null }
  }

  const readUser = options.readUserProfileByUid || readUserProfileByUid
  const approvedUser = await readUser(firebaseUser.uid, options)

  if (!approvedUser) {
    return { status: 'unauthorized', approvedUser: null }
  }

  if (approvedUser.approved !== true || approvedUser.accessStatus !== 'active') {
    return { status: 'pending', approvedUser: null }
  }

  return {
    status: 'authorized',
    approvedUser: {
      ...approvedUser,
      displayName: deriveDisplayName(firebaseUser, approvedUser),
    },
  }
}
