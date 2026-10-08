/**
 * A closed panel is put to rest: the browser skips everything inside it — no
 * styling, no layout, no painting — until it opens again (index.css,
 * .at-rest). Hidden is not enough: a hidden panel is still restyled along
 * with the whole page, and the showroom restyles the whole page with every
 * change of piece. Woken before it moves, put back once it has gone.
 */
export function rest(el, on = true) {
  if (el) el.classList.toggle('at-rest', on)
}
