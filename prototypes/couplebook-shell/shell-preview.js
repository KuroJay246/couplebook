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

function focusNavItem(index) {
  const target = navItems[index];
  if (target) target.focus();
}

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    showView(item.dataset.viewTarget);
  });

  item.addEventListener('keydown', (event) => {
    const currentIndex = navItems.indexOf(item);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusNavItem((currentIndex + 1) % navItems.length);
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusNavItem((currentIndex - 1 + navItems.length) % navItems.length);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusNavItem(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusNavItem(navItems.length - 1);
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showView(item.dataset.viewTarget);
    }
  });
});

showView('home');
