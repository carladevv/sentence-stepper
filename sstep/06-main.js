(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = S.state;

  // ---- sentence segmentation (uses language module) ----
  S.splitIntoSentencesIndices = function splitIntoSentencesIndices(bigText, profile) {
    const text = bigText.replace(/[\r\n\t]/g, " ");
    const endsOkay = S.endsOkayFactory(profile);
    const locale = profile.locale;

    if ("Segmenter" in Intl) {
      const seg = new Intl.Segmenter(locale, { granularity: "sentence" });
      const pieces = Array.from(seg.segment(text)).map(x => ({ start: x.index, end: x.index + x.segment.length }));

      const merged = [];
      for (let i = 0; i < pieces.length; i++) {
        if (!merged.length) { merged.push({ ...pieces[i] }); continue; }
        const prev = merged[merged.length - 1];
        const cur  = pieces[i];
        const prevSlice = text.slice(prev.start, prev.end);
        const nextSlice = text.slice(cur.start,  cur.end);
        if (endsOkay(prevSlice, nextSlice)) merged.push({ ...cur });
        else prev.end = cur.end;
      }

      const out = [];
      for (let i = 0; i < merged.length; i++) {
        let { start, end } = merged[i];
        while (i + 1 < merged.length) {
          const slice = text.slice(start, end);
          const nextSlice = text.slice(merged[i+1].start, merged[i+1].end);
          if (endsOkay(slice, nextSlice)) break;
          i++; end = merged[i].end;
        }
        out.push({ start, end });
      }
      return out;
    }

    // fallback
    const out = [];
    let s = 0;
    for (let i = 1; i <= text.length; i++) {
      const slice = text.slice(s, i);
      const nextSlice = text.slice(i, Math.min(i + 80, text.length));
      if (endsOkay(slice, nextSlice)) { out.push({ start: s, end: i }); s = i; }
    }
    if (s < text.length) out.push({ start: s, end: text.length });
    return out;
  };

  // ---- build spans ----
  S.buildSpansIfNeeded = function buildSpansIfNeeded() {
    const existing = Array.from(document.querySelectorAll(".sstep-sentence"));
    if (existing.length) { ST.sentences = existing; return; }

    const root = S.pickMainRoot();
    if (document.compatMode !== "CSS1Compat") root.normalize();
    S.normalizeStructure(root);
    const startAt = S.findFirstContentP(root);
    const blocks = S.collectBlocks(root, startAt);

    const allSpans = [];
    const profile = S.currentProfile();

    for (const block of blocks) {
      const nodes = S.collectTextNodesIn(block);
      if (!nodes.length) continue;

      const map = S.buildIndexMap(nodes);
      const bigText = nodes.map(n => n.nodeValue).join("");
      const ranges = S.splitIntoSentencesIndices(bigText, profile);

      const endpoints = ranges.map(r => {
        const start = Math.max(0, Math.min(r.start, bigText.length - 1));
        const end   = Math.max(start + 1, Math.min(r.end,   bigText.length));
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
          const span = document.createElement("span");
          span.className = "sstep-sentence";
          try { range.surroundContents(span); }
          catch { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
          blockSpans.unshift(span);
        } catch {}
      }
      allSpans.push(...blockSpans);
    }
    ST.sentences = allSpans;
  };

  // ---- apply/remove ----
  S.applyEffect = function applyEffect() {
    if (ST.enabled) return;
    S.buildSpansIfNeeded();
    if (!ST.sentences.length) return;
    ST.enabled = true;
    S.attachKeys();
    S.focusIndex(ST.current);
    if (ST.toggleBtn) ST.toggleBtn.textContent = "Off";
    S.setToolbarCompact(false);
    // persist ON
    try { localStorage.setItem("sstep-enabled", "true"); } catch {}
  };

  S.removeEffect = function removeEffect(keepPlace = true) {
    ST.sentences.forEach(s => {
      s.classList.remove("sstep-current", "sstep-muted");
      if (s.style && (s.style.color === "transparent" || s.style.webkitTextFillColor === "transparent")) {
        s.style.color = ""; s.style.webkitTextFillColor = "";
      }
    });
    ST.enabled = false;
    S.detachKeys();
    S.clearOverlay();
    if (ST.lastTextPaintIndex !== -1) { S.restoreSpanColor(ST.sentences[ST.lastTextPaintIndex]); ST.lastTextPaintIndex = -1; }
    if (!keepPlace) ST.current = 0;
    if (ST.toggleBtn) ST.toggleBtn.textContent = "On";
    S.setToolbarCompact(true);
    // persist OFF
    try { localStorage.setItem("sstep-enabled", "false"); } catch {}
  };

  S.unwrapAllSpans = function unwrapAllSpans() {
    document.querySelectorAll(".sstep-sentence").forEach(span => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
  };

  S.hardRebuildKeepingScroll = function hardRebuildKeepingScroll() {
    const y = window.scrollY;
    S.removeEffect(false);
    S.unwrapAllSpans();
    ST.sentences = [];
    ST.current = 0;
    S.applyEffect();
    window.scrollTo({ top: y });
  };

  // ---- navigation ----
  S.focusIndex = function focusIndex(i) {
    if (!ST.sentences.length) return;
    ST.current = Math.max(0, Math.min(i, ST.sentences.length - 1));
    ST.sentences.forEach(s => s.classList.remove("sstep-current", "sstep-muted"));
    if (!ST.enabled) return;
    const cur = ST.sentences[ST.current];
    cur.classList.add("sstep-current");
    ST.sentences.forEach((s, idx) => { if (idx !== ST.current) s.classList.add("sstep-muted"); });
    cur.scrollIntoView({ block: "center", behavior: "smooth" });
    S.scheduleOverlayUpdate();
  };
  S.next = () => S.focusIndex(ST.current + 1);
  S.prev = () => S.focusIndex(ST.current - 1);

  function keyHandler(e) {
    if (!ST.enabled) return;
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); S.next(); }
    if (e.altKey && e.key === "ArrowLeft")  { e.preventDefault(); S.prev(); }
  }
  S.attachKeys = function attachKeys() { window.removeEventListener("keydown", keyHandler, true); window.addEventListener("keydown", keyHandler, true); };
  S.detachKeys = function detachKeys() { window.removeEventListener("keydown", keyHandler, true); window.removeEventListener("keydown", keyHandler, true); };

  // ---- events & boot ----
  window.addEventListener("scroll", S.scheduleOverlayUpdate, { passive: true });
  window.addEventListener("resize", S.scheduleOverlayUpdate);

  // Build toolbar always…
  S.addToolbar();

  // …but start OFF by default; only enable if user previously turned it on.
  const enabled = (() => { try { return localStorage.getItem("sstep-enabled") === "true"; } catch { return false; } })();
  if (enabled) {
    S.applyEffect();
  } else {
    // keep UI compact and button label correct
    if (S.setToolbarCompact) S.setToolbarCompact(true);
    if (ST.toggleBtn) ST.toggleBtn.textContent = "On";
  }
})();
