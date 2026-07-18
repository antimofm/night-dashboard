// Night Dashboard — a tiny, configurable e-ink dashboard for an old Kindle (or any
// browser). ALL personalization lives in config.js (or URL params); this file is the
// generic engine and contains no personal data. Docs: README.md.
(function () {

  // ---- base path: the directory this page is served from --------------------
  var BASE = location.pathname.replace(/[^/]*$/, "");

  var now = new Date();
  // local-day counter (rotates decks/quotes/poems at LOCAL midnight, matching the date header)
  var dayN = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  function dayIndex(len) { return ((dayN % len) + len) % len; }
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  // HTML-escape anything from a config/URL/feed source before it goes into innerHTML.
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  // ---- config: DEFAULTS < config.js < URL params ----------------------------
  var DEFAULTS = {
    place: "London", latitude: 51.507, longitude: -0.128, timezone: "Europe/London",
    theme: "night",
    quotes: "default", poems: "default", decks: "default",
    ambient: null, events: null,
    profiles: [{ key: "me", name: "" }]
  };
  var cfg = {}, k;
  for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) cfg[k] = DEFAULTS[k];
  var userCfg = window.CONFIG || {};
  for (k in userCfg) if (userCfg.hasOwnProperty(k)) cfg[k] = userCfg[k];

  // URL params (?place=&lat=&lon=&tz=&theme=&quotes=&poems=&decks=&ambient=&events=&who=)
  var qp = {};
  location.search.replace(/^\?/, "").split("&").forEach(function (pair) {
    if (!pair) return;
    try {
      var i = pair.indexOf("=");
      var key = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
      qp[key] = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
    } catch (e) { /* skip a malformed percent-encoded pair rather than throw */ }
  });
  var PMAP = { place:"place", lat:"latitude", lon:"longitude", lng:"longitude", tz:"timezone",
               theme:"theme", quotes:"quotes", poems:"poems", decks:"decks", ambient:"ambient", events:"events" };
  var NULLABLE = { quotes:1, poems:1, decks:1, ambient:1, events:1 };  // only these may be turned "off"
  for (k in PMAP) if (qp.hasOwnProperty(k)) {
    var v = qp[k], dest = PMAP[k];
    if (NULLABLE[dest] && (v === "null" || v === "off" || v === "")) { cfg[dest] = null; continue; }
    if (k === "lat" || k === "lon" || k === "lng") {
      var num = parseFloat(v);
      if (!isFinite(num)) continue;   // ignore junk coords, keep config/default
      v = num;
    }
    cfg[dest] = v;
  }

  // ---- active profile -------------------------------------------------------
  var profiles = (cfg.profiles && cfg.profiles.length) ? cfg.profiles : DEFAULTS.profiles;
  var whoKey = qp.who || profiles[0].key;
  var profile = null, pi;
  for (pi = 0; pi < profiles.length; pi++) if (profiles[pi].key === whoKey) profile = profiles[pi];
  if (!profile) { profile = profiles[0]; whoKey = profile.key; }
  // A source = the profile's own override (incl. explicit null = off) else the global.
  function sourceFor(type) {
    return (profile && profile.hasOwnProperty(type)) ? profile[type] : cfg[type];
  }

  // ---- styles + skeleton ----------------------------------------------------
  var STYLE =
  "* { margin:0; padding:0; box-sizing:border-box; }" +
  "body { background:#000; color:#fff; font-family:'Courier New',Courier,monospace; padding:20px 16px; max-width:600px; margin:0 auto; font-size:14px; line-height:1.4; -webkit-text-size-adjust:100%; }" +
  ".dim { color:#888; }" +
  ".spacer { height:16px; }" +
  ".label { color:#888; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin-bottom:6px; }" +
  ".line { margin-bottom:4px; }" +
  ".quote { line-height:1.55; margin-bottom:6px; }" +
  ".weather-grid { margin:6px 0; }" +
  ".weather-grid div { margin-bottom:2px; }" +
  ".moon { position:relative; display:inline-block; width:15px; height:15px; border-radius:50%; background:#000; border:1px solid #aaa; overflow:hidden; vertical-align:-2px; }" +
  ".mhalf { position:absolute; top:0; width:50%; height:100%; background:#fff; }" +
  ".mell { position:absolute; top:0; left:50%; transform:translateX(-50%); height:100%; border-radius:50%; }" +
  "#who { position:absolute; top:8px; right:10px; }" +
  "#who a { display:inline-block; color:#aaa; text-decoration:none; font-size:12px; letter-spacing:1px; border:1px solid #555; border-radius:13px; padding:5px 12px; }" +
  ".tap { display:inline-block; color:#aaa; border:1px solid #555; border-radius:11px; padding:4px 12px; }" +
  ".nav { margin-top:4px; }" +
  ".title { color:#888; }" +
  ".sec { padding:3px 0; }" +
  ".diag { white-space:pre; font-size:12px; line-height:1.3; color:#fff; overflow-x:auto; margin:2px 0; }";

  var BODY =
  '<div id="who"></div>' +
  '<div id="date" style="margin-bottom:12px"></div>' +
  '<div class="spacer"></div>' +
  '<div id="weather"><div class="dim">loading weather...</div></div>' +
  '<div class="spacer"></div>' +
  '<div id="ambient"></div>' +
  '<div id="events"></div>' +
  '<div id="learn"></div>' +
  '<div class="spacer"></div>' +
  '<div id="quote-block"><div class="quote" id="quote"></div><div class="dim" id="author"></div></div>' +
  '<div class="spacer"></div>' +
  '<div id="breath"></div>';

  var st = document.createElement("style"); st.textContent = STYLE; document.head.appendChild(st);
  document.body.innerHTML = BODY;

  document.getElementById("date").textContent =
    days[now.getDay()] + " " + now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();

  // Profile switcher (only with more than one profile): ⇄ to the next one.
  if (profiles.length > 1) {
    var ni = 0;
    for (pi = 0; pi < profiles.length; pi++) if (profiles[pi].key === whoKey) ni = (pi + 1) % profiles.length;
    var np = profiles[ni];
    document.getElementById("who").innerHTML =
      "<a href='?who=" + encodeURIComponent(np.key) + "'>⇄ " + esc(np.name || np.key) + "</a>";
  }

  // ---- loaders --------------------------------------------------------------
  function loadScript(url, cb) {
    var sc = document.createElement("script");
    sc.onload = function () { cb(); };
    sc.onerror = function () { cb(); };
    sc.src = url + (url.indexOf("?") > -1 ? "&" : "?") + "t=" + now.getTime();
    document.body.appendChild(sc);
  }
  function parseCSV(text) {
    var rows = [], row = [], field = "", i, ch, inQ = false;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (inQ) {
        if (ch === '"') { if (text.charAt(i + 1) === '"') { field += '"'; i++; } else inQ = false; }
        else field += ch;
      } else if (ch === '"') { inQ = true; }
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch !== "\r") { field += ch; }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.length && !(r.length === 1 && r[0] === ""); });
  }
  function fetchData(url, cb) {
    var x = new XMLHttpRequest();
    var full = url + (url.indexOf("?") > -1 ? "&" : "?") + "t=" + now.getTime();
    x.open("GET", full, true); x.timeout = 5000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status !== 200) { cb(null); return; }
      if (/\.csv(\?|$)/i.test(url)) { cb(parseCSV(x.responseText)); return; }
      try { cb(JSON.parse(x.responseText)); } catch (e) { cb(null); }
    };
    x.ontimeout = function () { cb(null); };
    x.onerror = function () { cb(null); };
    try { x.send(); } catch (e) { cb(null); }
  }
  // A "local:" source may only be a same-origin RELATIVE path (e.g. content/foo.js).
  // Reject absolute / protocol-relative / scheme / backslash / traversal, so it can't
  // resolve to a remote URL (e.g. local://evil/x.js -> //evil/x.js -> remote script).
  function localPath(spec) {
    var p = String(spec).slice(6);
    if (!/^[A-Za-z0-9]/.test(p) || /[:\\]/.test(p) || p.indexOf("//") > -1 || p.indexOf("..") > -1) return null;
    return p;
  }
  function resolveUrl(spec) {
    if (String(spec).indexOf("local:") === 0) { var p = localPath(spec); return p ? (BASE + p) : null; }
    return String(spec);
  }
  // For quotes / poems / decks: "default" | URL | "local:file.js" | null.
  function loadContent(spec, globalName, defaultFile, cb) {
    if (spec === null || spec === undefined || spec === false || spec === "") { cb(null); return; }
    if (spec === "default") {
      if (window[globalName]) { cb(window[globalName]); return; }
      loadScript(BASE + defaultFile, function () { cb(window[globalName] || null); });
      return;
    }
    var isLocal = String(spec).indexOf("local:") === 0;
    var url = resolveUrl(spec);
    if (url === null) { cb(null); return; }   // invalid local: path — reject
    // SECURITY: only a validated same-origin `local:` file may load as <script>.
    // Remote sources are ALWAYS treated as data (JSON/CSV), never executed.
    if (isLocal && /\.js(\?|$)/i.test(url)) { loadScript(url, function () { cb(window[globalName] || null); }); return; }
    fetchData(url, cb);
  }

  // ---- collapsible / accordion helpers --------------------------------------
  window.__toggle = function (key) {
    var b = document.getElementById(key); if (!b) return;
    var open = b.style.display === "none";
    b.style.display = open ? "block" : "none";
    var s = document.getElementById(key + "-i"); if (s) s.innerHTML = open ? "-" : "+";
  };
  window.__tgl = function (id) {
    var el = document.getElementById(id); if (!el) return;
    el.style.display = el.style.display === "none" ? "block" : "none";
  };
  function section(key, label, body) {   // key is internal; label is source-derived → escape
    return "<div class='label sec' onclick=\"__toggle('" + key + "')\">" +
           "<span class='dim' id='" + key + "-i'>+</span> " + esc(label) + "</div>" +
           "<div id='" + key + "' style='display:none'>" + body + "</div>";
  }
  function cardInner(card, r, recallId, recallLabel) {
    var h = "<div class='line title'>" + esc(card.t) + "</div>";
    var b = card.b || [];
    for (var li = 0; li < b.length; li++) h += "<div class='line'>" + esc(b[li]) + "</div>";
    h += "<div style='height:8px'></div>";
    if (r) {
      h += "<div class='line' onclick=\"__tgl('" + recallId + "')\">" +
           "<span class='dim'>Recall" + (recallLabel ? " · " + esc(recallLabel) : "") + " —</span> " +
           esc(r.q) + " <span class='dim'>[tap]</span></div>";
      h += "<div class='line' id='" + recallId + "' style='display:none'>" + esc(r.a) + "</div>";
    }
    return h;
  }

  // ---- decks: lesson | browse | accordion -----------------------------------
  function renderDecks(decks) {
    if (!decks || !decks.length) return;
    var pick = function (cs, n) { return cs[((n % cs.length) + cs.length) % cs.length]; };
    var html = "", browse = [], di;
    for (di = 0; di < decks.length; di++) {
      var deck = decks[di]; if (!deck) continue;
      var mode = deck.mode || "accordion";
      var key = "sec-d" + di;
      var cards = deck.cards || [];
      if (!cards.length) continue;
      if (mode === "lesson") {
        var c = pick(cards, dayN), r = pick(cards, dayN - 3);
        var heading = deck.pinned ? deck.name : ("Tonight's lesson · " + deck.name);
        html += section(key, heading, cardInner(c, r, "rec-d" + di, ""));
      } else if (mode === "browse") {
        html += section(key, deck.name, "<div id='body-d" + di + "'></div>");
        browse.push({ di: di, cards: cards });
      } else {
        var inner = "";
        for (var ci = 0; ci < cards.length; ci++) {
          var ec = cards[ci], eid = "acc-d" + di + "-" + ci;
          inner += "<div class='line title' onclick=\"__tgl('" + eid + "')\">" + esc(ec.t) + " <span class='dim'>[tap]</span></div>";
          inner += "<div id='" + eid + "' style='display:none'>";
          var eb = ec.b || [];
          for (var bi = 0; bi < eb.length; bi++) inner += "<div class='line'>" + esc(eb[bi]) + "</div>";
          inner += "</div><div class='spacer'></div>";
        }
        html += section(key, deck.name, inner);
      }
    }
    document.getElementById("learn").innerHTML = html;
    for (var b2 = 0; b2 < browse.length; b2++) setupBrowse(browse[b2].di, browse[b2].cards);
  }
  function setupBrowse(di, cards) {
    var len = cards.length;
    var tonight = ((dayN % len) + len) % len;
    var s = { i: tonight, len: len, tonight: tonight };
    s.render = function () {
      var i = s.i, c = cards[i], r = cards[((i - 3) % len + len) % len];
      var h = cardInner(c, r, "rec-b" + di, "");
      h += "<div class='line nav'>" +
           "<span class='tap' onclick='__brNav(" + di + ",-1)'>‹ prev</span>" +
           "<span class='dim' style='margin:0 8px'>" + (i + 1) + " / " + len + "</span>" +
           "<span class='tap' onclick='__brNav(" + di + ",1)'>next ›</span>" +
           (i === tonight ? "" : "<span class='tap' onclick='__brJump(" + di + ")' style='margin-left:8px'>tonight</span>") +
           "</div>";
      document.getElementById("body-d" + di).innerHTML = h;
    };
    window["__brst" + di] = s;
    s.render();
  }
  window.__brNav = function (di, d) { var s = window["__brst" + di]; if (!s) return; s.i = ((s.i + d) % s.len + s.len) % s.len; s.render(); };
  window.__brJump = function (di) { var s = window["__brst" + di]; if (!s) return; s.i = s.tonight; s.render(); };

  // ---- content: quotes, poems, decks ----------------------------------------
  loadContent(sourceFor("quotes"), "CONTENT_QUOTES", "content/quotes.js", function (list) {
    var box = document.getElementById("quote-block");
    if (!list || !list.length) { box.style.display = "none"; return; }
    var q = list[dayIndex(list.length)];
    if (!q || q[0] == null) { box.style.display = "none"; return; }   // wrong-shape guard
    document.getElementById("quote").textContent = "“" + q[0] + "”";  // textContent = safe
    document.getElementById("author").textContent = "— " + (q[1] || "");
  });
  loadContent(sourceFor("poems"), "CONTENT_POEMS", "content/poems.js", function (list) {
    if (!list || !list.length) return;
    var pm = list[dayIndex(list.length)];
    if (!pm || pm[1] == null) return;   // wrong-shape guard
    var html = "";
    if (pm[0]) { html += "<div class='line'>" + esc(pm[0]) + "</div><div style='height:8px'></div>"; }
    var lines = String(pm[1]).split("\n");
    for (var i = 0; i < lines.length; i++) html += "<div class='line dim'>" + esc(lines[i]) + "</div>";
    html += "<div class='dim' style='margin-top:4px'>— " + esc(pm[2] || "") + "</div>";
    document.getElementById("breath").innerHTML = html;
  });
  loadContent(sourceFor("decks"), "CONTENT_DECKS", "content/decks.js", function (decks) {
    renderDecks(decks);
  });

  // ---- optional live modules: ambient, events (off unless a source is set) --
  var ambientSrc = sourceFor("ambient"), ambientUrl = ambientSrc ? resolveUrl(ambientSrc) : null;
  if (ambientUrl) fetchData(ambientUrl, function (data) {
    var box = document.getElementById("ambient");
    var a = data ? (data.rooms ? (data.rooms[whoKey] || null) : data) : null;
    if (!a) { box.innerHTML = "<div class='label'>This room</div><div class='line dim'>—</div><div class='spacer'></div>"; return; }
    var html = "<div class='label'>This room" + (a.room ? " · " + esc(a.room) : "") + "</div>";
    var bits = [];
    if (a.temp != null) bits.push(esc(a.temp) + "°C");
    if (a.rh != null) bits.push(esc(a.rh) + "% RH");
    if (a.co2 != null) bits.push("CO2 " + esc(a.co2));
    if (a.voc != null) bits.push("VOC " + esc(a.voc));
    if (a.pm25 != null) bits.push("PM2.5 " + esc(a.pm25));
    html += "<div class='line'>" + bits.join("   ") + "</div>";
    if (a.humidifier) {
      var h = a.humidifier, state = h.water_low ? "Tank empty" : (h.on ? "On" : "Off");
      html += "<div class='line dim'>Humidifier " + state + "</div>";
    }
    box.innerHTML = html + "<div class='spacer'></div>";
  });

  var eventsSrc = sourceFor("events"), eventsUrl = eventsSrc ? resolveUrl(eventsSrc) : null;
  if (eventsUrl) fetchData(eventsUrl, function (ev) {
    var html = "<div class='label'>Tomorrow" + (ev && ev.date ? " · " + esc(ev.date) : "") + "</div>";
    if (ev && ev.events && ev.events.length) {
      for (var i = 0; i < ev.events.length; i++) {
        var e = ev.events[i];
        html += "<div class='line'><span class='dim'>" + esc(e.time) + "</span>  " + esc(e.title) + "</div>";
      }
    } else { html += "<div class='line dim'>Nothing scheduled</div>"; }
    document.getElementById("events").innerHTML = html + "<div class='spacer'></div>";
  });

  // ---- moon phase (pure date math) ------------------------------------------
  function moonInfo(date) {
    var ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
    var syn = 29.530588853;
    var age = ((date.getTime() / 86400000 - ref) % syn + syn) % syn;
    var f = (1 - Math.cos(2 * Math.PI * age / syn)) / 2;
    var waxing = age < syn / 2, name;
    if (f < 0.02) name = "new moon";
    else if (f > 0.98) name = "full moon";
    else if (Math.abs(f - 0.5) <= 0.03) name = waxing ? "first quarter" : "last quarter";
    else if (f < 0.5) name = waxing ? "waxing crescent" : "waning crescent";
    else name = waxing ? "waxing gibbous" : "waning gibbous";
    return { f: f, pct: Math.round(f * 100), waxing: waxing, name: name };
  }
  function moonDisc(m) {
    var D = 15, litSide = m.waxing ? "right:0" : "left:0";
    var ellW = (Math.abs(2 * m.f - 1) * D).toFixed(1);
    var ellColor = m.f > 0.5 ? "#fff" : "#000";
    return "<span class='moon'><span class='mhalf' style='" + litSide + "'></span>" +
           "<span class='mell' style='width:" + ellW + "px;background:" + ellColor + "'></span></span>";
  }

  // ---- weather (Open-Meteo, from config location) ---------------------------
  var wxUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + cfg.latitude + "&longitude=" + cfg.longitude +
    "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,surface_pressure" +
    "&hourly=temperature_2m,precipitation_probability,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant" +
    "&timezone=" + encodeURIComponent(cfg.timezone) + "&forecast_days=4";
  var xhr = new XMLHttpRequest();
  xhr.open("GET", wxUrl, true);
  xhr.timeout = 8000;
  var wxFail = function () { document.getElementById("weather").innerHTML = "<div class='line dim'>weather unavailable</div>"; };
  xhr.ontimeout = wxFail;
  xhr.onerror = wxFail;
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status !== 200) { wxFail(); return; }
    var d;
    try { d = JSON.parse(xhr.responseText); } catch (e) { wxFail(); return; }
    if (!d || !d.current || !d.daily || !d.hourly) { wxFail(); return; }
    var c = d.current, daily = d.daily, hourly = d.hourly;

    var wmoShort = function (code) {
      var m = {0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Freezing fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Light showers",81:"Showers",82:"Heavy showers",95:"Thunderstorm"};
      return m[code] || "---";
    };
    var dayName = function (iso) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(iso + "T12:00").getDay()]; };

    // "Tonight" = the upcoming night, computed in the forecast's timezone (c.time),
    // so it's correct even when the device clock differs from cfg.timezone. Collect
    // only night-band hours (20:00–08:59) from now until the next 09:00, so a
    // post-midnight view doesn't drag in today's daytime temps.
    var startH = (c.time || "").slice(0, 13);
    var lows = [], maxRain = 0, clearAt = null, startedNight = false;
    for (var i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i] < startH) continue;
      var hr = parseInt(hourly.time[i].slice(11, 13), 10);
      var night = (hr >= 20 || hr < 9);
      if (!night) { if (startedNight) break; else continue; }
      startedNight = true;
      lows.push(hourly.temperature_2m[i]);
      if (hourly.precipitation_probability[i] > maxRain) maxRain = hourly.precipitation_probability[i];
      if (clearAt === null && hourly.weather_code[i] <= 1) clearAt = hourly.time[i].slice(11, 16);
    }
    var tonightMin = lows.length ? Math.min.apply(null, lows) : daily.temperature_2m_min[0];
    var tonightMax = lows.length ? Math.max.apply(null, lows) : daily.temperature_2m_max[0];
    var tonightNote = maxRain >= 40 ? "rain " + maxRain + "%, easing" : (clearAt ? "clear by " + clearAt : wmoShort(c.weather_code));

    var m = moonInfo(now);
    var fline = function (label, mn, mx, desc) {
      var L = label; while (L.length < 9) L += " ";
      return "<div class='line' style='white-space:pre'>" + L + Math.round(mn) + "°-" + Math.round(mx) + "°   " + desc + "</div>";
    };
    var fday = function (i) {
      return fline(dayName(daily.time[i]), daily.temperature_2m_min[i], daily.temperature_2m_max[i],
                   wmoShort(daily.weather_code[i]) + " · rain " + daily.precipitation_probability_max[i] + "%");
    };

    var wh = "<div class='line'>" + esc(String(cfg.place).toUpperCase()) + "  " + Math.round(c.temperature_2m) + "°  " + wmoShort(c.weather_code) +
         "<span style='float:right'><span class='dim'>" + m.name + "</span> " + moonDisc(m) + "</span></div>";
    wh += "<div class='spacer' style='height:8px'></div>";
    wh += fline("Tonight", tonightMin, tonightMax, tonightNote);
    wh += fline("Tomorrow", daily.temperature_2m_min[1], daily.temperature_2m_max[1],
                wmoShort(daily.weather_code[1]) + " · rain " + daily.precipitation_probability_max[1] + "%");
    wh += fday(2);
    wh += fday(3);
    wh += "<div class='line dim'>Sunrise " + daily.sunrise[1].slice(11,16) + "    Sunset " + daily.sunset[1].slice(11,16) + "</div>";
    document.getElementById("weather").innerHTML = wh;
  };
  try { xhr.send(); } catch (e) { wxFail(); }
})();
