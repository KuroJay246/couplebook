// Dashboard Scripting for MemoryBook
import { state } from '../core/state.js';
import { getDurationSince, getBirthdayDetails, formatDate, escapeHTML } from '../core/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initAnniversaries();
  initRecentMemories();
  initBirthdays();
});

// 1. Live Clock Logic
function initClock() {
  const clockEl = document.getElementById('dashboard-clock');
  const dateEl = document.getElementById('dashboard-date');

  if (!clockEl || !dateEl) return;

  const updateClock = () => {
    const now = new Date();
    
    // Time format: HH:MM:SS AM/PM
    clockEl.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // Date format: Day, Month Date, Year
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  updateClock();
  setInterval(updateClock, 1000);
}

// 2. Dual Anniversary Counter Logic
function initAnniversaries() {
  const jaylanDate = '2025-12-28';
  const omiaDate = '2025-12-29';

  // Apply layout settings (Show Both, Jaylan-Only, Omia-Only)
  const settings = state.getSettings();
  const config = settings.anniversaryConfig || 'dual';
  
  const cardJaylan = document.getElementById('card-jaylan-anniversary');
  const cardOmia = document.getElementById('card-omia-anniversary');

  if (cardJaylan && cardOmia) {
    if (config === 'jaylan') {
      cardOmia.style.display = 'none';
      cardJaylan.style.gridColumn = 'span 2';
    } else if (config === 'omia') {
      cardJaylan.style.display = 'none';
      cardOmia.style.gridColumn = 'span 2';
    } else {
      cardJaylan.style.display = 'block';
      cardOmia.style.display = 'block';
    }
  }

  // Update counters
  const updateCounters = () => {
    // Jaylan Counter (Dec 28)
    const jDur = getDurationSince(jaylanDate);
    const jYearsEl = document.getElementById('j-years');
    const jMonthsEl = document.getElementById('j-months');
    const jDaysEl = document.getElementById('j-days');
    const jSecondsEl = document.getElementById('j-seconds');
    const jSubtextEl = document.getElementById('j-subtext');

    if (jYearsEl && jMonthsEl && jDaysEl && jSecondsEl) {
      jYearsEl.textContent = String(jDur.years).padStart(2, '0');
      jMonthsEl.textContent = String(jDur.months).padStart(2, '0');
      jDaysEl.textContent = String(jDur.days).padStart(2, '0');
      jSecondsEl.textContent = String(jDur.seconds).padStart(2, '0');
      jSubtextEl.textContent = `Total of ${jDur.totalDays} beautiful days together.`;
    }

    // Omia Counter (Dec 29)
    const oDur = getDurationSince(omiaDate);
    const oYearsEl = document.getElementById('o-years');
    const oMonthsEl = document.getElementById('o-months');
    const oDaysEl = document.getElementById('o-days');
    const oSecondsEl = document.getElementById('o-seconds');
    const oSubtextEl = document.getElementById('o-subtext');

    if (oYearsEl && oMonthsEl && oDaysEl && oSecondsEl) {
      oYearsEl.textContent = String(oDur.years).padStart(2, '0');
      oMonthsEl.textContent = String(oDur.months).padStart(2, '0');
      oDaysEl.textContent = String(oDur.days).padStart(2, '0');
      oSecondsEl.textContent = String(oDur.seconds).padStart(2, '0');
      oSubtextEl.textContent = `Total of ${oDur.totalDays} beautiful days together.`;
    }
  };

  updateCounters();
  setInterval(updateCounters, 1000);
}

// 3. Render 3 Recent Memories
async function initRecentMemories() {
  const container = document.getElementById('recent-memories-container');
  if (!container) return;

  const memories = await state.getMemories();
  
  if (memories.length === 0) {
    container.innerHTML = `
      <p style="grid-column: span 3; text-align: center; color: var(--color-muted); padding: 2rem 0;">
        No memories added yet. Visit <a href="timeline.html" style="color: var(--color-jaylan);">Memories</a> to add one!
      </p>
    `;
    return;
  }

  // Get the most recent 3 memories
  const recent = memories.slice(0, 3);
  let html = '';

  recent.forEach(mem => {
    let mediaEl = '';
    if (mem.isVideo) {
      mediaEl = `<video preload="metadata" muted playsinline class="recent-img" style="filter: brightness(0.65);" onerror="this.onerror=null; this.style.display='none';">
        <source src="${mem.media}#t=0.5" type="video/mp4">
      </video>
      <img src="/assets/photos/anniversary_2025.png" class="recent-img" alt="${escapeHTML(mem.title)}" style="display:none;">`;
    } else {
      mediaEl = `<img src="${mem.media}" alt="${escapeHTML(mem.title)}" class="recent-img" onerror="this.onerror=null; this.src='/assets/photos/anniversary_2025.png';">`;
    }
    
    html += `
      <div class="recent-item" onclick="window.location.href='timeline.html'">
        ${mediaEl}
        <div class="recent-overlay">
          <div class="recent-item-title">${escapeHTML(mem.title)}</div>
          <div class="recent-item-date">${formatDate(mem.date)}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// 4. Birthday Countdown Logic
function initBirthdays() {
  const profiles = state.getProfiles();
  const j = profiles.Jaylan;
  const o = profiles.Omia;

  const updateBirthdays = () => {
    if (j && j.birthday) {
      const details = getBirthdayDetails(j.birthday);
      const countdownEl = document.getElementById('jaylan-birthday-countdown');
      const ageEl = document.getElementById('jaylan-birthday-age');
      const dateEl = document.getElementById('jaylan-birthday-date');
      
      if (countdownEl && ageEl) {
        if (details.isToday) {
          countdownEl.textContent = "🎉 TODAY!";
          ageEl.textContent = `Turning ${details.nextAge}!`;
        } else {
          countdownEl.textContent = `${details.days}d ${details.hours}h ${details.minutes}m ${details.seconds}s`;
          ageEl.textContent = `Turning ${details.nextAge}`;
        }
        dateEl.textContent = formatDate(j.birthday);
      }
    }

    if (o && o.birthday) {
      const details = getBirthdayDetails(o.birthday);
      const countdownEl = document.getElementById('omia-birthday-countdown');
      const ageEl = document.getElementById('omia-birthday-age');
      const dateEl = document.getElementById('omia-birthday-date');
      
      if (countdownEl && ageEl) {
        if (details.isToday) {
          countdownEl.textContent = "🎉 TODAY!";
          ageEl.textContent = `Turning ${details.nextAge}!`;
        } else {
          countdownEl.textContent = `${details.days}d ${details.hours}h ${details.minutes}m ${details.seconds}s`;
          ageEl.textContent = `Turning ${details.nextAge}`;
        }
        dateEl.textContent = formatDate(o.birthday);
      }
    }
  };

  updateBirthdays();
  setInterval(updateBirthdays, 1000);
}
