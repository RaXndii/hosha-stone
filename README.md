# Hosha Stone

The Hosha Stone website (home showroom, Browsing archive, Look closer viewer,
Kept, the Story, WhatsApp/Instagram ordering) and its admin at `/admin`.

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

## The pages

| Where | What |
| --- | --- |
| `/` | the showroom, opening on the first piece |
| `/piece/<id>` | the showroom, opening on that piece |
| `/browse` | the archive — every piece, filtered and sorted |
| `/saved` | Kept — the same archive holding only what this visitor saved |
| `/story` | the house at length, in the words set in /admin → About |

These are real paths, not `#` fragments. A fragment never reaches the server,
so every link would have arrived as the bare home page — one title and one
picture for the whole house. Because they are ordinary URLs, the server can
answer each one with the right title, words and picture (`server/meta.js`),
which is what a link pasted into WhatsApp or Instagram actually shows. Links
shared before this change still land where they meant to.

**This means every path must serve `index.html`.** `npm start` does. On a
static host, add a rewrite of everything to `/index.html`, or deep links
404.

## On a phone

Most visitors arrive on a phone, from a link someone sent them, so the phone
is designed for rather than shrunk to:

- **A shared link opens on the piece.** The house's name card plays once a
  visit, at the front door; a link to a piece goes straight to it, with the
  room lit around it.
- **Buying sits under the thumb.** A bar along the bottom carries the price,
  the heart and *Choose a size*, and steps aside whenever the purchase on the
  page is itself on screen. Sizes open in a sheet with buttons a finger can
  hit; it pulls down to close.
- **The piece follows the thumb.** Drag it sideways and it comes with you;
  let go past the line, or flick it, and the next piece is brought in; let go
  short and it swings back. The marks on the plinth's face show where you are
  in the set, and can be tapped.
- **Every control is at least 44 px**, the smallest labels are lifted a step
  below desk width, and the archive is two pieces to a row.
- **The browser's bar takes the room's colour**, piece by piece.
- **Notches and home indicators are cleared** everywhere something meets the
  edge of the screen, turned either way.

What it costs a phone to arrive: on Lighthouse's mobile profile (slow 4G, a
CPU four times slower than a desk) a shared link shows its piece in about
2.6 s. Responses are compressed (Brotli or gzip), the two typefaces are served
from the site itself, the page arrives with the catalogue already in it, the
photograph it opens on is asked for before any script runs, and only the
pieces a swipe can reach next are fetched ahead — none at all with Data Saver
on.

## Share cards

`server/share.js` draws the picture a shared link shows — 1200×630, the piece
lit in its own palette, the same way the showroom lights it. Cards are drawn on
demand at `/share/<piece>.jpg`, kept under `storage/share/`, and redrawn when
the piece changes. Nothing that can go stale is drawn into one (no price, no
sizes), so a card stays true; the words beside it come from the page's own
tags, which are always current.

`npm run card` rewrites `public/share-card.jpg` — the house's own card, which
ships with the build and stands in wherever there is no server.

The server also answers `/robots.txt` and `/sitemap.xml`, and writes
`Product` structured data into every piece's page.

## Where things live

| What | Where |
| --- | --- |
| Database (apparel, categories, orders, About, size guide, settings, admins) | `storage/hosha.db` |
| Uploaded photos (processed to WebP) | `storage/media/` |
| Share cards, once drawn | `storage/share/` |
| Server and API | `server/` |
| Tags a scraper reads; share cards | `server/meta.js`, `server/share.js` |
| Typefaces (Inter, Playfair Display — SIL OFL, licences beside them) | `public/fonts/` |
| Icons for the tab and a phone's home screen | `public/favicon.svg`, `public/*icon*.png` |
| Admin app | `admin/index.html`, `src/admin/` |
| Customer site | `index.html`, `src/` |

**Back up the `storage/` folder** — it holds everything the admin manages.
Set `HS_STORAGE=/path` to keep it elsewhere (e.g. a persistent disk on a host).
`storage/share/` is the one part that need not be kept: it redraws itself.

On a fresh database the server seeds the house's current five pieces, the About
text and the ordering settings, so the site starts exactly as it was.

## The size guide

Empty until you fill it in, on purpose. Measurements are the house's own, and a
wrong number is a garment that does not fit — so none are invented. Until you
add them in **/admin → Size guide**, a piece says plainly that its measurements
are not published and offers the customer WhatsApp instead.

What the site always shows, because it knows them for certain: the sizes a
piece is cut in, and which are left. Measurements are of the garment laid
flat, typed in centimetres or inches; customers can read them in either.

## Deploying

Any host that runs Node and keeps a persistent disk (Render, Railway, Fly, a VPS):

- build command `npm install && npm run build`, start command `npm start`
- mount a persistent disk and set `HS_STORAGE` to it
- set `NODE_ENV=production` (secure cookies) and, behind a proxy, `TRUST_PROXY=true`
- serve over HTTPS
- `PORT` is read from the environment
- set `PUBLIC_URL=https://your-domain` so links, cards and the sitemap are
  absolute (otherwise the address the request arrived on is used)

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
- `/saved` is this visitor's own and is never indexed; what they kept is held
  in their browser and is never sent anywhere.

Without a server (e.g. a static preview) the site falls back to the bundled
catalogue in `src/data/static-catalogue.js`.
