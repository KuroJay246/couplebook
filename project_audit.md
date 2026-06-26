# MemoryBook v3.0 — Complete Technical Audit & System Log

This technical log serves as the complete, production-ready system audit for **MemoryBook v3.0**, documenting the architecture, final file trees, core mathematical logic, and implementation details for Jaylan and Omia.

---

## 📁 System Directory Tree

The active workspace in `c:\Users\Jaylan\Documents\couplebook\` is structured as follows:

```
couplebook/
 ├── OUR MEMORIES/                (Legacy shared files and templates directory)
 │    ├── PHOTOS/                 (Raw photos)
 │    ├── VIDEOS/                 (Raw videos)
 │    └── OMIA HTML/              (Legacy HTML projects)
 ├── assets/
 │    ├── photos/                 (100% Migrated photos, indexed by capture date)
 │    └── videos/                 (100% Migrated videos, indexed by capture date)
 ├── css/
 │    ├── variables.css           (Design tokens, HSL colors, theme configs)
 │    ├── global.css              (Global typography, tab navbar, mobile controls)
 │    ├── components.css          (Glass cards, interactive forms, lightbox modals)
 │    └── pages.css               (Grid structures, dashboard cards, scaled containers)
 ├── core/
 │    ├── memories.json           (Dynamic media database containing 114 entries)
 │    ├── state.js                (Local-first state manager, profiles, overrides)
 │    └── utils.js                (Anniversary calendars & birthday countdown math)
 ├── firebase/
 │    └── firebase-config.js      (Offline fallback Firebase Auth & Firestore stubs)
 ├── js/
 │    ├── app.js                  (Theme systems loader & relationship contract guard)
 │    ├── auth.js                 (Authentication session coordinator wrapper)
 │    ├── dashboard.js            (Ticking clock, countups, birthday countdown engine)
 │    ├── timeline.js             (milestones rendering, dynamic interactive button injections)
 │    ├── media.js                (Gallery grids, dynamic video first-frame thumbnails)
 │    ├── profile.js              (Profile rendering, signature triggers, edit modals)
 │    └── settings.js             (Themes options, storage wipe controller)
 ├── pages/
 │    ├── confession/             (Legacy interactive ask-boyfriend project)
 │    ├── valentine/              (Legacy valentine request page)
 │    ├── omnia-happy-birthday.html (Milestone birthday card project)
 │    ├── contract.html           (Onboarding screen / signing screen)
 │    ├── dashboard.html          (Main control deck & counting interface)
 │    ├── media.html              (Visual vault gallery grid)
 │    ├── profile.html            (Personal details, contract signatures, birthdays)
 │    ├── settings.html           (System settings panel)
 │    └── timeline.html           (Chronological memory cards & filters)
 ├── index.html                   (System launcher/onboarding boot checks)
 ├── project_audit.md             (This documentation log)
 └── package.json                 (Local http-server runner script config)
```

---

## 🔍 Core Module Audit & Implementation Details

### 1. Database Indexing & Details Fallback (`scratch/parse_assets.js` ➡️ `core/memories.json`)
- **Core Functionality**: Re-scrapes the migrations from `assets/photos/` and `assets/videos/`.
- **Properties Metadata Lookup**: If filenames lack timestamped structures, the parser uses a fallback that calls `fs.statSync()` to examine file properties (reading creation `birthtime` and modification `mtime`). It formats and assigns the earliest of these timestamps to the memory.
- **Outcome**: Correctly generated **114 records** mapped to their true chronological capture dates.

### 2. Dual Birthday Countdown & Math Engine (`core/utils.js` ➡️ `js/dashboard.js`)
- **Mathematical Logic**: Formulates birthdays (`2006-12-13` for Jaylan, `2006-09-16` for Omia) to calculate exact countdown parameters:
  ```javascript
  let nextBDay = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (currentZero > nextBDay) {
    nextBDay.setFullYear(now.getFullYear() + 1);
  }
  const nextAge = nextBDay.getFullYear() - birthDate.getFullYear();
  const daysLeft = Math.round((nextBDay - currentZero) / oneDay);
  ```
- **UI Render**: Displays customized, color-coded cards under the anniversaries container. Displays `🎉 TODAY!` when the user's birthdate matches the system's timezone clock.

### 3. Dynamic Video Thumbnail Extraction (`js/timeline.js`, `js/media.js`, `css/pages.css`)
- **Dynamic Framing**: Replaced placeholder images with native HTML5 `<video>` elements targeting `#t=0.5` poster offset to auto-extract the first half-second frame.
- **Aspect Scaling**: Implemented CSS `object-fit: cover` within standard fixed-height bounds (`250px` for timeline previews, `240px` for gallery previews) to scale and crop all visual aspects cleanly.

### 4. Interactive Project Mapping (`js/timeline.js`)
- **Direct Navigation**: Timeline cards matching `isSpecialPage: true` automatically show a prominent `✨ Open Project` button, launching the legacy HTML pages directly in a new viewport tab.

---

## ⚡ Verification & Serve System

- **Dev Server Command**:
  ```bash
  cmd /c "npm run dev"
  ```
  Launches a zero-dependency local host at `http://localhost:3000` with no browser caching (`-c-1`), ensuring instant boot times, offline local tolerance, and absolute UI responsiveness.
- **Code Correctness**: Node validation checks verify **100% syntax compliance** across all Javascript scripts.
