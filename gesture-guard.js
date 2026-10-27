// CSS touch-action handles Pointer Events browsers. Safari's gesture events
// and legacy multi-touch handling need explicit cancellation as well.
export function preventGameZoom(surface) {
  const cancel = event => event.preventDefault();
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
    surface.addEventListener(name, cancel, { passive: false });
  }
  surface.addEventListener('touchmove', event => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
}
