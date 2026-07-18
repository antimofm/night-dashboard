// ─────────────────────────────────────────────────────────────────────────────
//  Night Dashboard — your settings.  This is the ONLY file you need to edit.
//  Everything has a working default, so a fresh clone runs with no setup.
//
//  Any setting can also be overridden with a URL param (great for a Kindle
//  bookmark, so you don't have to commit anything):
//    ?place=&lat=&lon=&tz=&theme=&quotes=&poems=&decks=&ambient=&events=&who=
// ─────────────────────────────────────────────────────────────────────────────
window.CONFIG = {

  // ── Location (weather block). Find your lat/lon at latlong.net ───────────────
  place:     "London",
  latitude:  51.507,
  longitude: -0.128,
  timezone:  "Europe/London",   // an IANA name, e.g. "America/New_York"

  theme: "night",               // "night" = black e-ink (only theme for now)

  // ── Content sources ──────────────────────────────────────────────────────────
  //  Each of these can be:
  //    "default"                 use the bundled pack in /content
  //    "https://…/list.json"     fetch a remote JSON (or .csv) list
  //    "local:content/x.js"      a file you add under the site that sets the global
  //    null                      turn the section off
  quotes: "default",
  poems:  "default",
  decks:  null,        // no learning decks ship by default — point this at your own source to add some

  // ── Optional live modules — OFF unless you point them at a feed ──────────────
  //  Fetch JSON in the shapes documented in the README. Off by default, so a
  //  fresh clone never shows anyone else's private data.
  ambient: null,   // "This room" sensor readings — e.g. "https://your-host/ambient.json"
  events:  null,   // "Tomorrow" schedule          — e.g. "https://your-host/events.json"

  // ── Profiles (optional) ──────────────────────────────────────────────────────
  //  One profile = a plain single-user dashboard (no switcher). Add more to get a
  //  ⇄ pill that cycles between them (?who=<key>). A profile may override any
  //  source above for itself, e.g.  { key:"kids", name:"Kids", decks:null }.
  profiles: [
    { key: "me", name: "" }
  ]

};
