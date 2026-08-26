const RAW_PERMISSION = /permission|insufficient permissions|permission-denied/i
const RAW_NETWORK = /network|offline|unavailable|deadline|timeout/i

export function toUserFacingError(error, fallback = 'Something went wrong. Try again.') {
  const message = String(error?.message || error || '').trim()
  if (RAW_PERMISSION.test(message)) return 'Your access to this Couple Book could not be confirmed. Try again.'
  if (RAW_NETWORK.test(message)) return 'We could not load this right now. Try again.'
  if (!message || /firebase|firestore|storage|auth\/|stack|error code/i.test(message)) return fallback
  return message
}

export function toAuthError(error, fallback = 'We could not sign you in. Check your details and try again.') {
  const message = String(error?.message || error || '').trim()
  if (RAW_PERMISSION.test(message)) return 'This account is not connected to this Couple Book.'
  if (/user-not-found|wrong-password|invalid-credential|invalid-email/i.test(message)) return fallback
  if (RAW_NETWORK.test(message)) return 'We could not sign you in right now. Try again.'
  return fallback
}
