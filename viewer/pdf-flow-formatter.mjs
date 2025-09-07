// pdf-flow-formatter.mjs
// Block-level formatter for flow pages using font-size & centeredness.
// Adds .h1/.h2/.center/.indent/.blockquote and merges multi-line headings.
// Safe for stepping (no word/char wrapping).

(function(){
  function median(arr){ if(!arr.length) return 0; const s=arr.slice().sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; }
  function uppercaseRatio(str){ const L=[...str].filter(ch=>/\p{L}/u.test(ch)); if(!L.length) return 0; let u=0; for(const ch of L) if(ch===ch.toUpperCase()) u++; return u/L.length; }

  function formatFlowPage(section){
    const flow = section.querySelector(".flowLayer");
    if (!flow) return;
    let ps = Array.from(flow.querySelectorAll("p"));
    if (!ps.length) return;

    const baseLeft = Number(section.dataset.baseLeft || 0);
    const bodyFs   = Number(section.dataset.bodyFs || 14);

    const INDENT_THRESHOLD = 12;
    const BLOCKQUOTE_THRESHOLD = 24;
    const H1_MIN = bodyFs * 1.7;
    const H2_MIN = bodyFs * 1.35;

    // 1) classify blocks
    for (const p of ps) {
      const text = p.textContent || "";
      const len  = Number(p.dataset.len || text.length);
      const left0= Number(p.dataset.left0 || 0);
      const caps = Number(p.dataset.caps || uppercaseRatio(text));
      const fs   = Number(p.dataset.fs || bodyFs);
      const centered = p.dataset.center === "1";

      if (fs >= H1_MIN && len <= 80) {
        p.classList.add("h1");
        if (centered) p.classList.add("center");
        continue;
      }
      if (fs >= H2_MIN && len <= 120) {
        p.classList.add("h2");
        if (centered || caps >= 0.55) p.classList.add("center");
        continue;
      }
      if (left0 - baseLeft >= BLOCKQUOTE_THRESHOLD) { p.classList.add("blockquote"); continue; }
      if (left0 - baseLeft >= INDENT_THRESHOLD) { p.classList.add("indent"); }
    }

    // 2) merge consecutive centered big headings into one multi-line heading
    ps = Array.from(flow.querySelectorAll("p")); // refresh
    for (let i = 0; i < ps.length - 1; i++) {
      const a = ps[i], b = ps[i+1];
      const aBig = a.classList.contains("h1") || a.classList.contains("h2");
      const bBig = b.classList.contains("h1") || b.classList.contains("h2");
      if (aBig && bBig && a.classList.contains("center") && b.classList.contains("center")) {
        // merge text with a <br>
        const br = document.createElement("br");
        a.appendChild(br);
        a.appendChild(document.createTextNode(b.textContent || ""));
        // prefer the larger class as final
        if (b.classList.contains("h1")) { a.classList.add("h1"); a.classList.remove("h2"); }
        a.classList.add("center");
        // remove b
        b.remove();
        ps.splice(i+1,1);
        i--; // re-evaluate in case of 3+ lines
      }
    }
  }

  window.PDFFlowFormatter = { formatFlowPage };
})();
