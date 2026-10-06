# Hosha Stone

The Hosha Stone website (home showroom, Browsing archive, Look closer viewer,
WhatsApp/Instagram ordering) and its admin at `/admin`.

## Running it

Requires Node 22.5 or newer (the database uses Node's built-in SQLite).

```bash
npm install
npm run build      # build the site and the admin
npm start          # serve everything on http://localhost:8787
```

Open **http://localhost:8787/admin**. The first time, there is no account yet:
the server prints a one-time **setup code** in its console. Enter it with your
name, email and a password (10+ characters) to create the owner account.

### While developing

Two terminals:

```bash
npm run server     # the API on :8787
npm run dev        # the site with hot reload on :5173 (admin at /admin/)
```

## Where things live

| What | Where |
| --- | --- |
| Database (apparel, categories, orders, About, settings, admins) | `storage/hosha.db` |
| Uploaded photos (processed to WebP) | `storage/media/` |
| Server and API | `server/` |
| Admin app | `admin/index.html`, `src/admin/` |
| Customer site | `index.html`, `src/` |

**Back up the `storage/` folder** — it holds everything the admin manages.
Set `HS_STORAGE=/path` to keep it elsewhere (e.g. a persistent disk on a host).

On a fresh database the server seeds the house's current five pieces, the About
text and the ordering settings, so the site starts exactly as it was.

## Deploying

Any host that runs Node and keeps a persistent disk (Render, Railway, Fly, a VPS):

- build command `npm install && npm run build`, start command `npm start`
- mount a persistent disk and set `HS_STORAGE` to it
- set `NODE_ENV=production` (secure cookies) and, behind a proxy, `TRUST_PROXY=true`
- serve over HTTPS
- `PORT` is read from the environment

## Security, in short

- Passwords: scrypt with a per-user salt; only the hash is stored.
- Sessions: random token in an httpOnly, SameSite=Strict cookie; the database
  stores only its SHA-256. Sessions last 7 days; changing the password ends the others.
- Every `/api/admin` route requires a session, and every change also requires
  the `X-HS-Admin` header (CSRF protection). Logins are rate-limited.
- Everything is validated on the server. Order prices are always taken from the
  database, never from the browser.
- Uploads: up to 15 MB, checked as real images, re-encoded to WebP, stored
  under random names.

Without a server (e.g. a static preview) the site falls back to the bundled
catalogue in `src/data/static-catalogue.js`.
