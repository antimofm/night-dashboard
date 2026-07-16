# Ideas

Small things that could be added. Nothing here is committed to — the dashboard
is complete and useful as-is. PRs welcome.

All of these must keep working on the Kindle's ancient e-ink browser: plain
`var` + `XMLHttpRequest`, no hover, no modern JS, degrade gracefully on a 600px
grayscale screen.

## Content / display
- **ASCII weather glyph** — a small drawn sun / cloud / rain next to conditions,
  from the WMO code.
- **Temperature sparkline** — next 12h as block chars `▁▂▃▄▅▆▇` (the hourly data
  is already fetched).
- **Wind compass rose** and a **sunrise → sunset arc** with the sun's position.
- **Day / sepia theme** (the `theme` config key is reserved for this) with an
  optional auto-switch on local time.
- **Tap-to-cycle quotes/poems** (left/right tap zones), since hover doesn't work.

## Product
- A **setup page** that builds the bookmark URL (place picker → copy-paste URL +
  a QR code to open on the Kindle).
- More bundled content packs (quote/poem/deck sets) as ready-made sources.

## Known fiddly bit
- Keeping a Kindle awake on one page varies by model — worth documenting the
  trick for common Kindles (see README → *Keeping it awake*).
