// sstep-exact-bridge.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = S.state || (S.state = {});

  function isExactPageRoot(root) {
    try { return !!(root && root.querySelector && root.querySelector(".textLayer .t")); }
    catch { return false; }
  }

  // --- helpers (fall back to minimal versions if your utils exist elsewhere) ---
  const collectTextNodesIn = S.collectTextNodesIn || function(root){
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n; while ((n = w.nextNode())) if (n.nodeValue && n.nodeValue.trim()) out.push(n);
    return out;
  };
  const buildIndexMap = S.buildIndexMap || function(nodes){
    const map = []; let idx = 0;
    for (const node of nodes) {
      const len = node.nodeValue.length;
      map.push({ node, start: idx, end: idx + len });
      idx += len;
    }
    return map;
  };
  const findPos = S.findPos || function(pos, map){
    for (const m of map) if (pos >= m.start && pos < m.end) return { node: m.node, offset: pos - m.start };
    return null;
  };
  const splitIntoSentencesIndices = S.splitIntoSentencesIndices || function(txt, profile){
    const rx = /[^.!?]+[.!?]+(\s+|$)/g;
    const out = []; let m;
    while ((m = rx.exec(txt))) out.push({ start: m.index, end: m.index + m[0].length });
    if (!out.length && txt.trim()) out.push({ start: 0, end: txt.length });
    return out;
  };

  function buildRangesOverTextLayer(root) {
    const textRoot = root.querySelector(".textLayer") || root;
    const profile = S.currentProfile ? S.currentProfile() : null;
    const nodes = collectTextNodesIn(textRoot);
    if (!nodes.length) { ST.ranges = []; ST.currentRange = null; return; }

    const map = buildIndexMap(nodes);
    const bigText = nodes.map(n => n.nodeValue).join("");
    const idxRanges = splitIntoSentencesIndices(bigText, profile);

    const domRanges = [];
    for (const r of idxRanges) {
      const start = Math.max(0, Math.min(r.start, bigText.length - 1));
      const end   = Math.max(start + 1, Math.min(r.end,   bigText.length));
      const s = findPos(start, map);
      const e = findPos(end - 1, map);
      if (!s || !e) continue;
      const range = document.createRange();
      try {
        range.setStart(s.node, s.offset);
        range.setEnd(e.node, e.offset + 1);
        domRanges.push(range);
      } catch {}
    }
    ST.ranges = domRanges;
    ST.currentRange = null;
  }

  // --- patch applyEffect: enable range mode on exact pages, else normal HTML ---
  const origApply = S.applyEffect?.bind(S);
  S.applyEffect = function() {
    const root = S.pickMainRoot ? S.pickMainRoot() : (S.rootEl || document.body);
    if (isExactPageRoot(root)) {
      buildRangesOverTextLayer(root);
      if (!ST.ranges || !ST.ranges.length) return;
      ST.enabled = true;
      ST.sentences = [];        // avoid legacy sentence checks
      S.veil && (S.veil.enabled = true);
      S.attachKeys?.();
      S.focusIndex( (ST.current ?? 0), { scroll: false } );
      S.scheduleOverlayUpdate?.();
      S.setToolbarControlState?.();
      return;
    }
    // normal HTML path
    S.veil && (S.veil.enabled = false);
    return origApply ? origApply() : undefined;
  };

  // --- patch focusIndex to drive ranges ---
  const origFocus = S.focusIndex?.bind(S);
  S.focusIndex = function(i, opts = {}) {
    if (Array.isArray(ST.ranges) && ST.ranges.length) {
      const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
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

  // --- patch Next/Prev so the stepper never "turns off" in range mode ---
  const origNext = S.next?.bind(S);
  const origPrev = S.prev?.bind(S);

  S.next = function() {
    if (Array.isArray(ST.ranges) && ST.ranges.length) {
      const i = (ST.current ?? 0) + 1;
      if (i < ST.ranges.length) return S.focusIndex(i);
      // at end: keep enabled; let your viewer handle page advance if desired
      return;
    }
    return origNext ? origNext() : undefined;
  };

  S.prev = function() {
    if (Array.isArray(ST.ranges) && ST.ranges.length) {
      const i = (ST.current ?? 0) - 1;
      if (i >= 0) return S.focusIndex(i);
      // at start: keep enabled; viewer can handle page back if needed
      return;
    }
    return origPrev ? origPrev() : undefined;
  };

  // Hide veil when effect is removed
  const origRemove = S.removeEffect?.bind(S);
  S.removeEffect = function(...a){
    S.veil && S.veil.enabled && S.scheduleOverlayUpdate?.(); // will hide via guard
    return origRemove ? origRemove(...a) : undefined;
  };
})();
