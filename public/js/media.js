// Media Gallery Controller for MemoryBook
import { state } from '../core/state.js';
import { UserStore } from '../core/persistence.js';
import { formatDate, escapeHTML } from '../core/utils.js';

let activeFilter = 'all';
let activeMediaId = null;

const FALLBACK = UserStore.FALLBACK_IMAGE;

document.addEventListener('DOMContentLoaded', () => {
  renderGallery();
  setupGalleryFilters();
  setupLightbox();
  setupVideoModal();
  setupEditModal();
});

// ─── 1. Render Media Gallery ─────────────────────────────────────────────────

async function renderGallery() {
  const container = document.getElementById('gallery-container');
  if (!container) return;

  // Show skeleton loading state
  container.innerHTML = `
    <div class="gallery-skeleton" style="grid-column: span 3; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
      ${Array(6).fill('<div class="gallery-item" style="aspect-ratio:1; background: rgba(255,255,255,0.04); border-radius: 12px; animation: pulse 1.5s ease infinite;"></div>').join('')}
    </div>
  `;

  let memories = [];
  try {
    memories = await state.getMemories();
  } catch (e) {
    console.warn('[Media] Failed to load memories:', e);
  }

  // Extract items with media
  const mediaItems = memories.filter(mem => mem.media && mem.media.length > 0);

  // Filter based on selected tab
  const filtered = mediaItems.filter(item => {
    if (activeFilter === 'photos') return !item.isVideo;
    if (activeFilter === 'videos') return item.isVideo;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <p style="grid-column: span 3; text-align: center; color: var(--color-muted); padding: 3rem 0;">
        No ${activeFilter === 'all' ? 'media files' : activeFilter} found in your vault.
      </p>
    `;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const safeSrc = escapeHTML(item.media);
    const safeTitle = escapeHTML(item.title);
    const safeId = escapeHTML(item.id);

    if (item.isVideo) {
      html += `
        <div class="gallery-item" style="aspect-ratio: 1; overflow: hidden;"
          onclick="openVideoPlayer('${safeId}', '${safeSrc}', '${safeTitle}', '${item.date}')">
          <video preload="metadata" muted playsinline class="gallery-img"
            style="filter: brightness(0.55);"
            poster="${FALLBACK}"
            onerror="this.onerror=null; this.style.display='none'; this.parentElement.querySelector('.gallery-fallback-img') && (this.parentElement.querySelector('.gallery-fallback-img').style.display='block');">
            <source src="${safeSrc}#t=0.5" type="video/mp4">
          </video>
          <img src="${FALLBACK}" class="gallery-img gallery-fallback-img" style="display:none;" alt="Video thumbnail">
          <div class="gallery-item-video-icon">▶️</div>
          <div class="gallery-overlay">
            <div class="gallery-item-title">${safeTitle}</div>
            <div class="gallery-item-date">${formatDate(item.date)}</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="gallery-item" style="aspect-ratio: 1; overflow: hidden;"
          onclick="openLightbox('${safeId}', '${safeSrc}', '${safeTitle}')">
          <img
            src="${safeSrc}"
            alt="${safeTitle}"
            class="gallery-img"
            loading="lazy"
            onerror="this.onerror=null; this.src='${FALLBACK}';"
          >
          <div class="gallery-overlay">
            <div class="gallery-item-title">${safeTitle}</div>
            <div class="gallery-item-date">${formatDate(item.date)}</div>
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
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      activeFilter = e.target.getAttribute('data-filter');
      renderGallery();
    });
  });
}

// ─── 3. Photo Lightbox Modal ──────────────────────────────────────────────────

function setupLightbox() {
  const lightbox = document.getElementById('gallery-lightbox');
  const img = document.getElementById('lightbox-image');
  const caption = document.getElementById('lightbox-caption');
  const btnClose = document.getElementById('btn-close-lightbox');

  const btnDelete = document.getElementById('btn-delete-lightbox');
  const btnEdit = document.getElementById('btn-edit-lightbox');

  if (!lightbox || !img) return;

  // Ensure lightbox image always has fallback
  img.onerror = () => {
    img.onerror = null;
    img.src = FALLBACK;
  };

  const close = () => {
    lightbox.classList.remove('active');
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

  window.openLightbox = (id, src, title) => {
    activeMediaId = id;
    img.src = src;
    caption.textContent = title;
    lightbox.classList.add('active');
  };
}

// ─── 4. Video Player Modal ────────────────────────────────────────────────────

function setupVideoModal() {
  const modal = document.getElementById('gallery-video-modal');
  const player = document.getElementById('gallery-video-player');
  const titleEl = document.getElementById('video-modal-title');
  const dateEl = document.getElementById('video-modal-date');

  const btnClose = document.getElementById('btn-close-video-modal');
  const btnCloseFooter = document.getElementById('btn-close-video-modal-footer');

  const btnDelete = document.getElementById('btn-delete-video');
  const btnEdit = document.getElementById('btn-edit-video');

  if (!modal || !player) return;

  const closeVideo = () => {
    player.pause();
    player.src = '';
    player.load(); // Reset video element completely
    modal.classList.remove('active');
    activeMediaId = null;
  };

  btnClose.addEventListener('click', closeVideo);
  btnCloseFooter.addEventListener('click', closeVideo);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeVideo();
  });

  // Handle video load errors gracefully
  player.addEventListener('error', () => {
    console.warn('[Media] Video failed to load:', player.src);
    titleEl.textContent = titleEl.textContent + ' (Unable to load video)';
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

  window.openVideoPlayer = (id, src, title, date) => {
    activeMediaId = id;
    player.src = src;
    titleEl.textContent = title;
    dateEl.textContent = formatDate(date);
    modal.classList.add('active');
    player.load();
    player.play().catch(err => console.log('Auto-play blocked (normal on mobile):', err));
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
  const mem = memories.find(m => m.id === id);
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

  // Preset paths (absolute)
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

  if (!modal || !form) return;

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
      ? tagsInput.split(',').map(t => t.toLowerCase().trim()).filter(t => t.length > 0)
      : [];

    const isVideo = media.endsWith('.mp4') || media.endsWith('.mov') || media.endsWith('.webm') || media.includes('/videos/');

    if (editId) {
      state.updateMemory(editId, { title, date, description, media, isVideo, tags });
    }

    closeModal();
    renderGallery();
  });
}
