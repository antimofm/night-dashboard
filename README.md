# Night Dashboard

Turn an old Kindle (or any spare screen) into a calm, black-on-white night
dashboard: date, a shipping-forecast-style weather block with moon phase, a
daily quote and poem, and optional tap-to-open learning decks. Built for the
Kindle's ancient e-ink browser, so it's plain text, big tap targets, and no
build step — but it works in any browser.

**It runs with zero setup.** Clone it, open `index.html` (or turn on GitHub
Pages), and you get a working dashboard on sensible defaults. Personalise it by
editing **one file, `config.js`** — or by adding URL params to a bookmark.

## Quick start

1. **Fork** this repo (or use it as a template).
2. Settings → **Pages** → **Build and deployment → Source: GitHub Actions**
   (this repo ships an Actions deploy workflow). You get a URL like
   `https://you.github.io/your-repo/`.
3. Open it. Done — it shows London weather, a quote, and a poem.
4. Edit **`config.js`** to make it yours (see below). Commit → Pages redeploys.

Point your Kindle's browser at the URL. (Keeping a Kindle awake on one page is
the one fiddly bit — see *Keeping it awake* below.)

## Configure

Everything lives in [`config.js`](config.js), fully commented. The essentials:

```js
window.CONFIG = {
  place: "London", latitude: 51.507, longitude: -0.128, timezone: "Europe/London",
  quotes: "default", poems: "default", decks: null,
  ambient: null, events: null,
  profiles: [{ key: "me", name: "" }]
};
```

Any setting can also be overridden with a **URL param** — handy for a Kindle
bookmark, so you don't have to commit your location at all:

```
…/your-repo/?place=Lisbon&lat=38.72&lon=-9.14&tz=Europe/Lisbon
```

Params: `place lat lon tz quotes poems decks ambient events who` (`lon` may also
be written `lng`). A `theme` key exists but is reserved — only the night theme
renders today.

## Sources — swap the content

`quotes`, `poems`, and `decks` each take one of:

| Value | Meaning |
|---|---|
| `"default"` | use the bundled pack in `/content` |
| `"https://…/file.json"` | fetch a remote JSON list (or `.csv`) |
| `"local:content/my-file.js"` | a file you add under the site (e.g. in `/content`) that sets the global |
| `null` | turn the section off |

**Shapes:**

- **Quotes** — JSON `[ ["quote", "Author, Source"], … ]`, or CSV `quote,author`
  per row. A local `.js` file sets `window.CONTENT_QUOTES = [ … ]`.
- **Poems** — JSON `[ ["original or ''", "body\nwith\nnewlines", "Author"], … ]`.
  Local `.js` sets `window.CONTENT_POEMS`.
- **Decks** — JSON array of decks; each `{ name, mode, cards }` where `mode` is:
  - `"lesson"` — one card a night + a recall from 3 nights back (`pinned: true`
    shows it always; otherwise it's labelled "Tonight's lesson").
  - `"browse"` — collapsible, then step through card by card.
  - `"accordion"` — a reference list; tap a title to reveal it.
  - Card shape: `{ t: "title", b: ["line", …] }`; lesson/browse cards also take
    `q`/`a` (the recall question and answer). Local `.js` sets
    `window.CONTENT_DECKS`.

**No learning decks ship by default** (`decks: null`) — point `decks` at your own
JSON source (or a `local:content/yourpack.js` you add) to enable the tap-to-open
decks. To swap quotes/poems, point `quotes`/`poems` at a URL (JSON or CSV) or a
`local:` file the same way.

## Optional live modules

Two extra blocks stay **off** until you give them a feed URL — so a fresh clone
never shows anyone's private data:

- **`ambient`** — a "This room" line of sensor readings. Point it at JSON like
  `{ "room": "Study", "temp": 21, "rh": 45, "co2": 600 }` — optional extras:
  `voc`, `pm25`, and a `humidifier` object (`on`, `water_low`). (Multi-profile:
  use `{ "rooms": { "me": {…}, "kids": {…} } }` and it picks by the active profile.)
- **`events`** — a "Tomorrow" list. JSON:
  `{ "date": "Fri 17 Jul", "events": [ { "time": "16:15", "title": "…" } ] }`.

Serve those from anywhere that returns JSON over HTTPS.

## Profiles

One profile = a plain single-user dashboard. Add more to get a ⇄ pill that
cycles between them (`?who=<key>`). Any profile can override a source for
itself, e.g. a "kids" profile with `decks: null` and its own quote pack.

## Keeping it awake

The genuinely annoying part of any Kindle dashboard is stopping the device
sleeping/screensaving on the page. Options vary by model (airplane mode + a
refresh, disabling special offers, or a jailbreak-free kiosk trick) — worth a
web search for your exact Kindle.

## Layout

- `index.html` — loads `config.js`, then `app.js`. No build step.
- `config.js` — **your settings** (the only file you normally edit).
- `app.js` — the engine. Generic; contains no personal data.
- `content/` — the default quote and poem packs.
