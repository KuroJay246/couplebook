const TRANSIENT_AUTHORIZATION_ERROR = /network|offline|unavailable|deadline|timeout|failed to fetch|resource-exhausted/i
const AUTHORITATIVE_AUTHORIZATION_ERROR = /permission|permission-denied|unauthenticated|auth\/|token|credential|insufficient permissions/i

export function shouldPreserveLastAuthorizedState({ error, lastAuthorizedState, nextUser }) {
  if (!lastAuthorizedState?.user?.uid || !nextUser?.uid) return false
  if (lastAuthorizedState.user.uid !== nextUser.uid) return false

  const code = String(error?.code || '')
  const message = String(error?.message || error || '')
  const signature = `${code} ${message}`.trim()
  if (!signature) return false
  if (AUTHORITATIVE_AUTHORIZATION_ERROR.test(signature)) return false
  return TRANSIENT_AUTHORIZATION_ERROR.test(signature)
}
