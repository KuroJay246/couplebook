const stamp = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date());

document.title = `Couple Book Shell Preview — ${stamp}`;
