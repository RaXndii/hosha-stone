import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from './db.js'
import { HttpError } from './validate.js'

/**
 * Admin authentication.
 *
 *  - Passwords: scrypt (N=2^15, r=8, p=1) with a random 16-byte salt per user.
 *    Only the hash is stored.
 *  - Sessions: a random 32-byte token in an httpOnly, SameSite=Strict cookie.
 *    The database stores the token's SHA-256, never the token itself, so a
 *    leaked database cannot be replayed as a login.
 *  - CSRF: every admin request that changes something must carry the
 *    X-HS-Admin header. Browsers will not send a custom header cross-site
 *    without a CORS preflight, and this server answers no preflights.
 *  - Brute force: failed logins are limited per address and per email.
 *  - First run: with no admin yet, the server prints a one-time setup code to
 *    its own console. Creating the owner account requires it, so a freshly
 *    deployed server cannot be claimed by whoever finds /admin first.
 */
const scryptAsync = promisify(scrypt)
const KEYLEN = 64
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
export const COOKIE = 'hs_session'
const SESSION_DAYS = 7

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, KEYLEN, PARAMS)
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [alg, N, r, p, saltB64, keyB64] = String(stored).split('$')
  if (alg !== 'scrypt') return false
  const expected = Buffer.from(keyB64, 'base64')
  const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: +N, r: +r, p: +p, maxmem: PARAMS.maxmem })
  return key.length === expected.length && timingSafeEqual(key, expected)
}

// a fixed hash to verify against when the email is unknown, so timing does not reveal which emails exist
let DUMMY = null
export const dummyHash = async () => (DUMMY ??= await hashPassword(randomBytes(12).toString('hex')))

const sha = (t) => createHash('sha256').update(t).digest('hex')

export function createSession(res, userId, secure) {
  const token = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400e3)
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha(token), userId, expires.toISOString())
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString())
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure, path: '/', expires })
}

export function destroySession(req, res) {
  const token = req.cookies?.[COOKIE]
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token))
  res.clearCookie(COOKIE, { path: '/' })
}

export function destroyOtherSessions(userId, req) {
  const token = req.cookies?.[COOKIE]
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(userId, token ? sha(token) : '')
}

export function userFromRequest(req) {
  const token = req.cookies?.[COOKIE]
  if (!token || token.length > 100) return null
  const row = db.prepare(`SELECT u.id, u.email, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`).get(sha(token))
  if (!row || row.expires_at < new Date().toISOString()) return null
  return { id: row.id, email: row.email, name: row.name }
}

/** Gate for every /api/admin route except login and setup. */
export function requireAdmin(req, res, next) {
  const user = userFromRequest(req)
  if (!user) return next(new HttpError(401, 'Sign in to continue.'))
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.get('X-HS-Admin') !== '1') {
    return next(new HttpError(403, 'Request refused.'))
  }
  req.user = user
  next()
}

/** Cookie parsing without a dependency — only our one cookie matters. */
export function cookies(req, _res, next) {
  req.cookies = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const k = part.slice(0, i).trim()
    if (k === COOKIE) req.cookies[k] = decodeURIComponent(part.slice(i + 1).trim())
  }
  next()
}

/* ------------------------------------------------ rate limiting */
const buckets = new Map()
/** true if `key` has used up `limit` hits in the last `windowMs` */
export function limited(key, limit, windowMs, hit = true) {
  const now = Date.now()
  const list = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (hit) list.push(now)
  buckets.set(key, list)
  return list.length > limit
}
export const clearLimit = (key) => buckets.delete(key)
setInterval(() => {
  const now = Date.now()
  for (const [k, list] of buckets) if (!list.some((t) => now - t < 3600e3)) buckets.delete(k)
}, 600e3).unref()

/* ------------------------------------------------ first-run setup */
let setupCode = null
export const needsSetup = () => db.prepare('SELECT COUNT(*) n FROM users').get().n === 0
export function issueSetupCode() {
  if (!needsSetup()) { setupCode = null; return null }
  setupCode ??= randomBytes(4).toString('hex').toUpperCase()
  return setupCode
}
export function checkSetupCode(code) {
  if (!setupCode || typeof code !== 'string') return false
  const a = Buffer.from(code.trim().toUpperCase())
  const b = Buffer.from(setupCode)
  return a.length === b.length && timingSafeEqual(a, b)
}
export const clearSetupCode = () => { setupCode = null }
