// Media Gallery Controller for MemoryBook
import { state } from '../core/state.js';
import { formatDate, escapeHTML } from '../core/utils.js';

let activeFilter = 'all';
let activeMediaId = null;

const galleryItemsById = new Map();

const PHOTO_TITLE_PATTERN = /^Photo from\b/i;
const VIDEO_TITLE_PATTERN = /^Video Clip\b/i;
const GENERIC_ARCHIVE_DESCRIPTION = /^(A beautiful shared moment captured on|A video memory recorded on)\b/i;

const PHOTO_CARD_STATUS = 'Private photo stored locally';
const VIDEO_CARD_STATUS = 'Private video stored locally';
const PHOTO_CARD_NOTE = 'Story preserved — image stays private.';
const VIDEO_CARD_NOTE = 'This video remains on the original device.';
const MEDIA_UNAVAILABLE_DETAIL = 'Media unavailable in this environment.';

const PHOTO_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
    <defs>
      <linearGradient id="gallery-photo" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff4a6b" />
        <stop offset="56%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
    </defs>
    <rect width="960" height="720" fill="url(#gallery-photo)" />
    <circle cx="760" cy="152" r="94" fill="rgba(255,255,255,0.12)" />
    <circle cx="180" cy="560" r="124" fill="rgba(255,255,255,0.08)" />
    <g fill="#ffffff" font-family="Georgia, serif" text-anchor="middle">
      <text x="480" y="300" font-size="42" font-weight="700">Private photo placeholder</text>
      <text x="480" y="352" font-size="20" fill="rgba(255,255,255,0.84)">The original image stays on the original device.</text>
      <text x="480" y="386" font-size="20" fill="rgba(255,255,255,0.84)">The memory remains visible without exposing private files.</text>
    </g>
  </svg>
`)}`;

const VIDEO_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
    <defs>
      <linearGradient id="gallery-video" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#111827" />
        <stop offset="48%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#ff4a6b" />
      </linearGradient>
    </defs>
    <rect width="960" height="720" fill="url(#gallery-video)" />
    <circle cx="220" cy="170" r="88" fill="rgba(255,255,255,0.08)" />
    <circle cx="760" cy="560" r="128" fill="rgba(255,255,255,0.1)" />
    <g fill="#ffffff" text-anchor="middle">
      <text x="480" y="252" font-size="88">▶</text>
      <text x="480" y="336" font-family="Georgia, serif" font-size="42" font-weight="700">Private video placeholder</text>
      <text x="480" y="386" font-size="20" fill="rgba(255,255,255,0.82)">This clip remains local to the original device.</text>
      <text x="480" y="420" font-size="20" fill="rgba(255,255,255,0.82)">The story still stays visible here.</text>
    </g>
  </svg>
`)}`;

document.addEventListener('DOMContentLoaded', () => {
  window.__memoryBookMarkGalleryMediaUnavailable = markGalleryMediaUnavailable;
  renderGallery();
  setupGalleryFilters();
  setupLightbox();
  setupVideoModal();
  setupEditModal();
});

