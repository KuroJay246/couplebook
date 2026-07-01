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

  if (modulePath.includes('confession')) title.textContent = "✨ Jaylan's Confession";
  else if (modulePath.includes('valentine')) title.textContent = "✨ Valentine's Request";
  else if (modulePath.includes('birthday')) title.textContent = "✨ Omia's Birthday";

  frame.src = modulePath;
});
