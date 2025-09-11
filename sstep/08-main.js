(() => {
  const S  = (window.SStep = window.SStep || {});
  const ST = S.state || (S.state = { current: 0, sentences: [] });

  // ── Click-to-jump (enabled only when effect is on)
  S.enableClickToJump = function(scope = (S.rootEl || document.body)) {
    if (ST.clickHandler) return;
    const handler = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed) return;
      if (e.target.closest("#sstep-toolbar, .sstep-toolbar, a[href], button, input, textarea, select, [contenteditable='true']")) return;
      const span = e.target.closest(".sstep-sentence");
      if (!span || !scope.contains(span)) return;
      const i = (ST.sentences || []).indexOf(span);
      if (i >= 0) { e.preventDefault(); S.focusIndex(i, { scroll: true }); }
    };
    scope.addEventListener("click", handler, true);
    ST.clickScope = scope; ST.clickHandler = handler;
    scope.classList.add("sstep-clickable");
  };
  S.disableClickToJump = function() {
    const scope = ST.clickScope;
    if (scope && ST.clickHandler) {
      scope.removeEventListener("click", ST.clickHandler, true);
      scope.classList.remove("sstep-clickable");
    }
    ST.clickScope = null; ST.clickHandler = null;
  };

  // ── Sentence splitting (uses your language module)
  S.splitIntoSentencesIndices = function(bigText, profile) {
    const text = bigText.replace(/[\r\n\t]/g, " ");
    const endsOkay = S.endsOkayFactory(profile);
    const locale = profile.locale;
    if ("Segmenter" in Intl) {
      const seg = new Intl.Segmenter(locale, { granularity: "sentence" });
      const pieces = Array.from(seg.segment(text)).map(x => ({ start: x.index, end: x.index + x.segment.length }));
      // merge per your endsOkay
      const merged = [];
      for (let i = 0; i < pieces.length; i++) {
        if (!merged.length) { merged.push({ ...pieces[i] }); continue; }
        const prev = merged[merged.length - 1], cur = pieces[i];
        const prevSlice = text.slice(prev.start, prev.end);
        const nextSlice = text.slice(cur.start, cur.end);
        if (endsOkay(prevSlice, nextSlice)) merged.push({ ...cur }); else prev.end = cur.end;
      }
      const out = [];
      for (let i = 0; i < merged.length; i++) {
        let { start, end } = merged[i];
        while (i + 1 < merged.length) {
          const slice = text.slice(start, end);
          const nextSlice = text.slice(merged[i + 1].start, merged[i + 1].end);
          if (endsOkay(slice, nextSlice)) break;
          i++; end = merged[i].end;
        }
        out.push({ start, end });
      }
      return out;
    }
    // fallback
    const out = []; let s = 0;
    for (let i = 1; i <= text.length; i++) {
      const slice = text.slice(s, i);
      const nextSlice = text.slice(i, Math.min(i + 80, text.length));
      if (endsOkay(slice, nextSlice)) { out.push({ start: s, end: i }); s = i; }
    }
    if (s < text.length) out.push({ start: s, end: text.length });
    return out;
  };

  // ── Build spans
  // ---- build spans ----