function formatGalleryDate(dateValue) {
  if (typeof dateValue === 'string') {
    const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  return formatDate(dateValue);
}

function getDisplayTitle(item) {
  const rawTitle = (item.title || '').trim();
  const displayDate = formatGalleryDate(item.date);

  if (!rawTitle) {
    return item.isVideo ? `A video memory from ${displayDate}` : `A photo from ${displayDate}`;
  }

  if (PHOTO_TITLE_PATTERN.test(rawTitle)) {
    return `A photo from ${displayDate}`;
  }

  if (VIDEO_TITLE_PATTERN.test(rawTitle)) {
    return `A video memory from ${displayDate}`;
  }

  return rawTitle;
}

function getDisplaySupportText(item) {
  const rawDescription = (item.description || '').trim();

  if (item.isSpecialPage) {
    return rawDescription || 'A special page from your story.';
  }

  if (!rawDescription || GENERIC_ARCHIVE_DESCRIPTION.test(rawDescription)) {
    return 'Saved in our private archive.';
  }

  return rawDescription;
}

function getTypeLabel(item) {
  if (item.isSpecialPage) return 'Special page';
  return item.isVideo ? 'Video memory' : 'Photo memory';
}

function getUnavailableStatus(item) {
  return item.isVideo ? VIDEO_CARD_STATUS : PHOTO_CARD_STATUS;
}

function getUnavailableNote(item) {
  return item.isVideo ? VIDEO_CARD_NOTE : PHOTO_CARD_NOTE;
}

function getPlaceholderForItem(item) {
  return item.isVideo ? VIDEO_PLACEHOLDER : PHOTO_PLACEHOLDER;
}

function updateGallerySummary(mediaItems, filtered) {
  const photos = mediaItems.filter((item) => !item.isVideo).length;
  const videos = mediaItems.filter((item) => item.isVideo).length;

  const statAll = document.getElementById('gallery-stat-all');
  const statPhotos = document.getElementById('gallery-stat-photos');
  const statVideos = document.getElementById('gallery-stat-videos');
  const filterSummary = document.getElementById('gallery-filter-summary');
  const filterDetail = document.getElementById('gallery-filter-detail');

  if (statAll) statAll.textContent = String(mediaItems.length);
  if (statPhotos) statPhotos.textContent = String(photos);
  if (statVideos) statVideos.textContent = String(videos);

  if (!filterSummary || !filterDetail) return;

  if (activeFilter === 'photos') {
    filterSummary.textContent = `${photos} photos from your story`;
    filterDetail.textContent = 'Still frames, shared snapshots, and private images that stay tied to the local archive.';
    return;
  }

  if (activeFilter === 'videos') {
    filterSummary.textContent = `${videos} video memories`;
    filterDetail.textContent = 'Clips and moving moments that still belong to the original device unless the archive is opened locally.';
    return;
  }

  filterSummary.textContent = `${filtered.length} moments with media`;
  filterDetail.textContent = `${photos} photos and ${videos} video memories from your relationship archive.`;
}

function markGalleryMediaUnavailable(id, node) {
  const item = galleryItemsById.get(id);
  if (!item) return;

  item.unavailable = true;

  const card = node?.closest?.('.gallery-item');
  if (!card || card.dataset.mediaUnavailable === 'true') return;

  card.dataset.mediaUnavailable = 'true';
  card.classList.add(
    'gallery-item--unavailable',
    item.isVideo ? 'gallery-item--video-unavailable' : 'gallery-item--photo-unavailable'
  );

  const status = card.querySelector('.gallery-media-status');
  const note = card.querySelector('.gallery-card-note');
  const detail = card.querySelector('.gallery-card-detail');
  const fallbackImg = card.querySelector('.gallery-fallback-img');

  if (status) {
    status.hidden = false;
    status.textContent = getUnavailableStatus(item);
  }

  if (note) {
    note.hidden = false;
    note.textContent = getUnavailableNote(item);
  }

  if (detail) {
    detail.hidden = false;
    detail.textContent = MEDIA_UNAVAILABLE_DETAIL;
  }

  if (item.isVideo && node?.tagName === 'VIDEO') {
    node.style.display = 'none';
    if (fallbackImg) fallbackImg.style.display = 'block';
  }
}

// ─── 1. Render Media Gallery ─────────────────────────────────────────────────

async function renderGallery() {
  const container = document.getElementById('gallery-container');
  if (!container) return;

  container.innerHTML = `
    <div class="gallery-skeleton" style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem;">
      ${Array(6).fill('<div class="gallery-item" style="min-height: 280px; background: rgba(255,255,255,0.04); border-radius: 18px; animation: pulse 1.5s ease infinite;"></div>').join('')}
    </div>
  `;

  let memories = [];
  try {
    memories = await state.getMemories();
  } catch (e) {
    console.warn('[Media] Failed to load memories:', e);
  }

  const mediaItems = memories.filter((mem) => mem.media && mem.media.length > 0);
  const filtered = mediaItems.filter((item) => {
    if (activeFilter === 'photos') return !item.isVideo;
    if (activeFilter === 'videos') return item.isVideo;
    return true;
  });

  updateGallerySummary(mediaItems, filtered);
  galleryItemsById.clear();

  if (filtered.length === 0) {
    const emptyLabel = activeFilter === 'videos'
      ? 'No video memories are available in this filtered view yet.'
      : activeFilter === 'photos'
        ? 'No photo memories are available in this filtered view yet.'
        : 'No media memories are available in this view yet.';

    container.innerHTML = `
      <div class="glass-card gallery-empty-state">
        <p class="gallery-empty-state-title">Nothing new to reopen here.</p>
        <p class="gallery-empty-state-copy">${emptyLabel}</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach((item) => {
    const displayTitle = getDisplayTitle(item);
    const displaySupportText = getDisplaySupportText(item);
    const displayDate = formatGalleryDate(item.date);
    const typeLabel = getTypeLabel(item);
    const placeholder = getPlaceholderForItem(item);
    const encodedId = encodeURIComponent(item.id);

    galleryItemsById.set(item.id, {
      id: item.id,
      src: item.media,
      displayTitle,
      displayDate,
      typeLabel,
      isVideo: !!item.isVideo,
      unavailable: false
    });

    if (item.isVideo) {
      html += `
        <div class="gallery-item gallery-item--video ${item.isSpecialPage ? 'gallery-item--special' : ''}" onclick="openVideoPlayer(decodeURIComponent('${encodedId}'))">
          <div class="gallery-media-frame">
            <video preload="metadata" muted playsinline class="gallery-img gallery-media" poster="${placeholder}" onerror="this.onerror=null; window.__memoryBookMarkGalleryMediaUnavailable && window.__memoryBookMarkGalleryMediaUnavailable(decodeURIComponent('${encodedId}'), this);">
              <source src="${escapeHTML(item.media)}#t=0.5" type="video/mp4">
            </video>
            <img src="${placeholder}" class="gallery-img gallery-fallback-img" style="display:none;" alt="Private video placeholder for ${escapeHTML(displayTitle)}">
            <div class="gallery-item-video-icon">▶</div>
            <div class="gallery-media-status" hidden>${VIDEO_CARD_STATUS}</div>
          </div>
          <div class="gallery-card-body">
            <div class="gallery-card-meta">
              <span class="gallery-card-chip">${escapeHTML(typeLabel)}</span>
              <span class="gallery-item-date">${escapeHTML(displayDate)}</span>
            </div>
            <div class="gallery-item-title">${escapeHTML(displayTitle)}</div>
            <p class="gallery-card-support">${escapeHTML(displaySupportText)}</p>
            <p class="gallery-card-note" hidden></p>
            <p class="gallery-card-detail" hidden></p>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="gallery-item gallery-item--photo ${item.isSpecialPage ? 'gallery-item--special' : ''}" onclick="openLightbox(decodeURIComponent('${encodedId}'))">
          <div class="gallery-media-frame">
            <img
              src="${escapeHTML(item.media)}"
              alt="${escapeHTML(displayTitle)}"
              class="gallery-img gallery-media"
              loading="lazy"
              onerror="this.onerror=null; this.src='${placeholder}'; window.__memoryBookMarkGalleryMediaUnavailable && window.__memoryBookMarkGalleryMediaUnavailable(decodeURIComponent('${encodedId}'), this);"
            >
            <div class="gallery-media-status" hidden>${PHOTO_CARD_STATUS}</div>
          </div>
          <div class="gallery-card-body">
            <div class="gallery-card-meta">
              <span class="gallery-card-chip">${escapeHTML(typeLabel)}</span>
              <span class="gallery-item-date">${escapeHTML(displayDate)}</span>
            </div>
            <div class="gallery-item-title">${escapeHTML(displayTitle)}</div>
            <p class="gallery-card-support">${escapeHTML(displaySupportText)}</p>
            <p class="gallery-card-note" hidden></p>
            <p class="gallery-card-detail" hidden></p>
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

// ─── 2. Tab Filter Navigation ─────────────────────────────────────────────────

function setupGalleryFilters() {
  const tabs = document.querySelectorAll('.media-tabs .tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      tabs.forEach((t) => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeFilter = e.currentTarget.getAttribute('data-filter');
      renderGallery();
    });
  });
}

