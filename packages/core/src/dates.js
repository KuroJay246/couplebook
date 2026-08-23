export const PARTNER_BIRTHDAY_MONTH = 9
export const PARTNER_BIRTHDAY_DAY = 16
export const PARTNER_BIRTHDAY_LABEL = 'September 16'

export function createDateAtNoon(dateLike) {
  if (!dateLike) return null

  const normalized = String(dateLike).trim()
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
    : new Date(normalized)
  if (Number.isNaN(date.getTime())) return null

  date.setHours(12, 0, 0, 0)
  return date
}

export function formatMonthDayLabel(dateLike, fallback = PARTNER_BIRTHDAY_LABEL) {
  const date = createDateAtNoon(dateLike)
  if (!date) return fallback

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}

export function calculateBirthdayCountdown(birthdayValue, nowValue = new Date()) {
  const birthday = createDateAtNoon(birthdayValue)
  const now = new Date(nowValue)

  if (!birthday || Number.isNaN(now.getTime())) {
    return {
      nextAge: null,
      isToday: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  }

  const nextBirthday = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate(), 0, 0, 0, 0)
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  if (currentDay > nextBirthday) {
    nextBirthday.setFullYear(now.getFullYear() + 1)
  }

  const isToday = birthday.getMonth() === now.getMonth() && birthday.getDate() === now.getDate()
  const nextAge = nextBirthday.getFullYear() - birthday.getFullYear()

  if (isToday) {
    return {
      nextAge,
      isToday: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  }

  const diffMs = nextBirthday.getTime() - now.getTime()

  return {
    nextAge,
    isToday: false,
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diffMs % (1000 * 60)) / 1000),
  }
}
