// Profile and Contract Page Controller
import { state } from '../core/state.js';
import { formatDate, escapeHTML } from '../core/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  renderProfiles();
  setupEditProfileModal();
  renderSignatures();

  // Auto-refresh when partner data syncs from Firestore in real-time
  window.addEventListener('memorybook-sync-updated', () => {
    renderProfiles();
    renderSignatures();
  });
});

// 1. Render Profiles
function renderProfiles() {
  const profiles = state.getProfiles();
  
  // Jaylan Card
  const j = profiles.Jaylan;
  if (j) {
    document.getElementById('j-profile-avatar').src = j.avatar;
    document.getElementById('j-profile-name').textContent = escapeHTML(j.name);
    document.getElementById('j-profile-bio').textContent = escapeHTML(j.bio);
    document.getElementById('j-profile-view').textContent = j.anniversaryView === 'dual' ? 'Dual View' : `${j.anniversaryView}'s Perspective`;
    document.getElementById('j-profile-joined').textContent = formatDate(j.joinedDate);
    if (j.birthday) {
      document.getElementById('j-profile-birthday').textContent = formatDate(j.birthday);
    }
  }

  // Omia Card
  const o = profiles.Omia;
  if (o) {
    document.getElementById('o-profile-avatar').src = o.avatar;
    document.getElementById('o-profile-name').textContent = escapeHTML(o.name);
    document.getElementById('o-profile-bio').textContent = escapeHTML(o.bio);
    document.getElementById('o-profile-view').textContent = o.anniversaryView === 'dual' ? 'Dual View' : `${o.anniversaryView}'s Perspective`;
    document.getElementById('o-profile-joined').textContent = formatDate(o.joinedDate);
    if (o.birthday) {
      document.getElementById('o-profile-birthday').textContent = formatDate(o.birthday);
    }
  }
}

// 2. Render Signatures Status
function renderSignatures() {
  const signatures = state.getSignatures();
  
  // Jaylan signature
  const jSig = signatures.Jaylan;
  const jBadge = document.getElementById('j-signature-badge');
  const jDate = document.getElementById('j-signature-date');
  if (jSig && jSig.accepted) {
    jBadge.textContent = `Signed v${jSig.version}`;
    jBadge.style.background = 'rgba(16, 185, 129, 0.15)';
    jBadge.style.color = '#34d399';
    jDate.textContent = `Accepted: ${formatDate(jSig.timestamp.split('T')[0])}`;
    
    if (jSig.history && jSig.history.length > 0) {
      document.getElementById('j-signature-history').style.display = 'block';
      const historyList = document.getElementById('j-signature-history-list');
      historyList.innerHTML = '';
      jSig.history.forEach(h => {
        const li = document.createElement('li');
        li.textContent = `v${h.version} - ${formatDate(h.timestamp.split('T')[0])}`;
        historyList.appendChild(li);
      });
    }
  }

  // Omia signature
  const oSig = signatures.Omia;
  const oBadge = document.getElementById('o-signature-badge');
  const oDate = document.getElementById('o-signature-date');
  if (oSig && oSig.accepted) {
    oBadge.textContent = `Signed v${oSig.version}`;
    oBadge.style.background = 'rgba(16, 185, 129, 0.15)';
    oBadge.style.color = '#34d399';
    oDate.textContent = `Accepted: ${formatDate(oSig.timestamp.split('T')[0])}`;
    
    if (oSig.history && oSig.history.length > 0) {
      document.getElementById('o-signature-history').style.display = 'block';
      const historyList = document.getElementById('o-signature-history-list');
      historyList.innerHTML = '';
      oSig.history.forEach(h => {
        const li = document.createElement('li');
        li.textContent = `v${h.version} - ${formatDate(h.timestamp.split('T')[0])}`;
        historyList.appendChild(li);
      });
    }
  }
}

// 3. Edit Profile Modal Logic
function setupEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  const btnClose = document.getElementById('btn-close-edit-modal');
  const btnCancel = document.getElementById('btn-cancel-profile-edit');
  const form = document.getElementById('edit-profile-form');
  const avatarSelect = document.getElementById('edit-avatar-select');
  const customAvatarGroup = document.getElementById('edit-custom-avatar-group');

  if (!modal || !form) return;

  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
    customAvatarGroup.style.display = 'none';
  };

  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  avatarSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customAvatarGroup.style.display = 'block';
    } else {
      customAvatarGroup.style.display = 'none';
      document.getElementById('edit-avatar-file').value = '';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const userKey = document.getElementById('edit-user-key').value;
    const name = document.getElementById('edit-display-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const birthday = document.getElementById('edit-birthday').value;
    const anniversaryView = document.getElementById('edit-view-pref').value;
    
    let avatar = avatarSelect.value;
    if (avatar === 'custom') {
      const fileInput = document.getElementById('edit-avatar-file');
      if (fileInput.files.length > 0) {
        // Just extract the filename and assume it's stored in assets/photos
        avatar = `/assets/photos/${fileInput.files[0].name}`;
      } else {
        // Fallback to previous if they didn't upload anything new
        avatar = state.getProfiles()[userKey].avatar;
      }
    }

    state.saveProfile(userKey, {
      name,
      bio,
      birthday,
      avatar,
      anniversaryView
    });

    closeModal();
    renderProfiles();
  });

  // Expose global launcher for Edit buttons
  window.openEditProfile = (userKey) => {
    const profiles = state.getProfiles();
    const user = profiles[userKey];
    if (!user) return;

    document.getElementById('edit-user-key').value = userKey;
    document.getElementById('edit-modal-title').textContent = `Edit ${userKey}'s Profile`;
    document.getElementById('edit-display-name').value = user.name;
    document.getElementById('edit-bio').value = user.bio;
    document.getElementById('edit-birthday').value = user.birthday || '';
    document.getElementById('edit-view-pref').value = user.anniversaryView || 'dual';

    // Set avatar selection dropdown
    const presetAvatars = [
      '/assets/photos/anniversary_2025.png',
      '/assets/photos/sunset_walk.png',
      '/assets/photos/starlit_camp.png'
    ];

    if (presetAvatars.includes(user.avatar)) {
      avatarSelect.value = user.avatar;
      customAvatarGroup.style.display = 'none';
    } else {
      avatarSelect.value = 'custom';
      customAvatarGroup.style.display = 'block';
    }

    modal.classList.add('active');
  };
}
