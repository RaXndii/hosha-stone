import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { houseCard } from '../server/share.js'
import { STATIC_PRODUCTS } from '../src/data/static-catalogue.js'

/**
 * The house's own card, written into public/ so it ships with the build.
 *
 * The server draws a card per piece on demand (server/share.js); this is the
 * one a link falls back to — the home page, a page without a piece, and any
 * site served as plain files with no server behind it.
 *
 *   npm run card
 */
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'share-card.jpg')
await writeFile(out, await houseCard(STATIC_PRODUCTS))
console.log(`  Wrote ${out}`)
