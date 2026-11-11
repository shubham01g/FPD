/** Switch the signed-in portal to another page (a sidebar PageId, e.g.
 *  "legacy-continuation"). The portal's page is App state, not a route, so
 *  App listens for this event; screens no longer have to fake it with a
 *  toast telling the user where to click. */
export function goToPage(page: string) {
  window.dispatchEvent(new CustomEvent("fpd:navigate", { detail: page }));
  window.scrollTo({ top: 0 });
}
