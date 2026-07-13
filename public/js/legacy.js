document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const modulePath = params.get('module');
  const frame = document.getElementById('legacy-frame');
  const title = document.getElementById('legacy-title');

  if (!modulePath) {
    frame.srcdoc = `
      <div style="color: white; font-family: sans-serif; text-align: center; margin-top: 2rem;">
        <h2>Error: No module specified</h2>
      </div>
    `;
    return;
  }

  if (modulePath.includes('confession') || modulePath.includes('valentine') || modulePath.includes('birthday')) {
    title.textContent = '✨ Private Moment';
  }

  frame.src = modulePath;
});
