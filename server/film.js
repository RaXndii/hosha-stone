import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, open, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { MEDIA_DIR, STORAGE } from './db.js'
import { HttpError } from './validate.js'
import { mediaUrl } from './media.js'

/**
 * A piece's film, prepared the way the site plays it.
 *
 * It must be an MP4 (or a phone's MOV) carrying H.264 video: the one kind
 * every browser and every phone plays. HEVC — an iPhone's default — is
 * refused, with how to export it right, rather than accepted and left black
 * on half the phones that open it.
 *
 * Where the server has ffmpeg, the film is repacked (not re-encoded) so it
 * starts playing before it has all arrived, and its first frame and a still
 * from its middle are drawn. Without ffmpeg the file is kept as it came, and
 * the two frames are the ones the admin's browser drew and sent with it.
 *
 * Files are named by a random id, never by what the browser called them.
 */
export const FILM_MAX = 80 * 1024 * 1024
export const FILM_TMP = join(STORAGE, 'tmp')

let ffmpeg = null
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'
export function hasFfmpeg() {
  if (ffmpeg === null) {
    try { ffmpeg = spawnSync(FFMPEG, ['-version'], { timeout: 5000 }).status === 0 } catch { ffmpeg = false }
  }
  return ffmpeg
}

/* ---------------------------------------------------------------- reading the file */

/**
 * What a film file is, read from its boxes rather than its name:
 * → { container: 'mp4' | null, video: 'h264' | 'hevc' | 'av1' | 'vp9' | 'other' | null,
 *     duration (s) | null, faststart: bool }
 */
export async function sniffFilm(path) {
  const fh = await open(path, 'r')
  try {
    const { size } = await fh.stat()
    const head = Buffer.alloc(16)
    await fh.read(head, 0, 16, 0)
    if (head.toString('latin1', 4, 8) !== 'ftyp') return { container: null, video: null, duration: null, faststart: false }

    // walk the top-level boxes: where the index (moov) is, and whether it comes before the pictures (mdat)
    let off = 0, moov = null, mdatAt = -1
    while (off + 8 <= size) {
      const h = Buffer.alloc(16)
      await fh.read(h, 0, 16, off)
      let len = h.readUInt32BE(0)
      const type = h.toString('latin1', 4, 8)
      if (len === 1) len = Number(h.readBigUInt64BE(8))
      else if (len === 0) len = size - off
      if (len < 8) break
      if (type === 'moov' && !moov) moov = { off, len }
      if (type === 'mdat' && mdatAt < 0) mdatAt = off
      off += len
    }
    if (!moov || moov.len > 64 * 1024 * 1024) return { container: 'mp4', video: null, duration: null, faststart: false }
    const box = Buffer.alloc(moov.len)
    await fh.read(box, 0, moov.len, moov.off)

    // the length: mvhd's duration over its timescale
    let duration = null
    const mv = box.indexOf('mvhd', 0, 'latin1')
    if (mv > 0) {
      const v = box[mv + 4]
      const scale = v === 1 ? box.readUInt32BE(mv + 24) : box.readUInt32BE(mv + 16)
      const d = v === 1 ? Number(box.readBigUInt64BE(mv + 28)) : box.readUInt32BE(mv + 20)
      if (scale) duration = Math.round((d / scale) * 100) / 100
    }
    // the picture's codec: the sample entry each track's stsd names
    const kinds = []
    for (let i = box.indexOf('stsd', 0, 'latin1'); i > 0; i = box.indexOf('stsd', i + 4, 'latin1')) {
      if (i + 16 <= box.length) kinds.push(box.toString('latin1', i + 16, i + 20))
    }
    const video = kinds.some((k) => k === 'avc1' || k === 'avc3') ? 'h264'
      : kinds.some((k) => k === 'hvc1' || k === 'hev1') ? 'hevc'
        : kinds.includes('av01') ? 'av1'
          : kinds.includes('vp09') ? 'vp9'
            : kinds.length ? 'other' : null
    return { container: 'mp4', video, duration, faststart: mdatAt < 0 || moov.off < mdatAt }
  } finally {
    await fh.close()
  }
}