// ─── 3. Photo Lightbox Modal ──────────────────────────────────────────────────

function setupLightbox() {
  const lightbox = document.getElementById('gallery-lightbox');
  const img = document.getElementById('lightbox-image');
  const caption = document.getElementById('lightbox-caption');
  const status = document.getElementById('lightbox-status');
  const btnClose = document.getElementById('btn-close-lightbox');

  const btnDelete = document.getElementById('btn-delete-lightbox');
  const btnEdit = document.getElementById('btn-edit-lightbox');

  if (!lightbox || !img || !caption || !status) return;

  img.onerror = () => {
    const item = galleryItemsById.get(activeMediaId);
    img.onerror = null;
    img.src = PHOTO_PLACEHOLDER;
    if (item) {
      item.unavailable = true;
      status.hidden = false;
      status.textContent = `${PHOTO_CARD_STATUS} ${PHOTO_CARD_NOTE}`;
    }
  };

  const close = () => {
    lightbox.classList.remove('active');
    status.hidden = true;
    status.textContent = PHOTO_CARD_NOTE;
    activeMediaId = null;
  };

  btnClose.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (!activeMediaId) return;
      const confirmDelete = confirm('Are you sure you want to delete this photo memory?');
      if (confirmDelete) {
        state.deleteMemory(activeMediaId);
        close();
        renderGallery();
      }
    });
  }

  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      if (!activeMediaId) return;
      triggerEditModal(activeMediaId, close);
    });
  }

  window.openLightbox = (id) => {
    const item = galleryItemsById.get(id);
    if (!item) return;

    activeMediaId = id;
    caption.textContent = item.displayTitle;
    status.hidden = !item.unavailable;
    status.textContent = `${PHOTO_CARD_STATUS} ${PHOTO_CARD_NOTE}`;
    img.onerror = () => {
      const current = galleryItemsById.get(activeMediaId);
      img.onerror = null;
      img.src = PHOTO_PLACEHOLDER;
      if (current) {
        current.unavailable = true;
        status.hidden = false;
        status.textContent = `${PHOTO_CARD_STATUS} ${PHOTO_CARD_NOTE}`;
      }
    };
    img.src = item.unavailable ? PHOTO_PLACEHOLDER : item.src;
    lightbox.classList.add('active');
  };
}

