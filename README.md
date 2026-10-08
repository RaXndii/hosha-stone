# Hosha Stone

The Hosha Stone website (home showroom, Browsing archive, Look closer viewer
with each piece's details and film, Kept, the Story, WhatsApp/Instagram
ordering) and its admin at `/admin`.

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

## Look closer

*Look closer* puts a piece on a stage of its own.

- **Turn it.** Drag it, or use the arrow keys, to turn it through the
  angles it was photographed from; the dial at the foot says what you are
  looking at. A piece photographed only from the front stays facing you.
  Scroll, pinch or the zoom buttons go close, but never further than the
  photograph can bear.
- **The details are marked on the cloth.** A piece can carry up to eight
  marks (the collar, the zip, a pocket), each a small diamond on the piece
  that breathes now and then. Pressing one goes close on that spot with a
  line about it, or opens the photograph that shows it. On a desk they are
  also listed beside the stage. Set them in **/admin → a piece → Details on
  the piece**: click where the detail is on the photograph, name it, add a
  line, and pick a close photograph that shows it if there is one.
- **Close photographs** (the collar, on the body, the back) open as large as
  the screen allows, cut like the rest of the house. Pinch, scroll or
  double-tap to go in (up to four times, less for a small photograph), drag
  to move, swipe for the next.
- **The film**, if the piece has one, has its own card among them and opens
  out of it.

## Films

A piece can have a short film. It plays from its card in Look closer, and
from *Watch the film* under *Look closer* on the piece's page. It opens out
of whatever was pressed, with its sound if the visitor has the house's sound
on, or muted with a button offering the sound if not. The house's music
steps aside while it plays. The controls are the house's own and work from
the keyboard too (space, ← →, M, F, Esc); the film keeps the keyboard until
it is closed. On a phone held upright the controls sit under the picture and
stay; anywhere they lie over it, they get out of the way while it plays.

To add one: **/admin → a piece → Film**.

- **An MP4 (or a phone's .mov) with H.264 video**, the kind every phone
  plays, up to 80 MB and five minutes long (under thirty seconds is best).
  HEVC, an iPhone's default, is refused with instructions for exporting it
  correctly (on an iPhone: Settings → Camera → Formats → Most Compatible).
- The file is checked by what is inside it, not by its name, and stored
  under a random name.
- If the server has **ffmpeg** (on the PATH, or at `FFMPEG_PATH`), the film
  is repacked, not re-encoded, so it starts playing before it has fully
  arrived, and its first frame and a still from its middle are taken there.
  Without ffmpeg it is kept as it came and your browser draws those two
  frames as you upload. Either works; ffmpeg makes a long film start sooner.
- The film itself isn't downloaded until someone asks for it (only its
  small still is). A phone on Data Saver or 2G gets the lighter version
  where there is one, and a host that won't serve a film in pieces is
  handled by fetching it whole.

The Espresso jacket's film ships with the site (`public/film/`), as an H.264
MP4 at 720p and 480p, plus a VP9 WebM for browsers built without H.264. It
was cut down from the ten-second film supplied. The two seconds where a
camera rig crosses in front of the jacket are gone. The front shot before
them is held a little longer (slowed down, with frames made in between) and
dissolves into the turn behind. The sound is cut to match, so its beat still
lands on the next cut.

## New pieces in the bundled catalogue

`src/data/static-catalogue.js` seeds a fresh database. A piece added there
later still reaches a database that already exists, if it carries a higher
`since` than every piece before it (the Espresso jacket has `since: 2`). On
the next start the server adds it once, featured and first in the room,
under the number it was written with unless that number is taken. Delete it
in the admin and it stays deleted, because it is only ever added once.

A piece can also take another's place: give it `replaces: '<slug>'` with its
`since`. On the next start the old piece is deleted (with its uploaded
photographs and film) and the new one stands where it stood, under its
number, once. The Navy Zip Jacket arrived this way (`since: 3`), photographed
again flat with its details marked and a film, keeping its address
(`/piece/zip-021n`) so links already shared still open it. Orders keep the
number and name they were placed under.

## Sound

The site has its own music and a sound for every touch. None of it is a
recording: it is all made in the browser as it plays (`src/lib/sound/`), so
there is no audio to download, a phone pays nothing for it, and nothing is
borrowed from anyone — the heart's sound is in the spirit of an old game's
pickup, but it is the house's own.

- **Nothing plays until the visitor touches the page.** Browsers insist on
  it, and it is right. The first tap anywhere starts the music, which fades
  in over several seconds; it pauses whenever the tab is out of sight.
- **Two switches, both remembered on the device.** The four bars in the
  header are the **music**: off, the soundtrack fades away (and the archive's
  thunder with it) while every tap, size and heart keeps its sound; on, it
  comes back over a few seconds. The small speaker beside them is **all
  sound**: off, the site is silent. Pressing the bars while everything is off
  brings everything back. On a phone both are at the foot of the menu (the
  bars are in the header too).
