// pdf-fascimile.mjs
// FLOW-first renderer for PDF.js (semantic <p> per page) + simple tables.
// Safe for sentence stepping (no word/char wrapping).
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
const median = arr => (arr && arr.length ? arr.slice().sort((a,b)=>a-b)[Math.floor(arr.length/2)] : 0);

function itemScale(tm){ // approx font size in CSS px
  const sx = Math.hypot(tm[0], tm[2]);
  const sy = Math.hypot(tm[1], tm[3]);
  return Math.max(sx, sy);
}

// Build lines with left/right, center, fs, and per-item positions
function groupItemsIntoLines(items, viewport, lineTol = 2) {
  const raw = items.map(it => {
    const tm = window.pdfjsLib.Util.transform(viewport.transform, it.transform);
    const x  = tm[4], y = tm[5];
    const fs = itemScale(tm);
    const w  = Number(it.width) || 0;               // in text space
    const rx = x + w * viewport.scale;              // right edge in CSS px
    return { x, y, rx, fs, str: it.str || "" };
  }).sort((a,b)=> (a.y - b.y) || (a.x - b.x));

  const lines = [];
  let cur = null;
  for (const r of raw) {
    if (!cur) { cur = { y:r.y, x:r.x, rx:r.rx, fs:[r.fs], items:[{x:r.x, str:r.str}] }; continue; }
    if (Math.abs(r.y - cur.y) <= lineTol) {
      cur.items.push({ x: r.x, str: r.str });
      cur.fs.push(r.fs);
      if (r.x  < cur.x)  cur.x  = r.x;
      if (r.rx > cur.rx) cur.rx = r.rx;
    } else {
      lines.push(cur);
      cur = { y:r.y, x:r.x, rx:r.rx, fs:[r.fs], items:[{x:r.x, str:r.str}] };
    }
  }
  if (cur) lines.push(cur);

  return {
    lines: lines.map(L => ({
      text: L.items.map(i => i.str).join(""),
      x: L.x,
      y: L.y,
      rx: L.rx,
      cx: (L.x + L.rx) / 2,
      fs: median(L.fs),
      items: L.items  // [{x, str}] in visual order
    }))
  };
}

// Paragraph grouping using vertical gap + first-line indent + "big centered line" breaks
function groupLinesIntoParagraphs(lineObjs, baseLeft, blockCx, blockWidth, bodyFs) {
  if (!lineObjs.length) return [];
  const ys = lineObjs.map(l => l.y);
  const gaps = [];
  for (let i = 1; i < ys.length; i++) gaps.push(Math.abs(ys[i] - ys[i-1]));
  const medGap = gaps.length ? median(gaps) : 14;
  const GAP_THRESHOLD = medGap * 1.45;
  const INDENT_THRESHOLD = 12;
  const H2_MIN = bodyFs * 1.35;
  const CENTER_TOL = 0.18;

  const pars = [];
  let cur = [lineObjs[0]];
  for (let i = 1; i < lineObjs.length; i++) {
    const prev = lineObjs[i-1], L = lineObjs[i];
    const gapBig = Math.abs(L.y - prev.y) > GAP_THRESHOLD;
    const firstLineIndent = (L.x - baseLeft >= INDENT_THRESHOLD) && (prev.x - baseLeft < INDENT_THRESHOLD * 0.5);

    const prevBigCentered = (prev.fs >= H2_MIN) && (Math.abs(prev.cx - blockCx) / (blockWidth || 1) <= CENTER_TOL);
    const curCentered     = (Math.abs(L.cx - blockCx) / (blockWidth || 1) <= CENTER_TOL);
    const forceBreakAfterBigCentered = prevBigCentered && !curCentered; // don’t glue a big centered line to body text

    if (gapBig || firstLineIndent || forceBreakAfterBigCentered) {
      pars.push(cur); cur = [L];
    } else {
      cur.push(L);
    }
  }
  if (cur.length) pars.push(cur);
  return pars;
}

// --- simple tables -----------------------------------------------------------
// Very conservative: detects blocks of ≥3 consecutive lines that all have the
// same number (≥3) of text items and their x positions align within tolerance.
function detectSimpleTables(lines) {
  const blocks = [];
  const TOL = 12;     // px tolerance for column alignment
  const MIN_ROWS = 3; // at least 3 rows
  const MIN_COLS = 3; // at least 3 columns

  let i = 0;
  while (i < lines.length) {
    const start = i;
    const baseItems = lines[i].items || [];
    const cols = baseItems.length;
    if (cols < MIN_COLS) { i++; continue; }

    let ok = true;
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      const it = lines[j].items || [];
      if (it.length !== cols) break;
      // check alignment
      for (let k = 0; k < cols; k++) {
        if (Math.abs((it[k]?.x || 0) - (baseItems[k]?.x || 0)) > TOL) { ok = false; break; }
      }
      if (!ok) break;
      end = j;
    }

    const rows = end - start + 1;
    if (ok && rows >= MIN_ROWS) {
      blocks.push({ start, end, cols });
      i = end + 1;
    } else {
      i++;
    }
  }
  return blocks;
}