// ─── 4. Video Player Modal ────────────────────────────────────────────────────

function setupVideoModal() {
  const modal = document.getElementById('gallery-video-modal');
  const player = document.getElementById('gallery-video-player');
  const titleEl = document.getElementById('video-modal-title');
  const dateEl = document.getElementById('video-modal-date');
  const statusEl = document.getElementById('video-modal-status');
  const unavailablePanel = document.getElementById('video-modal-unavailable');

  const btnClose = document.getElementById('btn-close-video-modal');
  const btnCloseFooter = document.getElementById('btn-close-video-modal-footer');

  const btnDelete = document.getElementById('btn-delete-video');
  const btnEdit = document.getElementById('btn-edit-video');

  if (!modal || !player || !titleEl || !dateEl || !statusEl || !unavailablePanel) return;

  const closeVideo = () => {
    player.pause();
    player.hidden = false;
    player.removeAttribute('src');
    player.load();
    unavailablePanel.hidden = true;
    statusEl.hidden = true;
    statusEl.textContent = MEDIA_UNAVAILABLE_DETAIL;
    modal.classList.remove('active');
    activeMediaId = null;
  };

  btnClose.addEventListener('click', closeVideo);
  btnCloseFooter.addEventListener('click', closeVideo);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeVideo();
  });

  player.addEventListener('error', () => {
    const item = galleryItemsById.get(activeMediaId);
    if (!item) return;

    item.unavailable = true;
    console.warn('[Media] Video failed to load:', player.currentSrc || player.src);
    player.hidden = true;
    unavailablePanel.hidden = false;
    statusEl.hidden = false;
    statusEl.textContent = `${VIDEO_CARD_STATUS} ${VIDEO_CARD_NOTE}`;
  });

  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (!activeMediaId) return;
      const confirmDelete = confirm('Are you sure you want to delete this video memory?');
      if (confirmDelete) {
        state.deleteMemory(activeMediaId);
        closeVideo();
        renderGallery();
      }
    });
  }

  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      if (!activeMediaId) return;
      triggerEditModal(activeMediaId, closeVideo);
    });
  }

  window.openVideoPlayer = (id) => {
    const item = galleryItemsById.get(id);
    if (!item) return;

    activeMediaId = id;
    titleEl.textContent = item.displayTitle;
    dateEl.textContent = item.displayDate;
    statusEl.hidden = true;
    statusEl.textContent = MEDIA_UNAVAILABLE_DETAIL;
    unavailablePanel.hidden = true;
    player.hidden = false;

    if (item.unavailable) {
      player.pause();
      player.removeAttribute('src');
      player.load();
      player.hidden = true;
      unavailablePanel.hidden = false;
      statusEl.hidden = false;
      statusEl.textContent = `${VIDEO_CARD_STATUS} ${VIDEO_CARD_NOTE}`;
      modal.classList.add('active');
      return;
    }

    player.src = item.src;
    modal.classList.add('active');
    player.load();
    player.play().catch((err) => {
      if (!['NotAllowedError', 'NotSupportedError'].includes(err?.name)) {
        console.warn('[Media] Video playback could not start:', err);
      }
    });
  };
}

