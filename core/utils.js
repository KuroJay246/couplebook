// Helper Utilities for MemoryBook

/**
 * Calculates the exact duration elapsed since a starting date.
 * Accounts for leap years and differing month lengths.
 * @param {string|Date} startDateString - ISO format date (e.g. '2025-12-28')
 * @returns {Object} { years, months, days, hours, minutes, seconds, totalDays }
 */
export function getDurationSince(startDateString) {
  const start = new Date(startDateString);
  // Set start hour to midnight local time if it is a pure date string
  if (typeof startDateString === 'string' && startDateString.length <= 10) {
    start.setHours(0, 0, 0, 0);
  }
  
  const now = new Date();
  const diffMs = now - start;

  if (diffMs < 0) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0 };
  }

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  // Adjust negative sub-units (calendrical arithmetic)
  if (seconds < 0) {
    minutes--;
    seconds += 60;
  }
  if (minutes < 0) {
    hours--;
    minutes += 60;
  }
  if (hours < 0) {
    days--;
    hours += 24;
  }
  if (days < 0) {
    months--;
    // Get total days in the previous month relative to 'now'
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days, hours, minutes, seconds, totalDays };
}

/**
 * Formats a date string into a user-friendly format (e.g. "Dec 28, 2025")
 * @param {string} dateString - ISO format date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Prevent timezone offset shifting by setting hours to noon
  date.setHours(12, 0, 0, 0);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Sanitized string
 */
export function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Calculates remaining time and next age for a birthday.
 * @param {string} birthdayString - Format 'YYYY-MM-DD'
 * @returns {Object} { nextAge, isToday, totalMsLeft, days, hours, minutes, seconds }
 */
export function getBirthdayDetails(birthdayString) {
  if (!birthdayString) return { nextAge: 0, isToday: false, totalMsLeft: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const birthDate = new Date(birthdayString);
  const now = new Date();
  
  // Create birthday date in current year
  let nextBDay = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  
  // If birthday has already passed this year (by pure days, disregarding hours), set to next year
  const currentZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (currentZero > nextBDay) {
    nextBDay.setFullYear(now.getFullYear() + 1);
  }
  
  // Calculate next age based on the year of the next birthday
  const nextAge = nextBDay.getFullYear() - birthDate.getFullYear();
  
  // Calculate ms difference using real time
  const diffMs = nextBDay.getTime() - now.getTime();
  
  // Check if today
  const isToday = birthDate.getMonth() === now.getMonth() && birthDate.getDate() === now.getDate();
  
  if (isToday) {
    return { nextAge, isToday: true, totalMsLeft: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  // Time calculations
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return { nextAge, isToday: false, totalMsLeft: diffMs, days, hours, minutes, seconds };
}
