const filters = document.querySelector('.filters');
const stories = [...document.querySelectorAll('[data-subject]')];
const status = document.querySelector('#filter-status');

filters.addEventListener('click', event => {
  const choice = event.target.closest('button[data-filter]');
  if (!choice) return;
  for (const button of filters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button === choice));
  }
  let visible = 0;
  for (const story of stories) {
    story.hidden = choice.dataset.filter !== 'all' && story.dataset.subject !== choice.dataset.filter;
    if (!story.hidden) visible++;
  }
  status.textContent = visible + (visible === 1 ? ' story shown.' : ' stories shown.');
});
filters.hidden = false;
