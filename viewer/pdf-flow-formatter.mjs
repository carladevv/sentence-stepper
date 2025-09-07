// pdf-flow-formatter.mjs
// Block-level formatter for flow pages. Adds classes like .indent, .h1, .h2, .blockquote.
// No word/char wrapping; no inner text changes.

(function(){
  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a,b)=>a-b);
    return s[Math.floor(s.length/2)];
  }

  function uppercaseRatio(str) {
    const letters = Array.from(str).filter(ch => /\p{L}/u.test(ch));
    if (!letters.length) return 0;
    let upp = 0;
    for (const ch of letters) if (ch === ch.toUpperCase()) upp++;
    return upp / letters.length;
  }

  function formatFlowPage(section) {
    const flow = section.querySelector(".flowLayer");
    if (!flow) return;

    const ps = Array.from(flow.querySelectorAll("p"));
    if (!ps.length) return;

    // Base left margin from <p> metadata or page dataset
    let baseLeft = Number(section.dataset.baseLeft || 0);
    if (!baseLeft) {
      const lefts = ps.map(p => Number(p.dataset.left0 || 0)).filter(n => Number.isFinite(n));
      baseLeft = median(lefts);
    }

    const INDENT_THRESHOLD = 12;      // px beyond baseLeft to consider first-line indent
    const BLOCKQUOTE_THRESHOLD = 24;  // px for deep indent / quote-like
    let foundH1 = false;

    for (const p of ps) {
      const text = p.textContent || "";
      const left0 = Number(p.dataset.left0 || 0);
      const len = Number(p.dataset.len || text.length);
      const capsHint = Number(p.dataset.caps || uppercaseRatio(text));

      const endsLikeSentence = /[.!?:;]\s*$/.test(text);
      const shortEnough = len > 3 && len <= 80;
      const highCaps = capsHint >= 0.65;

      if (!endsLikeSentence && shortEnough && highCaps) {
        if (!foundH1) { p.classList.add("h1"); foundH1 = true; continue; }
        else { p.classList.add("h2"); continue; }
      }

      if (left0 - baseLeft >= BLOCKQUOTE_THRESHOLD) { p.classList.add("blockquote"); continue; }
      if (left0 - baseLeft >= INDENT_THRESHOLD) { p.classList.add("indent"); }
    }
  }

  // Expose to window
  window.PDFFlowFormatter = { formatFlowPage };
})();
