// features/bookmark.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = (S.state = S.state || {});
  const Bookmark = (S.Bookmark = S.Bookmark || {});

  // Internal state
  let enabled = true;

  // Page key: origin + path + query (ignore hash)
  function pageKey() {
    const { origin, pathname, search } = window.location;
    return origin + pathname + (search || "");
  }

  // Canonicalize span text to compare across rebuilds
  function canon(txt) {
    return (txt || "").replace(/\s+/g, " ").trim();
  }

  // Read & write bookmark map in storage
  async function readMap() {
    try {
      const map = await S.Settings?.get("bookmarks");
      return map && typeof map === "object" ? map : {};
    } catch { return {}; }
  }
  async function writeMap(map) {
    try { await S.Settings?.set({ bookmarks: map }); } catch {}
  }

  // Public API
  Bookmark.applyEnabled = function applyEnabled(flag) {
    enabled = !!flag;
  };

  // Try to restore the last focused span for this page.
  // Sets ST.current if a match is found. Returns true if restored.
  Bookmark.maybeRestore = async function maybeRestore() {
    if (!enabled) return false;
    if (!Array.isArray(ST.sentences) || ST.sentences.length === 0) return false;

    const map = await readMap();
    const entry = map[pageKey()];
    if (!entry || !entry.text) return false;

    const target = entry.text;
    let found = -1;

    for (let i = 0; i < ST.sentences.length; i++) {
      const t = canon(ST.sentences[i].textContent);
      if (t && t === target) { found = i; break; }
    }
    if (found >= 0) {
      ST.current = found; // main's focusIndex will honor this
      return true;
    }
    // text mismatch → don't restore, start over
    return false;
  };

  // Persist bookmark when focus changes
  async function persistFromDetail(detail) {
    if (!enabled) return;
    if (!detail || !detail.text) return;
    const map = await readMap();
    map[pageKey()] = { text: detail.text, ts: Date.now() };
    // Optional: trim if too many entries
    const keys = Object.keys(map);
    if (keys.length > 500) {
      // drop oldest 50
      keys.sort((a, b) => (map[a].ts || 0) - (map[b].ts || 0));
      for (let i = 0; i < 50; i++) delete map[keys[i]];
    }
    await writeMap(map);
  }

  // Listen for focus changes dispatched by main
  document.addEventListener("sstep:focusChanged", (ev) => {
    persistFromDetail(ev.detail);
  });

  // Self-bootstrap enabled flag (defaults true)
  (async () => {
    try {
      const on = await S.Settings?.get("bookmarkEnabled");
      Bookmark.applyEnabled(on !== false); // default true
    } catch {
      Bookmark.applyEnabled(true);
    }
  })();
})();
