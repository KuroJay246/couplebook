// Timeline Page logic
import { state } from '../core/state.js';
import { formatDate, escapeHTML } from '../core/utils.js';

let activeFilterTag = 'all';

const TIMELINE_MEDIA_FALLBACK = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="timeline-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff4a6b" />
        <stop offset="52%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#timeline-gradient)" />
    <circle cx="760" cy="120" r="84" fill="rgba(255,255,255,0.11)" />
    <circle cx="180" cy="430" r="116" fill="rgba(255,255,255,0.08)" />
    <g fill="#ffffff" font-family="Georgia, serif" text-anchor="middle">
      <text x="480" y="238" font-size="38" font-weight="700">Private memory placeholder</text>
      <text x="480" y="288" font-size="20" fill="rgba(255,255,255,0.84)">The original local media is unavailable here,</text>
      <text x="480" y="320" font-size="20" fill="rgba(255,255,255,0.84)">so the memory stays readable without exposing private files.</text>
    </g>
  </svg>
`)}`;
const TIMELINE_MEDIA_UNAVAILABLE_BADGE = 'Story preserved - media stays private';
const TIMELINE_MEDIA_UNAVAILABLE_NOTE = 'Private local media is unavailable here.';
const TIMELINE_MEDIA_UNAVAILABLE_DETAIL = 'The memory details stay visible while the original file remains outside the clean repo copy.';
const GENERIC_PHOTO_TITLE = /^Photo from\b/i;
const GENERIC_VIDEO_TITLE = /^Video Clip\b/i;
const GENERIC_ARCHIVE_DESCRIPTION = /^(A beautiful shared moment captured on|A video memory recorded on)\b/i;

function isGeneratedArchiveTitle(memory) {
  return GENERIC_PHOTO_TITLE.test(memory.title || '') || GENERIC_VIDEO_TITLE.test(memory.title || '');
}

function getDisplayTitle(memory) {
  const rawTitle = (memory.title || '').trim();
  const dateText = formatDate(memory.date);

  if (!rawTitle) {
    return memory.isVideo ? `A video memory from ${dateText}` : `A moment from ${dateText}`;
  }

  if (GENERIC_PHOTO_TITLE.test(rawTitle)) {
    return `A moment from ${dateText}`;
  }

  if (GENERIC_VIDEO_TITLE.test(rawTitle)) {
    return `A video memory from ${dateText}`;
  }

  return rawTitle;
}

function getDisplayDescription(memory) {
  const rawDescription = (memory.description || '').trim();
  if (!rawDescription) {
    return 'Saved from our private archive.';
  }

  if (GENERIC_ARCHIVE_DESCRIPTION.test(rawDescription)) {
    return 'Saved from our private archive.';
  }

  return rawDescription;
}

function getTimelineTypeLabel(memory) {
  if (memory.isSpecialPage) return 'Special moment';
  if (memory.isVideo) return 'Video memory';
  return 'Private archive';
}

function markTimelineMediaUnavailable(node) {
  const card = node?.closest?.('.timeline-card');
  if (!card || card.dataset.mediaUnavailable === 'true') return;

  card.dataset.mediaUnavailable = 'true';
  card.classList.add('timeline-card--media-unavailable');

  const badge = card.querySelector('.timeline-media-status');
  const note = card.querySelector('.timeline-card-note');
  const detail = card.querySelector('.timeline-card-detail');

  if (badge) badge.hidden = false;
  if (note) note.hidden = false;
  if (detail) detail.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  window.__memoryBookHandleTimelineMediaMissing = markTimelineMediaUnavailable;
  renderTimeline();
  setupAddMemoryModal();
  setupDetailModal();
});

