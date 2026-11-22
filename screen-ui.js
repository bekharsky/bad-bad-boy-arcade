export function mountHolidayScreens(document) {
  const template = document.querySelector('#holiday-screen-header');
  for (const screen of document.querySelectorAll('.holiday-card')) {
    const header = template.content.firstElementChild.cloneNode(true);
    const action = screen.querySelector('[data-header-action]');
    if (action) header.append(action);
    screen.prepend(header);
  }
}
