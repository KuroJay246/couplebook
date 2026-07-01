// Timeline Page logic
import { state } from '../core/state.js';
import { formatDate, escapeHTML } from '../core/utils.js';

let activeFilterTag = 'all';

document.addEventListener('DOMContentLoaded', () => {
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
      <div class="glass-card" style="text-align: center; padding: 3rem; color: var(--color-muted);">
        No memories found for tag "${escapeHTML(activeFilterTag)}".
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(mem => {
    const tagsHTML = (mem.tags || [])
      .map(t => `<span class="badge badge-tag">#${escapeHTML(t)}</span>`)
      .join(' ');

    // Media preview html
    let mediaPreviewHTML = '';
    if (mem.media) {
      if (mem.isVideo) {
        mediaPreviewHTML = `
          <div class="timeline-media-preview" onclick="openMemoryDetails('${mem.id}')" style="position: relative;">
            <video preload="metadata" muted playsinline style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.7);">
              <source src="${mem.media}#t=0.5" type="video/mp4">
            </video>
            <div style="position: absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size: 2.5rem; color: white;">▶️</div>
          </div>
        `;
      } else {
        mediaPreviewHTML = `
          <div class="timeline-media-preview" onclick="openMemoryDetails('${mem.id}')">
            <img src="${mem.media}" alt="${escapeHTML(mem.title)}" onerror="this.onerror=null; this.src='/assets/photos/anniversary_2025.png';">
          </div>
        `;
      }
    }

    html += `
      <div class="timeline-card glass-card" id="card-${mem.id}">
        <div class="timeline-dot"></div>
        <div class="timeline-card-header">
          <h3 class="timeline-card-title">${escapeHTML(mem.title)}</h3>
          <span class="timeline-card-date">${formatDate(mem.date)}</span>
        </div>
        <p class="timeline-card-desc">${escapeHTML(mem.description)}</p>
        ${mediaPreviewHTML}
        <div class="timeline-card-tags">
          ${tagsHTML}
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          ${mem.isSpecialPage ? `
            <a href="legacy.html?module=${encodeURIComponent(mem.pageUrl)}" class="btn btn-primary" style="font-size: 0.75rem; padding: 0.35rem 0.85rem; margin-right: 0.5rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;">
              <span>✨</span> Open Project
            </a>
          ` : ''}
          <button class="btn btn-secondary" onclick="openMemoryDetails('${mem.id}')" style="font-size: 0.75rem; padding: 0.35rem 0.85rem;">View Details</button>
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
  
  let html = `<button class="tab-btn ${activeFilterTag === 'all' ? 'active' : ''}" data-tag="all">All</button>`;
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

    document.getElementById('detail-title').textContent = mem.title;
    document.getElementById('detail-date').textContent = formatDate(mem.date);
    document.getElementById('detail-desc').textContent = mem.description;

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