const run = (args, ms = 90_000) => new Promise((resolve) => {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  p.stderr.on('data', (d) => { err += d })
  const t = setTimeout(() => p.kill('SIGKILL'), ms)
  p.on('close', (code) => { clearTimeout(t); resolve(code === 0 ? null : err || `ffmpeg stopped (${code})`) })
  p.on('error', (e) => { clearTimeout(t); resolve(e.message) })
})

async function still(buffer, file, width = 1280) {
  await sharp(buffer, { failOn: 'error' }).rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(file)
}

/**
 * The uploaded file (on disk, under FILM_TMP) → the film as the site stores it.
 * frames: { poster, cover } — JPEG/PNG/WebP buffers the browser drew, if any.
 * duration: what the browser read, used when the file itself does not say.
 * → { src, small, poster, cover, duration }
 */
export async function prepareFilm(tmpPath, productId, { frames = {}, duration: told } = {}) {
  const info = await sniffFilm(tmpPath)
  if (info.container !== 'mp4') throw new HttpError(422, 'That file is not a film we can use. Upload an MP4 (or a .mov from a phone).')
  if (info.video === 'hevc') {
    throw new HttpError(422, 'This film is HEVC (High Efficiency), which many browsers can’t play. Export it as H.264 — on an iPhone: Settings → Camera → Formats → Most Compatible; in an editor, choose H.264 — and upload it again.')
  }
  if (info.video !== 'h264') throw new HttpError(422, 'This film’s picture isn’t H.264, the kind every phone plays. Export it as an H.264 MP4 and upload it again.')
  const duration = info.duration ?? (Number.isFinite(Number(told)) ? Number(told) : null)
  if (!duration || duration < 0.5) throw new HttpError(422, 'That film seems to be empty.')
  if (duration > 300) throw new HttpError(422, `That film runs ${Math.round(duration / 60)} minutes. Keep it under five — under thirty seconds is best.`)

  const dir = join(MEDIA_DIR, String(productId))
  await mkdir(dir, { recursive: true })
  const id = randomUUID()
  const file = join(dir, `film-${id}.mp4`)
  const posterFile = join(dir, `film-${id}-poster.webp`)
  const coverFile = join(dir, `film-${id}-cover.webp`)

  if (hasFfmpeg()) {
    // repacked, not re-encoded: the index first, so it plays as it arrives
    const err = await run(['-i', tmpPath, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', file])
    if (err) await rename(tmpPath, file)
  } else {
    await rename(tmpPath, file)
  }

  let poster = null, cover = null
  try {
    if (frames.poster) { await still(frames.poster, posterFile); poster = posterFile }
    else if (hasFfmpeg() && !(await run(['-ss', '0', '-i', file, '-frames:v', '1', '-vf', 'scale=1280:-2', posterFile]))) poster = posterFile
  } catch { /* the film still plays; it waits on black instead of its first frame */ }
  try {
    if (frames.cover) { await still(frames.cover, coverFile, 960); cover = coverFile }
    else if (hasFfmpeg() && !(await run(['-ss', String(Math.max(0, duration * 0.6)), '-i', file, '-frames:v', '1', '-vf', 'scale=960:-2', coverFile]))) cover = coverFile
  } catch { /* the card shows the poster instead */ }

  const src = mediaUrl(productId, `film-${id}.mp4`)
  return {
    src,
    small: src,
    poster: poster ? mediaUrl(productId, `film-${id}-poster.webp`) : '',
    cover: cover ? mediaUrl(productId, `film-${id}-cover.webp`) : poster ? mediaUrl(productId, `film-${id}-poster.webp`) : '',
    duration: Math.round(duration * 100) / 100,
    faststart: info.faststart || hasFfmpeg(),
  }
}

/** A film's files, gone — only the ones uploaded; a bundled film is never deleted from disk. */
export async function removeFilmFiles(film) {
  if (!film) return
  for (const url of new Set([film.src, film.small, film.webm, film.poster, film.cover])) {
    if (!url || !url.startsWith('/media/')) continue
    await rm(join(MEDIA_DIR, url.slice('/media/'.length)), { force: true }).catch(() => {})
  }
}
