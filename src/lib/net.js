/**
 * Whether to hold back on anything the visitor has not asked for yet.
 *
 * The site fetches a few things ahead of time so the next tap is instant —
 * the other pieces' photographs, the story page. That is a kindness on a
 * good connection and a cost on a poor one: a phone with Data Saver on, or on
 * a 2G link, would pay for pages it may never open. Then it waits to be asked.
 */
export function frugal() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType || ''))
}
