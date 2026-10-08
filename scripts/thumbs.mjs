import { readdir, mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/**
 * A small copy of every photograph the site ships with, in public/thumb/ —
 * what a card in the archive, a stone in the closer look's strip and a line
 * of the search are drawn from. A photograph is drawn there at a fraction of
 * its size, and a phone was fetching each one whole: the archive alone was
 * half a megabyte, the search more. Photographs uploaded in the admin get
 * the same small copy as they arrive (server/media.js); these are the
 * house's own.
 *
 *   npm run thumbs          (after adding or replacing a photograph in public/)
 *
 * 480px on the long side, the size the admin's uploads are given: sharp at a
 * phone's density in a card, and a hundred-odd KB less each.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const out = join(root, 'thumb')
await mkdir(out, { recursive: true })
let n = 0
for (const name of (await readdir(root)).filter((f) => f.endsWith('.webp'))) {
  const src = join(root, name)
  const dst = join(out, name)
  const made = await stat(dst).catch(() => null)
  if (made && made.mtimeMs >= (await stat(src)).mtimeMs) continue
  await sharp(src).resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(dst)
  n++
}
console.log(`  ${n} thumbnail${n === 1 ? '' : 's'} written to public/thumb/`)