function renderSimpleTable(flow, block, lines) {
  const table = document.createElement("table");
  table.className = "pdf-flow-table";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.appendChild(thead); table.appendChild(tbody);

  const cols = block.cols;
  // First row as header (best-effort)
  const first = lines[block.start];
  const trH = document.createElement("tr");
  for (let c = 0; c < cols; c++){
    const th = document.createElement("th");
    th.textContent = (first.items[c]?.str || "").trim();
    trH.appendChild(th);
  }
  thead.appendChild(trH);

  for (let r = block.start + 1; r <= block.end; r++) {
    const L = lines[r];
    const tr = document.createElement("tr");
    for (let c = 0; c < cols; c++){
      const td = document.createElement("td");
      td.textContent = (L.items[c]?.str || "").trim();
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  flow.appendChild(table);
}

// ---------------------------------------------------------------------------

async function renderFlowTextLayer(sec, pdfPage, viewport) {
  const textContent = await pdfPage.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: true,
  });

  const flow = document.createElement("div");
  flow.className = "flowLayer";
  sec.appendChild(flow);

  // Lines + metrics
  const { lines } = groupItemsIntoLines(textContent.items, viewport);

  // Text block box + body size
  const usable = lines.filter(l => (l.text || "").trim().length > 8);
  const lefts  = usable.map(l => l.x);
  const rights = usable.map(l => l.rx);
  const sizes  = usable.map(l => l.fs);
  const baseLeft   = lefts.length  ? median(lefts)  : 0;
  const baseRight  = rights.length ? median(rights) : Math.max(...rights, 0);
  const bodyFs     = sizes.length  ? median(sizes)  : 14;
  const blockWidth = Math.max(320, Math.min(Math.round(baseRight - baseLeft), Math.round(viewport.width - 72)));
  const blockCx    = baseLeft + blockWidth/2;

  sec.dataset.baseLeft = String(Math.round(baseLeft));
  sec.dataset.bodyFs   = String(Math.round(bodyFs));
  sec.dataset.blockCx  = String(Math.round(blockCx));
  flow.style.maxWidth  = blockWidth + "px";
  flow.style.margin    = "0 auto";

  // 1) carve out simple table blocks and render them as <table>
  const tableBlocks = detectSimpleTables(lines);
  const consumed = new Set();
  for (const b of tableBlocks) {
    for (let r = b.start; r <= b.end; r++) consumed.add(r);
    renderSimpleTable(flow, b, lines);
  }

  // 2) build paragraphs from remaining lines (gap + indent + heading breaks)
  const remain = lines.filter((_, idx) => !consumed.has(idx));
  const paragraphs = groupLinesIntoParagraphs(remain, baseLeft, blockCx, blockWidth, bodyFs);
  if (!paragraphs.length) return;

  for (const paraLines of paragraphs) {
    const txt = paraLines.map(l => l.text).join(" ").replace(/\s+/g, " ").trim();
    if (!txt) continue;

    const p = document.createElement("p");
    p.textContent = txt;

    // metadata (formatter uses these; harmless)
    const firstLeft = paraLines[0]?.x ?? baseLeft;
    p.dataset.left0 = String(Math.round(firstLeft));
    p.dataset.len   = String(txt.length);
    const letters = Array.from(txt).filter(ch => /\p{L}/u.test(ch));
    const uppers  = letters.filter(ch => ch === ch.toUpperCase());
    const ratio   = letters.length ? uppers.length / letters.length : 0;
    p.dataset.caps = ratio.toFixed(2);
    p.dataset.fs   = String(Math.round(median(paraLines.map(l => l.fs))));
    const avgCx    = median(paraLines.map(l => l.cx));
    p.dataset.center = String(Math.abs(avgCx - blockCx) / (blockWidth || 1) <= 0.18 ? 1 : 0);

    flow.appendChild(p);
  }
}

async function renderPageSection(pdfPage, opts = {}) {
  const { scale = 1 } = opts;
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("pdfjsLib is not available");

  const viewport = pdfPage.getViewport({ scale: CSS_PX_PER_PT * scale });
  const width = Math.max(1, Math.round(viewport.width));
  const height = Math.max(1, Math.round(viewport.height));
  dbg.log(`renderPageSection(p${pdfPage.pageNumber})`, { width, height });

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
    try { window.PDFFlowFormatter?.formatFlowPage?.(sec); } catch {}
    dbg.log(`page ${p} ok in ${Math.round(performance.now() - t0)}ms`);
  }
  return pages;
}

window.PDFExact = {
  CSS_PX_PER_PT,
  renderPageSection,
  buildPages,
  version: "0.4.0",
  get debug() { return dbg.on; },
  set debug(v) { dbg.on = !!v; },
};
try { window.dispatchEvent(new CustomEvent("PDFExact:ready")); } catch {}
dbg.log("module loaded.", { pdfjsLib: !!window.pdfjsLib });