// ─── 5. Edit Memory Modal ─────────────────────────────────────────────────────

async function triggerEditModal(id, closeParentCallback) {
  let memories = [];
  try {
    memories = await state.getMemories();
  } catch (e) {
    console.warn('[Media] Could not load memories for edit:', e);
    return;
  }
  const mem = memories.find((m) => m.id === id);
  if (!mem) return;

  closeParentCallback();

  const addModal = document.getElementById('add-memory-modal');
  const mediaSelect = document.getElementById('mem-media-select');
  const customPathGroup = document.getElementById('custom-media-path-group');
  const customPathInput = document.getElementById('mem-media-custom');

  document.getElementById('edit-mem-id').value = mem.id;
  document.getElementById('mem-title').value = mem.title;
  document.getElementById('mem-date').value = mem.date;
  document.getElementById('mem-desc').value = mem.description;
  document.getElementById('mem-tags').value = (mem.tags || []).join(', ');

  const presets = [
    '/assets/photos/anniversary_2025.png',
    '/assets/photos/sunset_walk.png',
    '/assets/photos/starlit_camp.png',
    '/assets/videos/sample_video.mp4'
  ];

  if (presets.includes(mem.media)) {
    mediaSelect.value = mem.media;
    customPathGroup.style.display = 'none';
    customPathInput.value = '';
  } else {
    mediaSelect.value = 'custom';
    customPathGroup.style.display = 'block';
    customPathInput.value = mem.media || '';
  }

  addModal.classList.add('active');
}

function setupEditModal() {
  const modal = document.getElementById('add-memory-modal');
  const btnClose = document.getElementById('btn-close-add-modal');
  const btnCancel = document.getElementById('btn-cancel-memory');
  const form = document.getElementById('add-memory-form');
  const mediaSelect = document.getElementById('mem-media-select');
  const customPathGroup = document.getElementById('custom-media-path-group');

  if (!modal || !form || !mediaSelect || !customPathGroup) return;

  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
    document.getElementById('edit-mem-id').value = '';
    customPathGroup.style.display = 'none';
  };

  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  mediaSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customPathGroup.style.display = 'block';
      document.getElementById('mem-media-custom').required = true;
    } else {
      customPathGroup.style.display = 'none';
      document.getElementById('mem-media-custom').required = false;
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const editId = document.getElementById('edit-mem-id').value;
    const title = document.getElementById('mem-title').value.trim();
    const date = document.getElementById('mem-date').value;
    const description = document.getElementById('mem-desc').value.trim();

    let media = mediaSelect.value;
    if (media === 'custom') {
      media = document.getElementById('mem-media-custom').value.trim();
    }

    const tagsInput = document.getElementById('mem-tags').value.trim();
    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0)
      : [];

    const isVideo = media.endsWith('.mp4') || media.endsWith('.mov') || media.endsWith('.webm') || media.includes('/videos/');

    if (editId) {
      state.updateMemory(editId, { title, date, description, media, isVideo, tags });
    }

    closeModal();
    renderGallery();
  });
}
