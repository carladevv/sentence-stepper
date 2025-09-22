// features/spans.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = (S.state = S.state || { sentences: [], current: 0 });

  const Spans = (S.Spans = S.Spans || {});
  const DEFAULT_MODE = "sentences"; // "sentences" | "paragraphs"
  let modeKey = DEFAULT_MODE;

  // Public API
  Spans.getMode = () => modeKey;
  Spans.setMode = (key) => {
    modeKey = (key === "paragraphs" || key === "sentences") ? key : DEFAULT_MODE;
  };

  // ===== sentence splitting =====
  function splitIntoSentencesIndices(bigText, profile) {
    const text = bigText.replace(/[\r\n\t]/g, " ");
    const endsOkay = S.endsOkayFactory(profile);
    const locale = profile.locale;

    if ("Segmenter" in Intl) {
      const seg = new Intl.Segmenter(locale, { granularity: "sentence" });
      const pieces = Array.from(seg.segment(text)).map(x => ({ start: x.index, end: x.index + x.segment.length }));

      // Merge if our checker says "not a true end"
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

    // Fallback linear scan
    const out = []; let s = 0;
    for (let i = 1; i <= text.length; i++) {
      const slice = text.slice(s, i);
      const nextSlice = text.slice(i, Math.min(i + 80, text.length));
      if (S.endsOkayFactory(profile)(slice, nextSlice)) { out.push({ start: s, end: i }); s = i; }
    }
    if (s < text.length) out.push({ start: s, end: text.length });
    return out;
  }
  Spans.splitIntoSentencesIndices = splitIntoSentencesIndices; // back-compat
  S.splitIntoSentencesIndices = splitIntoSentencesIndices;     // back-compat

  // ===== build spans (mode-aware) =====
  Spans.buildIfNeeded = function buildIfNeeded() {
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
      } else {
        expanded.push(b);
      }
    }

    // 3) DEDUPE and keep only top-level blocks
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

      let ranges;
      if (modeKey === "paragraphs") {
        ranges = bigText.trim() ? [{ start: 0, end: bigText.length }] : [];
      } else {
        ranges = splitIntoSentencesIndices(bigText, profile);
      }

      const endpoints = ranges.map(r => {
        const start = Math.max(0, Math.min(r.start, bigText.length - 1));
        const end = Math.max(start + 1, Math.min(r.end, bigText.length));
        if (!bigText.slice(start, end).trim()) return null;
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

          const startHost = s.node.parentElement?.closest("li, p, blockquote, div, section, article");
          const endHost = e.node.parentElement?.closest("li, p, blockquote, div, section, article");
          if (startHost && endHost && startHost !== endHost) continue;

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

  Spans.unwrapAll = function unwrapAll() {
    document.querySelectorAll(".sstep-sentence").forEach(span => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
    ST.sentences = [];
  };

  function focusClosestTo(yDoc) {
    const spans = ST.sentences || [];
    if (!spans.length) return;
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < spans.length; i++) {
      const r = spans[i].getBoundingClientRect();
      const top = window.scrollY + r.top, bottom = top + r.height;
      if (yDoc >= top && yDoc <= bottom) { bestIdx = i; break; }
      const dist = Math.min(Math.abs(yDoc - top), Math.abs(yDoc - bottom));
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    S.focusIndex && S.focusIndex(bestIdx, { scroll: false });
  }

  S.hardRebuildKeepingScroll = function hardRebuildKeepingScroll() {
    const anchorY = window.scrollY + window.innerHeight / 2; // viewport center
    Spans.unwrapAll();
    Spans.buildIfNeeded();
    focusClosestTo(anchorY);
    S.scheduleOverlayUpdate && S.scheduleOverlayUpdate();
  };

  // Listen for mode changes (from the panel)
  document.addEventListener("sstep:modeChanged", (ev) => {
    const m = ev?.detail?.mode || DEFAULT_MODE;
    Spans.setMode(m);
    if (S.state?.enabled) {
      S.hardRebuildKeepingScroll && S.hardRebuildKeepingScroll();
    }
  });

  // Self-bootstrap mode from storage so persistence works regardless of load order.
  (async () => {
    try {
      if (S.Settings?.get) {
        const raw = await S.Settings.get("mode");
        Spans.setMode(raw === "paragraphs" ? "paragraphs" : "sentences");
      }
    } catch { /* default already set */ }
  })();

  // Back-compat aliases
  S.buildSpansIfNeeded = Spans.buildIfNeeded;
  S.unwrapAllSpans = Spans.unwrapAll;
})();
