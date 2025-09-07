// sstep-veil.js
// PDF-only refinements (exact/range mode):
//  - White veil limited to the current PDF page area (under toolbar)
//  - Clear yellow "box" highlight over the current sentence (matching your CSS)
// Does NOT affect normal HTML pages or your original overlay.

(() => {
  const S  = (window.SStep = window.SStep || {});
  const ST = S.state || (S.state = {});

  // Veil config (white/soft gray)
  S.veil = Object.assign({},
    S.veil || {},
    { enabled: true, color: "#fff", opacity: 0.85, pad: 3, radius: 6, zIndex: 1195 }
  );

  // Range box config (matches your 'box' theme)
  const RANGE_BOX = {
    padX: 2,                 // ~0.08em at normal sizes
    padY: 2,
    radius: 4,
    border: "2px solid #000",
    background: "rgba(255,255,0,.30)",
    zIndex: 1198
  };

  // ------------------------------------------------------------
  // helpers
  function isRangeMode(){ return Array.isArray(ST.ranges) && ST.ranges.length; }

  function currentPageRect() {
    // Try to find the .page.facsimile that contains the active range
    const r = ST.currentRange;
    let el = r ? (r.commonAncestorContainer?.nodeType === 1
                    ? r.commonAncestorContainer
                    : r.commonAncestorContainer?.parentElement) : null;
    while (el && !(el.classList?.contains("page") && el.classList?.contains("facsimile"))) {
      el = el.parentElement;
    }
    const rc = (el || document.querySelector(".page.facsimile.current") || document.body)
                .getBoundingClientRect();
    return rc;
  }

  function svgEl(n){ return document.createElementNS("http://www.w3.org/2000/svg", n); }

  // ------------------------------------------------------------
  // White veil (SVG, fixed, clipped to page rect)
  function ensureVeil() {
    if (ST.veilSvg) return ST.veilSvg;

    const svg = svgEl("svg");
    svg.id = "sstep-veil";
    Object.assign(svg.style, {
      position: "fixed",
      left: "0", top: "0",
      width: "0", height: "0",    // sized each frame to the page rect
      pointerEvents: "none",
      zIndex: String(S.veil.zIndex)
    });

    const defs = svgEl("defs");
    const mask = svgEl("mask");
    mask.id = "sstep-veil-mask";

    const base = svgEl("rect");     // white = veil covers area
    base.setAttribute("fill", "white");
    mask.appendChild(base);
    defs.appendChild(mask); svg.appendChild(defs);

    const dim = svgEl("rect");      // the white veil
    dim.setAttribute("fill", S.veil.color);
    dim.setAttribute("opacity", String(S.veil.opacity));
    dim.setAttribute("mask", "url(#sstep-veil-mask)");
    svg.appendChild(dim);

    document.body.appendChild(svg);
    ST.veilSvg = svg; ST.veilMask = mask; ST.veilBase = base; ST.veilDim = dim;
    return svg;
  }

  function hideVeil(){ if (ST.veilSvg) ST.veilSvg.style.display = "none"; }

  function updateVeil(rects) {
    if (!S.veil.enabled || !isRangeMode() || !rects?.length) { hideVeil(); return; }

    const page = currentPageRect();
    const svg = ensureVeil();
    svg.style.display = "block";
    // Position & size the SVG to the page box (fixed to viewport)
    Object.assign(svg.style, {
      left: page.left + "px",
      top:  page.top  + "px",
      width:  page.width  + "px",
      height: page.height + "px"
    });

    // Resize the mask + dim to the page box (local coordinates)
    ST.veilBase.setAttribute("x", "0");
    ST.veilBase.setAttribute("y", "0");
    ST.veilBase.setAttribute("width",  String(page.width));
    ST.veilBase.setAttribute("height", String(page.height));
    ST.veilDim.setAttribute("x", "0");
    ST.veilDim.setAttribute("y", "0");
    ST.veilDim.setAttribute("width",  String(page.width));
    ST.veilDim.setAttribute("height", String(page.height));
    ST.veilDim.setAttribute("fill",    S.veil.color);
    ST.veilDim.setAttribute("opacity", String(S.veil.opacity));

    // Clear old holes (keep base)
    while (ST.veilMask.childNodes.length > 1) ST.veilMask.removeChild(ST.veilMask.lastChild);

    const pad = S.veil.pad, rxy = S.veil.radius;
    for (const rc of rects) {
      // convert viewport rect -> page-local rect
      const x = Math.max(0, rc.left - page.left - pad);
      const y = Math.max(0, rc.top  - page.top  - pad);
      const w = Math.max(0, rc.width  + pad*2);
      const h = Math.max(0, rc.height + pad*2);

      const hole = svgEl("rect");
      hole.setAttribute("x", String(x));
      hole.setAttribute("y", String(y));
      hole.setAttribute("width",  String(w));
      hole.setAttribute("height", String(h));
      hole.setAttribute("rx", String(rxy));
      hole.setAttribute("ry", String(rxy));
      hole.setAttribute("fill", "black"); // black = cut hole
      ST.veilMask.appendChild(hole);
    }
  }

  // ------------------------------------------------------------
  // Yellow range boxes (fixed, clipped to page rect, above veil, below toolbar)
  function ensureRangeOverlay() {
    if (ST.rangeOverlay) return ST.rangeOverlay;
    const el = document.createElement("div");
    el.id = "sstep-range-overlay";
    Object.assign(el.style, {
      position: "fixed",
      left: "0", top: "0",
      width: "0", height: "0",
      pointerEvents: "none",
      zIndex: String(RANGE_BOX.zIndex)
    });
    document.body.appendChild(el);
    ST.rangeOverlay = el;
    return el;
  }

  function clearRangeOverlay(){ if (ST.rangeOverlay) ST.rangeOverlay.replaceChildren(); }

  function drawRangeBoxes(rects) {
    clearRangeOverlay();
    if (!rects?.length) return;

    const page = currentPageRect();
    const ov = ensureRangeOverlay();
    // Clip overlay to the page area by sizing/positioning it to the page box
    Object.assign(ov.style, {
      left: page.left + "px",
      top:  page.top  + "px",
      width:  page.width  + "px",
      height: page.height + "px"
    });

    for (const rc of rects) {
      const d = document.createElement("div");
      const left = (rc.left - page.left) - RANGE_BOX.padX;
      const top  = (rc.top  - page.top ) - RANGE_BOX.padY;
      const w = rc.width  + RANGE_BOX.padX * 2;
      const h = rc.height + RANGE_BOX.padY * 2;
      Object.assign(d.style, {
        position: "absolute",
        left:  left  + "px",
        top:   top   + "px",
        width: w + "px",
        height:h + "px",
        borderRadius: RANGE_BOX.radius + "px",
        border: RANGE_BOX.border,
        background: RANGE_BOX.background
      });
      ov.appendChild(d);
    }
  }

  // ------------------------------------------------------------
  // Hook into the existing overlay update (HTML highlight stays intact)
  const origUpdate = S.updateGradientOverlay?.bind(S);
  S.updateGradientOverlay = function() {
    // Let the original overlay run first (HTML modes, themes, etc.)
    origUpdate && origUpdate();

    if (!isRangeMode()) {
      hideVeil();
      clearRangeOverlay();
      return;
    }
    const r = ST.currentRange;
    if (!r || !r.getClientRects) {
      hideVeil();
      clearRangeOverlay();
      return;
    }
    const rects = Array.from(r.getClientRects());

    // Update the PDF-only layers
    updateVeil(rects);
    drawRangeBoxes(rects);
  };

  // Keep overlays aligned with the viewport
  const req = () => S.updateGradientOverlay && S.updateGradientOverlay();
  window.addEventListener("scroll",  req, { passive: true });
  window.addEventListener("resize",  req);
})();