// ---- build spans ----
// ---- build spans ----
S.buildSpansIfNeeded = function buildSpansIfNeeded() {
  const existing = Array.from(document.querySelectorAll(".sstep-sentence"));
  if (existing.length) { ST.sentences = existing; return; }

  const root = S.pickMainRoot();
  if (document.compatMode !== "CSS1Compat") root.normalize();
  S.normalizeStructure(root);
  const startAt = S.findFirstContentP(root);

  // 1) collect blocks as usual
  let blocks = S.collectBlocks(root, startAt);

  // 2) Expand: if a block IS a list or CONTAINS lists → use direct <li> children
  const expanded = [];
  for (const b of blocks) {
    if (!b || !b.querySelector) { expanded.push(b); continue; }

    const isList = /^(UL|OL)$/i.test(b.tagName || "");
    const lists = isList ? [b] : Array.from(b.querySelectorAll("ul, ol"));

    if (lists.length) {
      for (const lst of lists) {
        expanded.push(...Array.from(lst.children).filter(el => el.tagName && el.tagName.toUpperCase() === "LI"));
      }
      // do NOT also push the original block when it has/contains lists
    } else {
      expanded.push(b);
    }
  }

  // 3) DEDUPE first (Set-like), then keep only top-level items
  const uniq = [];
  for (const el of expanded) if (el && !uniq.includes(el)) uniq.push(el);

  blocks = uniq.filter((el) => !uniq.some(other => other !== el && other.contains(el)));

  const allSpans = [];
  const profile = S.currentProfile();

  for (const block of blocks) {
    const nodes = S.collectTextNodesIn(block);
    if (!nodes.length) continue;

    const map = S.buildIndexMap(nodes);
    const bigText = nodes.map(n => n.nodeValue).join("");
    const ranges = S.splitIntoSentencesIndices(bigText, profile);

    // endpoints within THIS block only
    const endpoints = ranges.map(r => {
      const start = Math.max(0, Math.min(r.start, bigText.length - 1));
      const end   = Math.max(start + 1, Math.min(r.end,   bigText.length));
      if (!bigText.slice(start, end).trim()) return null; // skip whitespace-only
      const s = S.findPos(start, map);
      const e = S.findPos(end - 1, map);
      return (s && e) ? { s, e } : null;
    }).filter(Boolean);

    const blockSpans = [];
    for (let i = endpoints.length - 1; i >= 0; i--) {
      const { s, e } = endpoints[i];
      const range = document.createRange();
      try {
        range.setStart(s.node, s.offset);
        range.setEnd(e.node, e.offset + 1);

        // Guard: don't cross structural boundaries (e.g., li → li)
        const startHost = s.node.parentElement?.closest("li, p, blockquote, div, section, article");
        const endHost   = e.node.parentElement?.closest("li, p, blockquote, div, section, article");
        if (startHost && endHost && startHost !== endHost) continue;

        // Skip empty after cloning (belts & suspenders)
        const txt = (range.cloneContents().textContent || "").trim();
        if (!txt) continue;

        const span = document.createElement("span");
        span.className = "sstep-sentence";
        try { range.surroundContents(span); }
        catch {
          const extracted = range.extractContents();
          if (!extracted.textContent || !extracted.textContent.trim()) continue;
          span.appendChild(extracted);
          range.insertNode(span);
        }
        blockSpans.unshift(span);
      } catch {}
    }
    allSpans.push(...blockSpans);
  }

  ST.sentences = allSpans;
};



  // ── Apply / remove (called by background toggle)
  S.applyEffect = function() {
    if (ST.enabled) return;
    S.buildSpansIfNeeded();
    if (!ST.sentences.length) return;
    ST.enabled = true;

    S.attachKeys();
    S.enableClickToJump(S.rootEl || document.body);
    S.focusIndex(ST.current, { scroll: true });
  };

  S.removeEffect = function(keepPlace = true) {
    ST.sentences.forEach(s => {
      s.classList.remove("sstep-current", "sstep-muted");
      if (s.style && (s.style.color === "transparent" || s.style.webkitTextFillColor === "transparent")) {
        s.style.color = ""; s.style.webkitTextFillColor = "";
      }
    });
    ST.enabled = false;
    S.disableClickToJump();
    S.detachKeys();
    S.clearOverlay && S.clearOverlay();
    if (ST.lastTextPaintIndex !== -1) {
      S.restoreSpanColor && S.restoreSpanColor(ST.sentences[ST.lastTextPaintIndex]);
      ST.lastTextPaintIndex = -1;
    }
    if (!keepPlace) ST.current = 0;
  };

  S.unwrapAllSpans = function() {
    document.querySelectorAll(".sstep-sentence").forEach(span => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
    ST.sentences = [];
  };

  // ── Navigation
  S.focusIndex = function(i, opts = {}) {
    if (!ST.sentences.length) return;
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    ST.current = clamp(i, 0, ST.sentences.length - 1);

    ST.sentences.forEach(s => s.classList.remove("sstep-current", "sstep-muted"));
    if (!ST.enabled) return;

    const cur = ST.sentences[ST.current];
    cur.classList.add("sstep-current");
    ST.sentences.forEach((s, idx) => { if (idx !== ST.current) s.classList.add("sstep-muted"); });
    if (opts.scroll !== false) cur.scrollIntoView({ block: "center", behavior: "smooth" });
    S.scheduleOverlayUpdate && S.scheduleOverlayUpdate();
  };
  S.next = () => S.focusIndex((ST.current || 0) + 1);
  S.prev = () => S.focusIndex((ST.current || 0) - 1);

  function keyHandler(e) {
    if (!ST.enabled) return;
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); S.next(); }
    if (e.altKey && e.key === "ArrowLeft")  { e.preventDefault(); S.prev(); }
  }
  S.attachKeys = function() {
    window.removeEventListener("keydown", keyHandler, true);
    window.addEventListener("keydown", keyHandler, true);
  };
  S.detachKeys = function() {
    window.removeEventListener("keydown", keyHandler, true);
  };

  // ── Events & boot
  const schedule = () => S.scheduleOverlayUpdate && S.scheduleOverlayUpdate();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  S.addToolbar && S.addToolbar();
})();