// 1. Render Timeline and Tags Filter
async function renderTimeline() {
  const wrapper = document.getElementById('timeline-cards-wrapper');
  if (!wrapper) return;

  const memories = await state.getMemories();
  
  // Render Tag Filter Buttons
  renderTagFilters(memories);

  // Filter memories
  const filtered = activeFilterTag === 'all' 
    ? memories 
    : memories.filter(m => m.tags && m.tags.includes(activeFilterTag));

  if (filtered.length === 0) {
    wrapper.innerHTML = `
      <div class="glass-card timeline-empty-state">
        No saved moments match "${escapeHTML(activeFilterTag)}" yet.
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(mem => {
    const displayTitle = getDisplayTitle(mem);
    const displayDescription = getDisplayDescription(mem);
    const displayDate = formatDate(mem.date);
    const isArchiveImport = isGeneratedArchiveTitle(mem) || GENERIC_ARCHIVE_DESCRIPTION.test(mem.description || '');
    const tagsHTML = (mem.tags || [])
      .map(t => `<span class="badge badge-tag">#${escapeHTML(t)}</span>`)
      .join(' ');
    const chips = [
      `<span class="timeline-card-chip">${escapeHTML(getTimelineTypeLabel(mem))}</span>`,
      isArchiveImport ? `<span class="timeline-card-chip timeline-card-chip--muted">Archive import</span>` : ''
    ].filter(Boolean).join('');

    // Media preview html
    let mediaPreviewHTML = '';
    if (mem.media) {
      if (mem.isVideo) {
        mediaPreviewHTML = `
          <div class="timeline-media-preview" onclick="openMemoryDetails('${mem.id}')">
            <video preload="metadata" muted playsinline class="timeline-media" poster="${TIMELINE_MEDIA_FALLBACK}" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling && (this.nextElementSibling.style.display='block'); window.__memoryBookHandleTimelineMediaMissing && window.__memoryBookHandleTimelineMediaMissing(this);">
              <source src="${mem.media}#t=0.5" type="video/mp4">
            </video>
            <img src="${TIMELINE_MEDIA_FALLBACK}" class="timeline-media timeline-media-fallback" style="display:none;" alt="Private memory placeholder for ${escapeHTML(displayTitle)}">
            <div class="timeline-media-preview-icon">▶️</div>
            <div class="timeline-media-status" hidden>${TIMELINE_MEDIA_UNAVAILABLE_BADGE}</div>
          </div>
        `;
      } else {
        mediaPreviewHTML = `
          <div class="timeline-media-preview" onclick="openMemoryDetails('${mem.id}')">
            <img src="${mem.media}" alt="${escapeHTML(displayTitle)}" class="timeline-media" onerror="this.onerror=null; this.src='${TIMELINE_MEDIA_FALLBACK}'; window.__memoryBookHandleTimelineMediaMissing && window.__memoryBookHandleTimelineMediaMissing(this);">
            <div class="timeline-media-status" hidden>${TIMELINE_MEDIA_UNAVAILABLE_BADGE}</div>
          </div>
        `;
      }
    }

    html += `
      <div class="timeline-card glass-card ${mem.isSpecialPage ? 'timeline-card--special' : ''}" id="card-${mem.id}">
        <div class="timeline-dot"></div>
        <div class="timeline-card-header">
          <h3 class="timeline-card-title">${escapeHTML(displayTitle)}</h3>
          <span class="timeline-card-date">${displayDate}</span>
        </div>
        <div class="timeline-card-meta">
          <div class="timeline-card-status">${chips}</div>
        </div>
        <p class="timeline-card-desc ${isArchiveImport ? 'timeline-card-desc--archive' : ''}">${escapeHTML(displayDescription)}</p>
        ${mediaPreviewHTML}
        <p class="timeline-card-note" hidden>${TIMELINE_MEDIA_UNAVAILABLE_NOTE}</p>
        <p class="timeline-card-detail" hidden>${TIMELINE_MEDIA_UNAVAILABLE_DETAIL}</p>
        <div class="timeline-card-tags">
          ${tagsHTML}
        </div>
        <div class="timeline-card-actions">
          ${mem.isSpecialPage ? `
            <a href="legacy.html?module=${encodeURIComponent(mem.pageUrl)}" class="btn btn-primary timeline-action-link">
              <span>✨</span> Open Project
            </a>
          ` : ''}
          <button class="btn btn-secondary timeline-action-link" onclick="openMemoryDetails('${mem.id}')">View Details</button>
        </div>
      </div>
    `;
  });

  wrapper.innerHTML = html;
}

function renderTagFilters(memories) {
  const container = document.getElementById('tags-filter-container');
  if (!container) return;

  // Extract all unique tags
  const tagsSet = new Set();
  memories.forEach(mem => {
    if (mem.tags) {
      mem.tags.forEach(t => tagsSet.add(t));
    }
  });

  const tags = Array.from(tagsSet).sort();
  
  let html = `<button class="tab-btn ${activeFilterTag === 'all' ? 'active' : ''}" data-tag="all">All moments</button>`;
  tags.forEach(t => {
    html += `<button class="tab-btn ${activeFilterTag === t ? 'active' : ''}" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</button>`;
  });

  container.innerHTML = html;

  // Re-attach click events
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeFilterTag = e.target.getAttribute('data-tag');
      renderTimeline();
    });
  });
}

// 2. Add Memory Wizard Logic
function setupAddMemoryModal() {
  const modal = document.getElementById('add-memory-modal');
  const btnOpen = document.getElementById('btn-open-add-memory');
  const btnClose = document.getElementById('btn-close-add-modal');
  const btnCancel = document.getElementById('btn-cancel-memory');
  const form = document.getElementById('add-memory-form');
  const mediaSelect = document.getElementById('mem-media-select');
  const customPathGroup = document.getElementById('custom-media-path-group');

  if (!modal || !btnOpen || !form) return;

  btnOpen.addEventListener('click', () => {
    // Set default date to today
    document.getElementById('mem-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('edit-mem-id').value = '';
    modal.querySelector('.modal-title').textContent = 'Capture New Memory';
    modal.classList.add('active');
  });

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
    // Parse tags to array: split by comma, lowercase, trim spaces, filter empties
    const tags = tagsInput 
      ? tagsInput.split(',').map(t => t.toLowerCase().trim()).filter(t => t.length > 0)
      : [];

    // Detect if media is a video file
    const isVideo = media.endsWith('.mp4') || media.endsWith('.mov') || media.endsWith('.webm') || media.includes('/videos/');

    if (editId) {
      state.updateMemory(editId, {
        title,
        date,
        description,
        media,
        isVideo,
        tags
      });
    } else {
      state.addMemory({
        title,
        date,
        description,
        media,
        isVideo,
        tags
      });
    }

    closeModal();
    renderTimeline();
  });
}

