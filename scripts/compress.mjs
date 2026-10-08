import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

/**
 * Every script and stylesheet in the build, compressed once, as hard as it
 * will go: Brotli at its highest setting (and gzip beside it, for anything
 * that has no Brotli). The server sends these as they are (server/index.js),
 * so a phone gets the smallest file there is and the server spends nothing
 * compressing it again for each visitor. Run after vite build (npm run build
 * does).
 */
const dist = join(fileURLToPath(new URL('..', import.meta.url)), 'dist')
let saved = 0
let files = 0
for (const dir of ['assets', '.']) {
  for (const name of await readdir(join(dist, dir))) {
    // (the service worker is left as it is: a browser checks it for itself)
    if (!/\.(js|css|svg|json|webmanifest)$/.test(name) || name === 'sw.js') continue
    const file = join(dist, dir, name)
    if (!(await stat(file)).isFile()) continue
    const raw = await readFile(file)
    if (raw.length < 1024) continue
    const br = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
    await writeFile(`${file}.br`, br)
    await writeFile(`${file}.gz`, gzipSync(raw, { level: 9 }))
    saved += raw.length - br.length
    files++
  }
}
console.log(`  Compressed ${files} files (Brotli saves ${(saved / 1024).toFixed(0)} KB)`)
