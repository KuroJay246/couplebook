const stamp = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date());

document.title = `Couple Book Shell Preview — ${stamp}`;

const navItems = Array.from(document.querySelectorAll('[data-view-target]'));
const views = Array.from(document.querySelectorAll('[data-view]'));

function showView(viewName) {
  views.forEach((view) => {
    view.classList.toggle('is-visible', view.dataset.view === viewName);
  });

  navItems.forEach((item) => {
    const isActive = item.dataset.viewTarget === viewName;
    item.classList.toggle('nav-item-active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });
}

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    showView(item.dataset.viewTarget);
  });
});