// 3. Detail Popup Modal Logic
let activeDetailMemoryId = null;

function setupDetailModal() {
  const modal = document.getElementById('detail-memory-modal');
  const btnClose = document.getElementById('btn-close-detail-modal');
  const btnCloseFooter = document.getElementById('btn-close-detail');
  const btnDelete = document.getElementById('btn-delete-memory');
  const btnEdit = document.getElementById('btn-edit-memory');

  if (!modal) return;

  const closeModal = () => {
    modal.classList.remove('active');
    // Clear video src if playing to stop audio
    const container = document.getElementById('detail-media-container');
    if (container) container.innerHTML = '';
    activeDetailMemoryId = null;
  };

  btnClose.addEventListener('click', closeModal);
  btnCloseFooter.addEventListener('click', closeModal);

  // Hook up Delete Action
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (!activeDetailMemoryId) return;
      const confirmDelete = confirm("Are you sure you want to delete this memory? This action cannot be undone.");
      if (confirmDelete) {
        state.deleteMemory(activeDetailMemoryId);
        closeModal();
        renderTimeline();
      }
    });
  }

  // Hook up Edit Form Preloader Action
  if (btnEdit) {
    btnEdit.addEventListener('click', async () => {
      if (!activeDetailMemoryId) return;
      const memories = await state.getMemories();
      const mem = memories.find(m => m.id === activeDetailMemoryId);
      if (!mem) return;

      // Close details first
      closeModal();

      // Populate edit fields
      const addModal = document.getElementById('add-memory-modal');
      const mediaSelect = document.getElementById('mem-media-select');
      const customPathGroup = document.getElementById('custom-media-path-group');
      const customPathInput = document.getElementById('mem-media-custom');

      document.getElementById('edit-mem-id').value = mem.id;
      document.getElementById('mem-title').value = mem.title;
      document.getElementById('mem-date').value = mem.date;
      document.getElementById('mem-desc').value = mem.description;
      document.getElementById('mem-tags').value = (mem.tags || []).join(', ');

      // Preset images
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
        customPathInput.required = false;
      } else {
        mediaSelect.value = 'custom';
        customPathGroup.style.display = 'block';
        customPathInput.value = mem.media || '';
        customPathInput.required = true;
      }

      // Update Modal Header text
      addModal.querySelector('.modal-title').textContent = 'Edit Memory';
      addModal.classList.add('active');
    });
  }

  // Expose function globally for timeline card clicks
  window.openMemoryDetails = async (id) => {
    const memories = await state.getMemories();
    const mem = memories.find(m => m.id === id);
    if (!mem) return;

    activeDetailMemoryId = id;

    document.getElementById('detail-title').textContent = getDisplayTitle(mem);
    document.getElementById('detail-date').textContent = formatDate(mem.date);
    document.getElementById('detail-desc').textContent = getDisplayDescription(mem);

    // Render media element inside details modal
    const mediaContainer = document.getElementById('detail-media-container');
    if (mem.media) {
      mediaContainer.style.display = 'block';
      if (mem.isVideo) {
        mediaContainer.innerHTML = `
          <video controls autoplay style="width: 100%; display: block; outline: none;">
            <source src="${mem.media}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        `;
      } else {
        mediaContainer.innerHTML = `
          <img src="${mem.media}" alt="${escapeHTML(mem.title)}" style="width: 100%; display: block; height: auto;">
        `;
      }
    } else {
      mediaContainer.style.display = 'none';
      mediaContainer.innerHTML = '';
    }

    // Render tags
    const tagsContainer = document.getElementById('detail-tags');
    tagsContainer.innerHTML = (mem.tags || [])
      .map(t => `<span class="badge badge-tag">#${escapeHTML(t)}</span>`)
      .join(' ');

    // Handle interactive project button display
    const btnProject = document.getElementById('btn-interactive-project');
    if (btnProject) {
      if (mem.isSpecialPage && mem.pageUrl) {
        btnProject.href = `legacy.html?module=${encodeURIComponent(mem.pageUrl)}`;
        btnProject.removeAttribute('target');
        btnProject.style.display = 'inline-flex';
      } else {
        btnProject.style.display = 'none';
      }
    }

    modal.classList.add('active');
  };
}
