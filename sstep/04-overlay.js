// 04-overlay.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = S.state;

  S.THEMES = ["box", "underline", "none", "gradient-line", "gradient-span", "gradient-text-span"];

  S.setTheme = function setTheme(name = "box") {
    const cls = S.THEMES.map(t => "sstep-theme-" + t);
    document.documentElement.classList.remove(...cls);
    document.documentElement.classList.add("sstep-theme-" + name);
    try { localStorage.setItem("sstep-theme", name); } catch { }
    S.scheduleOverlayUpdate();
  };

  S.ensureOverlay = function ensureOverlay() {
    if (!ST.overlayEl) {
      ST.overlayEl = document.getElementById("sstep-gradient-overlay");
      if (!ST.overlayEl) {
        ST.overlayEl = document.createElement("div");
        ST.overlayEl.id = "sstep-gradient-overlay";
        Object.assign(ST.overlayEl.style, {
          position: "absolute",
          left: "0px",
          top: "0px",
          pointerEvents: "none",
          zIndex: "2147483646", // toolbar stays above this, see overlay.css
          userSelect: "none",
          MozUserSelect: "none",
          WebkitUserSelect: "none"
        });
        document.body.appendChild(ST.overlayEl);
      }
    }
    return ST.overlayEl;
  };

  S.clearOverlay = function clearOverlay() { if (ST.overlayEl) ST.overlayEl.replaceChildren(); };

  function caretStartAt(x, y) {
    if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      return r ? { node: r.startContainer, offset: r.startOffset } : null;
    }
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      return p ? { node: p.offsetNode, offset: p.offset } : null;
    }
    return null;
  }
  function rangeBetweenPoints(x1, y1, x2, y2) {
    const s = caretStartAt(x1, y1), e = caretStartAt(x2, y2);
    if (!s || !e) return null;
    const r = document.createRange();
    try { r.setStart(s.node, s.offset); r.setEnd(e.node, e.offset); return r.collapsed ? null : r; }
    catch { return null; }
  }

  S.restoreSpanColor = function restoreSpanColor(span) {
    if (!span) return;
    span.style.color = "";
    span.style.webkitTextFillColor = "";
    span.style.removeProperty("-webkit-text-fill-color");
  };

  S.updateGradientOverlay = function updateGradientOverlay() {
    S.clearOverlay();
    if (!ST.enabled) {
      if (ST.lastTextPaintIndex !== -1) { S.restoreSpanColor(ST.sentences[ST.lastTextPaintIndex]); ST.lastTextPaintIndex = -1; }
      return;
    }
    const curSpan = ST.sentences[ST.current];
    if (!curSpan) return;

    const isSpanBg = document.documentElement.classList.contains("sstep-theme-gradient-span");
    const isTextSpan = document.documentElement.classList.contains("sstep-theme-gradient-text-span");
    if (!isSpanBg && !isTextSpan) {
      if (ST.lastTextPaintIndex !== -1) { S.restoreSpanColor(ST.sentences[ST.lastTextPaintIndex]); ST.lastTextPaintIndex = -1; }
      return;
    }

    // Colors from applyColors()
    const GRADIENT_BG = "linear-gradient(90deg, var(--sstep-color-grad-start), var(--sstep-color-grad-end))";
    const GRADIENT_TEXT = "linear-gradient(90deg, var(--sstep-color-grad-start-text), var(--sstep-color-grad-end-text))";

    const r = document.createRange();
    r.selectNodeContents(curSpan);
    const rects = Array.from(r.getClientRects());
    if (!rects.length) return;

    const total = rects.reduce((a, rc) => a + rc.width, 0);
    let offset = 0;
    const ov = S.ensureOverlay();

    if (isTextSpan && ST.lastTextPaintIndex !== -1 && ST.lastTextPaintIndex !== ST.current) {
      S.restoreSpanColor(ST.sentences[ST.lastTextPaintIndex]);
    }

    for (const rc of rects) {
      const left = rc.left + window.scrollX, top = rc.top + window.scrollY;
      const fudge = 2;

      if (isSpanBg) {
        const piece = document.createElement("div");
        Object.assign(piece.style, {
          position: "absolute",
          left: left + "px",
          top: (top - fudge) + "px",
          width: rc.width + "px",
          height: (rc.height + 2 * fudge) + "px",
          borderRadius: "4px",
          backgroundImage: GRADIENT_BG,
          backgroundRepeat: "no-repeat",
          backgroundSize: total + "px 100%",
          backgroundPosition: (-offset) + "px 0",
          transform: "translateZ(0)"
        });
        ov.appendChild(piece);
      }

      if (isTextSpan) {
        // Force-hide the base glyphs even if site CSS tries to override (base.css makes them inherit) :contentReference[oaicite:1]{index=1}
        curSpan.style.setProperty("color", "transparent", "important");
        curSpan.style.setProperty("-webkit-text-fill-color", "transparent", "important");

        const midY = rc.top + rc.height / 2;
        const startX = rc.left + 0.5, endX = rc.right - 0.5;
        const lineRange = rangeBetweenPoints(startX, midY, endX, midY);
        if (!lineRange) { offset += rc.width; continue; }

        const frag = lineRange.cloneContents();
        const wrap = document.createElement("div");

        // Hard reset so toolbar/site CSS can't leak into wrappers
        // Then set only what we want.
        wrap.style.all = "initial";

        Object.assign(wrap.style, {
          position: "absolute",
          left: left + "px",
          top: (top - fudge) + "px",
          width: rc.width + "px",
          height: (rc.height + 2 * fudge) + "px",
          overflow: "hidden",
          backgroundImage: GRADIENT_TEXT, // full opacity stops
          backgroundRepeat: "no-repeat",
          backgroundSize: total + "px 100%",
          backgroundPosition: (-offset) + "px 0",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          borderRadius: "4px",
          display: "inline-block",
          // Allow justification
          whiteSpace: "normal",
          transform: "translateZ(0)",
          pointerEvents: "none",
          // Improve glyph consistency
          textRendering: "optimizeLegibility"
        });

        // Copy typographic metrics from the real span
        const cs = getComputedStyle(curSpan);
        wrap.style.font = cs.font;
        wrap.style.letterSpacing = cs.letterSpacing;
        wrap.style.wordSpacing = cs.wordSpacing;
        // Inherit the real line-height when it’s explicit; otherwise let it be “normal”
        if (cs.lineHeight && cs.lineHeight !== "normal") {
          wrap.style.lineHeight = cs.lineHeight;
        }
        wrap.style.direction = cs.direction;
        wrap.style.hyphens = cs.hyphens;
        wrap.style.textAlign = cs.textAlign;          // will be 'justify' on justified pages
        if (cs.textAlign.includes("justify")) wrap.style.textJustify = "inter-word";

        wrap.appendChild(frag);
        ov.appendChild(wrap);
      }

      offset += rc.width;
    }
    if (isTextSpan) ST.lastTextPaintIndex = ST.current;
  };

  S.scheduleOverlayUpdate = function scheduleOverlayUpdate() {
    cancelAnimationFrame(ST.overlayRaf);
    ST.overlayRaf = requestAnimationFrame(S.updateGradientOverlay);
  };

  // Repaint when custom colors change (keeps overlays in sync with theme vars)
  document.addEventListener("sstep:colorsChanged", () => {
    S.scheduleOverlayUpdate && S.scheduleOverlayUpdate();
  });
})();