- **On a phone it behaves like a game, not a video.** It plays alongside the
  visitor's own music rather than stopping it, and a phone on silent stays
  silent.
- **Each page has its music, and it is calm.** Chords change slowly (every
  12 to 16 seconds) and arrive slowly, the pads are dark and soft, and the
  glass notes are few. The showroom is warm (Dm9 · B♭maj7 · Fmaj9 · C6/9)
  and moves to a new key with each piece. The archive is dark — open
  fifths and wind — and thunder answers the lightning: from the side of the
  screen it struck, late if it was far off (a long roll), almost at once if
  it was close (a crack first). The Story is lighter, with plucked notes.
- **Every control has a sound, in tune with the music.** Buttons and links
  tap; the sizes are notes of the chord, the smallest size lowest; ordering
  rings a chord, and ordering without a size answers with a soft "no";
  panels open and close, pieces swipe past, and the piece clicks as it turns
  under Look closer.
- **Balanced, not loud.** Measured offline at the site's own mix: the music
  sits near −27 to −29 dBFS, taps at −30 to −35, sizes and the heart near
  −22 to −25, an order near −19, thunder near −20 — and one
  compressor over everything, so nothing clips.

To change a control's sound, give it `data-sound="<name>"` (the names are
`SOUNDS` in `src/lib/sound/recipes.js`), or `data-sound="none"` for silence.
To start with sound off until a visitor turns it on, make `readPref()` in
`src/lib/sound/index.js` return `true` only for a stored `'on'`.

## Kept counts

A piece shows how many people have kept it (the heart) once **12** have —
fewer says little. It is a true count and nothing else: no stars, no
rating, nothing seeded. Each browser makes up a random id for itself (not a
person, an account or an address), tells the server which pieces it has
kept, and the server counts distinct ids per piece (`hearts` in the
database). Telling it again changes nothing; letting a heart go takes it
off. The threshold is `KEPT_SHOWN_FROM` in `src/lib/shop.jsx`.

## Cut stone

The controls are cut, not rounded — corners chamfered like a stone, a single
hairline edge, and a chosen size, price or tag lit as a gem in the piece's
own colour. Look closer is a loupe: a viewfinder round a small cut stone,
which closes in under a hand. One set of shapes does all of it — `.facet`,
`.plate` and `.lozenge` in `src/index.css` (under "CUT STONE"),
`src/components/ui/Plate.jsx` and `src/components/ui/Loupe.jsx` — so a new
control takes the same cut by laying a `<Plate>` behind its content.

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
| Uploaded films and their two stills | `storage/media/<piece>/film-*` |
| Films that ship with the site | `public/film/` |
| Share cards, once drawn | `storage/share/` |
| Server and API | `server/` |
| Tags a scraper reads; share cards | `server/meta.js`, `server/share.js` |
| Typefaces (Inter, Playfair Display — SIL OFL, licences beside them) | `public/fonts/` |
| Music and sounds (made in the browser) | `src/lib/sound/` |
| The cut-stone shapes | `src/index.css` ("CUT STONE"), `src/components/ui/Plate.jsx`, `Loupe.jsx` |
| Icons for the tab and a phone's home screen | `public/favicon.svg`, `public/*icon*.png` |
| Admin app | `admin/index.html`, `src/admin/` |
| Customer site | `index.html`, `src/` |

**Back up the `storage/` folder** — it holds everything the admin manages.
Set `HS_STORAGE=/path` to keep it elsewhere (e.g. a persistent disk on a host).
`storage/share/` is the one part that need not be kept: it redraws itself.

On a fresh database the server seeds the house's current six pieces, the About
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
- optionally install ffmpeg (or set `FFMPEG_PATH`) so uploaded films are
  repacked to start sooner

## Security, in short

- Passwords: scrypt with a per-user salt; only the hash is stored.
- Sessions: random token in an httpOnly, SameSite=Strict cookie; the database
  stores only its SHA-256. Sessions last 7 days; changing the password ends the others.
- Every `/api/admin` route requires a session, and every change also requires
  the `X-HS-Admin` header (CSRF protection). Logins are rate-limited.
- Everything is validated on the server. Order prices are always taken from the
  database, never from the browser.
- Uploads: up to 15 MB, checked as real images, re-encoded to WebP, stored
  under random names. Films: up to 80 MB, read by their contents rather than
  their names, H.264 only, stored under random names; a refused upload
  leaves nothing behind.
- `/saved` is this visitor's own and is never indexed. What they kept is held
  in their browser; the server is told only which pieces, under a random id
  the browser made up, to count them — no name, account or address. That
  route is rate-limited and accepts only pieces that exist.

Without a server (e.g. a static preview) the site falls back to the bundled
catalogue in `src/data/static-catalogue.js`.
