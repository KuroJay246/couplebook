import { escapeHTML } from '../core/utils.js';

const STORAGE_KEY = 'memorybook_favorites';

const defaultFavorites = {
  jaylan: { food: [], places: [], hobbies: [], activities: [] },
  omia: { food: [], places: [], hobbies: [], activities: [] }
};

const FAVORITE_PEOPLE = Object.keys(defaultFavorites);
const FAVORITE_CATEGORIES = Object.keys(defaultFavorites.jaylan);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFavorites(raw) {
  const normalized = isPlainObject(raw) ? { ...raw } : {};

  FAVORITE_PEOPLE.forEach((person) => {
    const existingPerson = isPlainObject(normalized[person]) ? normalized[person] : {};
    normalized[person] = { ...existingPerson };

    FAVORITE_CATEGORIES.forEach((category) => {
      normalized[person][category] = Array.isArray(existingPerson[category]) ? existingPerson[category] : [];
    });
  });

  return normalized;
}

function getFavorites() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultFavorites));
    return defaultFavorites;
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = normalizeFavorites(parsed);

    if (JSON.stringify(normalized) !== stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultFavorites));
    return defaultFavorites;
  }
}

function saveFavorites(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderFavorites();
  // Push favorites to Firestore (fire-and-forget, non-blocking)
  import('../core/firestoreSync.js').then(({ firestoreSync }) => {
    firestoreSync.syncUserData();
  }).catch(() => {}); // silently skip if offline
}

function renderFavorites() {
  const favs = getFavorites();
  
  const renderList = (person, category) => {
    const listEl = document.getElementById(`${person.charAt(0)}-${category}-list`);
    if (!listEl) return;
    
    listEl.innerHTML = '';
    const items = favs[person][category];
    
    if (items.length === 0) {
      listEl.innerHTML = `<li style="color: var(--color-muted); font-size: 0.85rem;">Nothing added yet.</li>`;
      return;
    }
    
    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${escapeHTML(item)}</span>
        <button class="btn-icon" onclick="removeFavorite('${person}', '${category}', ${index})" title="Remove">&times;</button>
      `;
      listEl.appendChild(li);
    });
  };

  renderList('jaylan', 'food');
  renderList('jaylan', 'places');
  renderList('jaylan', 'hobbies');
  renderList('jaylan', 'activities');

  renderList('omia', 'food');
  renderList('omia', 'places');
  renderList('omia', 'hobbies');
  renderList('omia', 'activities');
}

window.addFavorite = (person, category) => {
  const item = prompt(`Add a new favorite ${category} for ${person}:`);
  if (item && item.trim()) {
    const favs = getFavorites();
    favs[person][category].push(item.trim());
    saveFavorites(favs);
  }
};

window.removeFavorite = (person, category, index) => {
  const favs = getFavorites();
  favs[person][category].splice(index, 1);
  saveFavorites(favs);
};

document.addEventListener('DOMContentLoaded', () => {
  renderFavorites();
});
