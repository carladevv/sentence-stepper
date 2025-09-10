// sstep-veil.js
// PDF-only refinements for EXACT mode (range path):
//  • White veil clipped to the current PDF page, Z-below topbar/toolbar
//  • Yellow "box" highlight UNDER the text layer (so text isn't lightened)

(() => {
  const S  = (window.SStep = window.SStep || {});
  const ST = S.state || (S.state = {});

  // Veil config: keep zIndex BELOW your topbar (which is ~800) and below SStep toolbar (~1200)
  S.veil = Object.assign({}, S.veil || {}, {
    enabled: true,
    color: "#fff",
    opacity: 0.85,
    pad: 3,
    radius: 6,
    zIndex: 750,           // < topbar(800) and toolbar(1200)
  });

  // Yellow box style to match your "box" theme
  const RANGE_BOX = {
    padX: 2,
    padY: 2,
    radius: 4,
    border: "2px solid #000",
    background: "rgba(255,255,0,.20)",
    zIndex: 800
  };

  // ---------- helpers ----------
  const isRangeMode = () => Array.isArray(ST.ranges) && ST.ranges.length;

  function currentPageEl() {
    const r = ST.currentRange;
    let el = r ? (r.commonAncestorContainer?.nodeType === 1
                    ? r.commonAncestorContainer
                    : r.commonAncestorContainer?.parentElement) : null;
    while (el && !(el.classList?.contains("page") && el.classList?.contains("facsimile"))) {
      el = el.parentElement;
    }
    return el || document.querySelector(".page.facsimile.current") || null;
  }

  function currentPageRect() {
    const el = currentPageEl();
    return el ? el.getBoundingClientRect() : { left:0, top:0, width:0, height:0 };
  }

  // ---------- VEIL (fixed SVG, clipped to page box, z-index below topbar) ----------
  function svgEl(n){ return document.createElementNS("http://www.w3.org/2000/svg", n); }

  function ensureVeil() {
    if (ST.veilSvg) return ST.veilSvg;

    const svg = svgEl("svg");
    svg.id = "sstep-veil";
    Object.assign(svg.style, {
      position: "fixed",
      left: "0", top: "0",
      width: "0", height: "0",
      pointerEvents: "none",
      zIndex: String(S.veil.zIndex)
    });

    const defs = svgEl("defs");
    const mask = svgEl("mask");
    mask.id = "sstep-veil-mask";

    const base = svgEl("rect"); // white = veil is visible
    base.setAttribute("fill", "white");
    mask.appendChild(base);
    defs.appendChild(mask);
    svg.appendChild(defs);

    const dim = svgEl("rect");  // white veil that will have holes cut out
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

    // Position the SVG to exactly cover the page box (viewport coords)
    Object.assign(svg.style, {
      left: page.left + "px",
      top:  page.top  + "px",
      width:  page.width  + "px",
      height: page.height + "px"
    });

    // Resize its content to local page coords
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

    // Clear previous holes (keep base)
    while (ST.veilMask.childNodes.length > 1) ST.veilMask.removeChild(ST.veilMask.lastChild);

    const pad = S.veil.pad, rxy = S.veil.radius;
    for (const rc of rects) {
      const hole = svgEl("rect");
      // convert viewport rect -> page-local rect
      hole.setAttribute("x", String(Math.max(0, rc.left - page.left - pad)));
      hole.setAttribute("y", String(Math.max(0, rc.top  - page.top  - pad)));
      hole.setAttribute("width",  String(Math.max(0, rc.width  + pad*2)));
      hole.setAttribute("height", String(Math.max(0, rc.height + pad*2)));
      hole.setAttribute("rx", String(rxy));
      hole.setAttribute("ry", String(rxy));
      hole.setAttribute("fill", "black"); // black = cut hole
      ST.veilMask.appendChild(hole);
    }
  }

  // ---------- YELLOW BOXES UNDER THE TEXT LAYER ----------
  function ensureUnderlay(pageEl) {
    if (!pageEl) return null;

    // ensure page is a stacking context we control
    pageEl.style.position = pageEl.style.position || "relative";

    // get/insert an underlay just beneath the text layer
    let under = pageEl.querySelector(":scope > .sstep-range-underlay");
    if (!under) {
      under = document.createElement("div");
      under.className = "sstep-range-underlay";
      Object.assign(under.style, {
        position: "absolute",
        inset: "0",
        pointerEvents: "none",
        zIndex: "2" // gfx(0) < under(2) < text(3)
      });

      const textLayer = pageEl.querySelector(":scope > .textLayer");
      if (textLayer && textLayer.parentNode) {
        textLayer.style.zIndex = "3"; // make sure text is above our underlay
        pageEl.insertBefore(under, textLayer);
      } else {
        pageEl.appendChild(under);
      }
    }

    // hide/clear any other page underlays
    document.querySelectorAll(".sstep-range-underlay").forEach(u => {
      if (u !== under) { u.replaceChildren(); u.style.display = "none"; }
    });
    under.style.display = "block";
    return under;
  }

  function drawRangeBoxesUnderText(rects) {
    const pageEl = currentPageEl();
    if (!pageEl) return;
    const page = pageEl.getBoundingClientRect();
    const under = ensureUnderlay(pageEl);
    if (!under) return;

    under.replaceChildren();
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
      under.appendChild(d);
    }
  }

  // ---------- hook into the existing overlay update ----------
  const origUpdate = S.updateGradientOverlay?.bind(S);
  S.updateGradientOverlay = function() {
    // Run your original HTML overlay logic first (unchanged for non-PDF pages)
    origUpdate && origUpdate();

    if (!isRangeMode() || !ST.currentRange?.getClientRects) {
      hideVeil();
      const els = document.querySelectorAll(".sstep-range-underlay");
      els.forEach(el => el.replaceChildren());
      return;
    }
    const rects = Array.from(ST.currentRange.getClientRects());
    updateVeil(rects);                 // white veil (under topbar/toolbar)
    drawRangeBoxesUnderText(rects);    // yellow boxes beneath text
  };

  // Keep in sync with scroll/resize
  const req = () => S.updateGradientOverlay && S.updateGradientOverlay();
  window.addEventListener("scroll",  req, { passive: true });
  window.addEventListener("resize",  req);
})();
