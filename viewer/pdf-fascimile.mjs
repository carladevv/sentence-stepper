// pdf-fascimile.mjs
// Exact (canvas) + positioned text layer for PDF.js.
// Safe for stepping when paired with sstep-exact-bridge.js.
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

// ---------- positioned text ----------
async function renderPositionedTextLayer(sec, pdfPage, viewport, { textOpacity = 1 } = {}) {
  const textLayer = document.createElement("div");
  textLayer.className = "textLayer";
  textLayer.style.opacity = String(textOpacity);
  sec.appendChild(textLayer);

  const textContent = await pdfPage.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: true,
  });

  let cnt = 0;
  for (const item of textContent.items) {
    const tm = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
    const span = document.createElement("span");
    span.className = "t";
    span.textContent = item.str || "";
    span.style.position = "absolute";
    span.style.whiteSpace = "pre";
    span.style.lineHeight = "1";
    span.style.transformOrigin = "0 0";
    span.style.transform = `matrix(${round(tm[0])},${round(tm[1])},${round(tm[2])},${round(tm[3])},${round(tm[4],2)},${round(tm[5],2)})`;
    span.style.fontSize = "1px";
    const st = textContent.styles?.[item.fontName];
    if (st?.fontFamily) span.style.fontFamily = st.fontFamily;
    textLayer.appendChild(span);
    if (++cnt <= 2) dbg.log(`pos text[${cnt}]`, { preview: item.str?.slice(0, 60) });
  }
}

// ---------- page render ----------
async function renderPageSection(pdfPage, opts = {}) {
  const {
    scale = 1,
    renderGfx = true,
    textMode = "positioned",   // 'positioned' for exact mode
    textOpacity = 1,
    addAnnoLayer = false,
  } = opts;

  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("pdfjsLib is not available");

  const viewport = pdfPage.getViewport({ scale: CSS_PX_PER_PT * scale });
  const width = Math.max(1, Math.round(viewport.width));
  const height = Math.max(1, Math.round(viewport.height));
  dbg.log(`renderPageSection(p${pdfPage.pageNumber})`, { width, height, textMode, renderGfx });

  const sec = document.createElement("section");
  sec.className = "page facsimile";
  sec.style.width = width + "px";
  sec.style.height = height + "px";
  sec.dataset.page = String(pdfPage.pageNumber);

  // graphics underlay
  if (renderGfx) {
    const gfx = document.createElement("div");
    gfx.className = "gfxLayer";
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    gfx.appendChild(canvas);
    sec.appendChild(gfx);
    const ctx = canvas.getContext("2d", { alpha: false });
    const t0 = performance.now();
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    dbg.log(`p${pdfPage.pageNumber}: gfx in ${Math.round(performance.now() - t0)}ms`);
  }

  // text layer
  if (textMode === "positioned") {
    await renderPositionedTextLayer(sec, pdfPage, viewport, { textOpacity });
  }

  // (optional) annotations layer
  if (addAnnoLayer) {
    const annLayer = document.createElement("div");
    annLayer.className = "annLayer";
    sec.appendChild(annLayer);
    try {
      const annots = await pdfPage.getAnnotations();
      for (const a of annots) {
        if (a.subtype !== "Link" || !a.rect) continue;
        const r = pdfjsLib.Util.normalizeRect(a.rect);
        const p1 = viewport.convertToViewportPoint(r[0], r[1]);
        const p2 = viewport.convertToViewportPoint(r[2], r[3]);
        const left = Math.min(p1[0], p2[0]);
        const top  = Math.min(p1[1], p2[1]);
        const w = Math.abs(p1[0] - p2[0]);
        const h = Math.abs(p1[1] - p2[1]);
        const link = document.createElement("a");
        link.className = "ann";
        Object.assign(link.style, { position:"absolute", left:left+"px", top:top+"px", width:w+"px", height:h+"px", display:"block" });
        if (a.url) link.href = a.url; else if (a.dest) link.href = "#";
        annLayer.appendChild(link);
      }
    } catch {}
  }

  return sec;
}

// ---------- document ----------
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
    dbg.log(`page ${p} ok in ${Math.round(performance.now() - t0)}ms`);
  }
  return pages;
}

// expose
window.PDFExact = {
  CSS_PX_PER_PT,
  renderPageSection,
  buildPages,
  version: "1.0.0",
  get debug() { return dbg.on; },
  set debug(v) { dbg.on = !!v; },
};
try { window.dispatchEvent(new CustomEvent("PDFExact:ready")); } catch {}
dbg.log("module loaded.", { pdfjsLib: !!window.pdfjsLib });
