/* Native scrolling and accessible navigation, without runtime dependencies. */
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
  });
});
// Archive after the event's local calendar day; no unconfirmed end time is implied.
function updateEventStatus() {
  if (Date.now() < Date.parse('2026-09-19T00:00:00-07:00')) return;
  document.getElementById('past').append(document.getElementById('featured-event'));

  document.getElementById('upcoming-empty').hidden = false;
  document.getElementById('upcoming-count').textContent = '00';
  document.getElementById('past-count').textContent = '05';
  document.getElementById('event-status').textContent = 'PAST EVENT / SEPTEMBER 18, 2026';
  document.getElementById('event-rsvp').innerHTML = 'View event <span aria-hidden="true">↗</span>';
  document.getElementById('calendar-link').hidden = true;
}
updateEventStatus();
window.addEventListener('pageshow', updateEventStatus);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateEventStatus(); });

const menuButton = document.querySelector('.menu-button');
const menu = document.getElementById('site-menu');
function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); }
menuButton.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); });
menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); } });
document.addEventListener('click', event => { if (!menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu(); });
