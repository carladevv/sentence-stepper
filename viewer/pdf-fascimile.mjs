// pdf-facsimile.mjs
// FLOW-first renderer for PDF.js (semantic <p> paragraphs per page).
// Keeps DOM simple so your sentence-stepper works perfectly.
// Requires window.pdfjsLib (from pdfjs-setup.mjs).

const PDFEXACT_NS = "PDFExact";
const dbg = {
  on: true,
  log: (...a) => { if (dbg.on) console.log(`[${PDFEXACT_NS}]`, ...a); },
  warn: (...a) => { if (dbg.on) console.warn(`[${PDFEXACT_NS}]`, ...a); },
  error: (...a) => { console.error(`[${PDFEXACT_NS}]`, ...a); },
};
try { if ("PDFExactDebug" in window) dbg.on = !!window.PDFExactDebug; } catch {}

const CSS_PX_PER_PT = 96 / 72; // 1pt -> CSS px
const round = (n, d = 6) => Number.isFinite(n) ? Number(n).toFixed(d) : "0";

// ---------- FLOW MODE HELPERS (semantic paragraphs) ----------
function groupItemsIntoLines(items, viewport, lineTol = 2) {
  // Map PDF items into viewport coords and sort by y, then x
  const rows = items.map(it => {
    const tm = window.pdfjsLib.Util.transform(viewport.transform, it.transform);
    return { x: tm[4], y: tm[5], str: it.str || "" };
  }).sort((a, b) => (a.y - b.y) || (a.x - b.x));

  // Group into lines by near-equal y (within tolerance)
  const lines = [];
  let cur = null;
  for (const r of rows) {
    if (!cur) { cur = { y: r.y, x: r.x, items: [r] }; continue; }
    if (Math.abs(r.y - cur.y) <= lineTol) {
      cur.items.push(r);
      if (r.x < cur.x) cur.x = r.x; // keep leftmost x for the line
    } else {
      lines.push(cur);
      cur = { y: r.y, x: r.x, items: [r] };
    }
  }
  if (cur) lines.push(cur);

  // Build simple line objects {text, x, y}
  const out = lines.map(L => ({
    text: L.items.map(i => i.str).join(""),
    x: L.x,
    y: L.y
  }));

  return { lines: out };
}

function groupLinesIntoParagraphs(lineObjs) {
  if (!lineObjs.length) return [];
  // Estimate paragraph breaks by vertical gaps
  const gaps = [];
  for (let i = 1; i < lineObjs.length; i++) gaps.push(Math.abs(lineObjs[i].y - lineObjs[i - 1].y));
  const med = gaps.length ? gaps.slice().sort((a,b)=>a-b)[Math.floor(gaps.length/2)] : 14;
  const threshold = med * 1.6;

  const pars = [];
  let cur = [];
  for (let i = 0; i < lineObjs.length; i++) {
    if (i > 0 && Math.abs(lineObjs[i].y - lineObjs[i - 1].y) > threshold) {
      if (cur.length) { pars.push(cur); cur = []; }
    }
    cur.push(lineObjs[i]);
  }
  if (cur.length) pars.push(cur);
  return pars;
}

// ---------- RENDERERS ----------
async function renderFlowTextLayer(sec, pdfPage, viewport) {
  const textContent = await pdfPage.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: true,
  });

  const flow = document.createElement("div");
  flow.className = "flowLayer";
  sec.appendChild(flow);

  const { lines } = groupItemsIntoLines(textContent.items, viewport);

  // Base left margin hint (used by optional formatter; harmless if unused)
  const xs = lines.filter(l => (l.text || "").trim().length > 3).map(l => l.x).sort((a,b)=>a-b);
  const baseLeft = xs.length ? xs[Math.floor(xs.length / 2)] : 0;
  sec.dataset.baseLeft = String(Math.round(baseLeft));

  // Group into paragraphs (arrays of line objects)
  const paragraphs = groupLinesIntoParagraphs(lines);
  if (!paragraphs.length) return;

  for (const paraLines of paragraphs) {
    const txt = paraLines.map(l => l.text).join(" ").replace(/\s+/g, " ").trim();
    if (!txt) continue;

    const p = document.createElement("p");
    p.textContent = txt;

    // Harmless metadata for optional formatter
    const firstLeft = paraLines[0]?.x ?? baseLeft;
    p.dataset.left0 = String(Math.round(firstLeft));
    p.dataset.len = String(txt.length);
    const letters = Array.from(txt).filter(ch => /\p{L}/u.test(ch));
    const uppers  = letters.filter(ch => ch === ch.toUpperCase());
    const ratio   = letters.length ? uppers.length / letters.length : 0;
    p.dataset.caps = ratio.toFixed(2);

    flow.appendChild(p);
  }
}

async function renderPageSection(pdfPage, opts = {}) {
  const {
    scale = 1,
    // We ignore renderGfx/addAnnoLayer here to keep it lean & safe for stepping.
    textMode = "flow",          // only 'flow' used in our viewer
  } = opts;

  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("pdfjsLib is not available");

  const viewport = pdfPage.getViewport({ scale: CSS_PX_PER_PT * scale });
  const width = Math.max(1, Math.round(viewport.width));
  const height = Math.max(1, Math.round(viewport.height));
  dbg.log(`renderPageSection(p${pdfPage.pageNumber})`, { width, height, textMode });

  const sec = document.createElement("section");
  sec.className = "page facsimile";
  sec.style.width = width + "px";
  sec.style.height = height + "px";
  sec.dataset.page = String(pdfPage.pageNumber);

  await renderFlowTextLayer(sec, pdfPage, viewport);
  return sec;
}

async function buildPages(doc, { container } = {}, opts = {}) {
  if (!container) throw new Error("PDFExact.buildPages: container required");
  container.innerHTML = "";

  const pages = [];
  dbg.log(`Document: numPages=${doc.numPages}`);
  for (let p = 1; p <= doc.numPages; p++) {
    const t0 = performance.now();
    const page = await doc.getPage(p);
    const sec = await renderPageSection(page, opts);
    container.appendChild(sec);
    pages.push({ el: sec, headings: [], pageNum: p });
    // Optional formatter hook (safe no-op if not present)
    try { window.PDFFlowFormatter?.formatFlowPage?.(sec); } catch {}
    dbg.log(`page ${p} ok in ${Math.round(performance.now() - t0)}ms`);
  }
  return pages;
}

// Expose
window.PDFExact = {
  CSS_PX_PER_PT,
  renderPageSection,
  buildPages,
  version: "0.2.1",
  get debug() { return dbg.on; },
  set debug(v) { dbg.on = !!v; },
};
try { window.dispatchEvent(new CustomEvent("PDFExact:ready")); } catch {}
dbg.log("module loaded.", { pdfjsLib: !!window.pdfjsLib });
