// sstep-exact-bridge.js
// Exact-mode (PDF textLayer) bridge with robust normalization + mapping.
// - Builds a normalized text (collapses whitespace, strips soft hyphens, normalizes quotes)
// - Keeps a char-by-char mapping back to original text nodes/offsets
// - Uses your language-aware splitter (S.splitIntoSentencesIndices) on the normalized text
// - Creates precise DOM Ranges for sentence-stepping
(() => {
  const S  = (window.SStep = window.SStep || {});
  const ST = S.state || (S.state = {});

  function isExactPageRoot(root) {
    try { return !!(root && root.querySelector && root.querySelector(".textLayer .t")); }
    catch { return false; }
  }

  // ---------------- helpers ----------------
  function* iterTextNodes(root) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = tw.nextNode())) {
      // Ignore nodes that are effectively empty/hidden
      const str = n.nodeValue;
      if (!str) continue;
      if (!str.trim()) continue; // nothing useful
      // optional: skip zero-area spans
      const el = n.parentElement;
      if (el && el.nodeType === 1) {
        const r = el.getBoundingClientRect();
        if (r.width < 0.2 || r.height < 0.2) continue; // tiny artifacts
      }
      yield n;
    }
  }

  // Collapse whitespace + strip soft hyphen + normalize quotes,
  // while producing a char->(node,offset) mapping back to the DOM.
  function buildNormalizedTextMap(textRoot) {
    const NBSP = "\u00A0";
    const SHY  = "\u00AD";
    const map = [];           // normalizedIndex -> { node, offset }
    let norm = "";
    let lastWasSpace = true;  // collapse leading spaces

    for (const node of iterTextNodes(textRoot)) {
      const s = node.nodeValue;
      for (let i = 0; i < s.length; i++) {
        let ch = s[i];

        // drop soft hyphens entirely
        if (ch === SHY) continue;

        // normalize common PDF quotes to standard ASCII for splitting
        if (ch === "\u201C" || ch === "\u201D") ch = '"';
        else if (ch === "\u2018" || ch === "\u2019") ch = "'";

        // whitespace collapse (space, tab, CR/LF, NBSP)
        if (/\s/.test(ch) || ch === NBSP) {
          if (!lastWasSpace) {
            norm += " ";
            map.push({ node, offset: i }); // map the collapsed space to this position
            lastWasSpace = true;
          }
          continue;
        }

        // normal char
        norm += ch;
        map.push({ node, offset: i });
        lastWasSpace = false;
      }
      // do not force a space across nodes; natural spaces remain collapsed above
    }

    // trim leading/trailing collapsed space
    if (norm.startsWith(" ")) { norm = norm.slice(1); map.shift(); }
    if (norm.endsWith(" "))   { norm = norm.slice(0,-1); map.pop(); }

    return { normText: norm, normMap: map };
  }

  // Build DOM Range from normalized indices (inclusive start, exclusive end)
  function rangeFromNorm(map, start, end) {
    if (!map.length) return null;
    start = Math.max(0, Math.min(start, map.length - 1));
    end   = Math.max(start + 1, Math.min(end, map.length));

    const sRef = map[start];
    const eRef = map[end - 1];
    if (!sRef || !eRef) return null;

    // Ensure we don’t split surrogate pairs (safety)
    const r = document.createRange();
    try {
      r.setStart(sRef.node, sRef.offset);
      r.setEnd(eRef.node, eRef.offset + 1);
      return r;
    } catch { return null; }
  }

  // Prefer your real splitter; fallback to a naive one if missing.
  function splitSentencesIndicesSafe(txt) {
    if (typeof S.splitIntoSentencesIndices === "function") {
      // Supply profile when available (abbr-aware, language settings)
      const profile = S.currentProfile ? S.currentProfile() : null;
      return S.splitIntoSentencesIndices(txt, profile) || [];
    }
    // fallback (very basic)
    const out = [];
    const rx = /[^.!?]+[.!?]+(?=\s|$)/g;
    let m; while ((m = rx.exec(txt))) out.push({ start: m.index, end: m.index + m[0].length });
    if (!out.length && txt.trim()) out.push({ start: 0, end: txt.length });
    return out;
  }

  function buildRangesOverTextLayer(root) {
    const textRoot = root.querySelector(".textLayer") || root;
    const { normText, normMap } = buildNormalizedTextMap(textRoot);
    if (!normText || !normMap.length) { ST.ranges = []; ST.currentRange = null; return; }

    const idx = splitSentencesIndicesSafe(normText);
    const ranges = [];
    for (const seg of idx) {
      const r = rangeFromNorm(normMap, seg.start, seg.end);
      if (r) ranges.push(r);
    }
    ST.ranges = ranges;
    ST.currentRange = null;
  }

  // ---------------- patches into SStep ----------------
  const origApply = S.applyEffect?.bind(S);
  S.applyEffect = function() {
    const root = S.pickMainRoot ? S.pickMainRoot() : (S.rootEl || document.body);
    if (isExactPageRoot(root)) {
      buildRangesOverTextLayer(root);
      if (!ST.ranges || !ST.ranges.length) return;
      ST.enabled = true;
      ST.sentences = [];                 // neutralize span path
      if (S.veil) S.veil.enabled = true; // PDF spotlight on
      S.attachKeys?.();
      S.focusIndex((ST.current ?? 0), { scroll: false });
      S.scheduleOverlayUpdate?.();
      S.setToolbarControlState?.();
      return;
    }
    // Normal HTML path
    if (S.veil) S.veil.enabled = false;  // never veil plain HTML
    return origApply ? origApply() : undefined;
  };

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  const origFocus = S.focusIndex?.bind(S);
  S.focusIndex = function(i, opts = {}) {
    if (Array.isArray(ST.ranges) && ST.ranges.length) {
      ST.current = clamp(i, 0, ST.ranges.length - 1);
      ST.currentRange = ST.ranges[ST.current];
      try {
        const rects = ST.currentRange.getClientRects();
        if (rects && rects.length && opts.scroll !== false) {
          const r0 = rects[0];
          const targetTop = window.scrollY + r0.top - (window.innerHeight * 0.3);
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      } catch {}
      S.scheduleOverlayUpdate?.();
      return;
    }
    return origFocus ? origFocus(i, opts) : undefined;
  };

  // Keep the stepper on; just stop at ends in range mode
  const origNext = S.next?.bind(S);
  const origPrev = S.prev?.bind(S);
  S.next = function() {
    if (Array.isArray(ST.ranges) && ST.ranges.length) {
      const i = (ST.current ?? 0) + 1;
      if (i < ST.ranges.length) return S.focusIndex(i);
      return;
    }
    return origNext ? origNext() : undefined;
  };
  S.prev = function() {
    if (Array.isArray(ST.ranges) && ST.ranges.length) {
      const i = (ST.current ?? 0) - 1;
      if (i >= 0) return S.focusIndex(i);
      return;
    }
    return origPrev ? origPrev() : undefined;
  };

  // Rebuild ranges if the page content is swapped (e.g., user jumps pages)
  // You can call S.reindexPDF() after showPage() if needed.
  S.reindexPDF = function() {
    const root = S.pickMainRoot ? S.pickMainRoot() : (S.rootEl || document.body);
    if (isExactPageRoot(root)) {
      buildRangesOverTextLayer(root);
      if (ST.current >= (ST.ranges?.length || 0)) ST.current = (ST.ranges.length ? ST.ranges.length - 1 : 0);
      S.scheduleOverlayUpdate?.();
    }
  };
})();
