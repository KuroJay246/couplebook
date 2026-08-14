import { freezeClone } from '../../data/adapterUtils.js'

function dateParts(memory) {
  if (memory?.date?.status !== 'valid') return null
  if (!memory.date.month || !memory.date.day || !memory.date.year) return null
  return {
    day: memory.date.day,
    month: memory.date.month,
    year: memory.date.year,
  }
}

function isLeapDay(parts) {
  return parts?.month === 2 && parts?.day === 29
}

function matchesToday(parts, todayParts) {
  if (!parts || !todayParts) return false
  if (parts.month === todayParts.month && parts.day === todayParts.day) return true
  return isLeapDay(parts) && todayParts.month === 2 && todayParts.day === 28
}

export function selectOnThisDayMemory(memories = [], now = new Date()) {
  const todayParts = {
    day: now.getUTCDate(),
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  }

  const matches = memories
    .filter((memory) => memory.status !== 'archived')
    .filter((memory) => {
      const parts = dateParts(memory)
      return parts && parts.year < todayParts.year && matchesToday(parts, todayParts)
    })
    .sort((left, right) => {
      const leftYear = left.date.year || 0
      const rightYear = right.date.year || 0
      if (leftYear !== rightYear) return rightYear - leftYear
      return (left.sort?.ordinal || 0) - (right.sort?.ordinal || 0)
    })

  return freezeClone(matches[0] || null)
}
