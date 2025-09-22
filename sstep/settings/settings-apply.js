// sstep/settings/apply.js
(() => {
  const S = (window.SStep = window.SStep || {});

  // Turn an rgba(...) into the same color with a different alpha
  function withAlpha(rgbaStr, a) {
    const m = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/i.exec(rgbaStr || "");
    if (!m) return rgbaStr;
    return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
  }

  S.applyColors = function applyColors(colors) {
    const defaults = S.__DEFAULT_COLORS || {};
    const c = { ...defaults, ...(colors || {}) };
    const isDark = S.detectIsDarkPage ? S.detectIsDarkPage() : false;

    // Box/underline backgrounds
    const toBox = isDark ? S.Color.darkRich : S.Color.lightSolid;

    // For gradients PAINTED BEHIND TEXT (line + sentence BG) we want *semi-transparent*
    // on both light and dark pages (looks consistent across sites).
    const darkA  = (S.Color && S.Color.DARK_ALPHA) || 0.40; // default on dark
    const lightA = 0.20;                                    // chosen for light

    // Dark pages: richer + alpha via darkRich; Light pages: keep hue, add alpha
    const startBG = isDark ? S.Color.darkRich(c.gradStart, darkA)
                           : withAlpha(S.Color.lightSolid(c.gradStart), lightA);
    const endBG   = isDark ? S.Color.darkRich(c.gradEnd,   darkA)
                           : withAlpha(S.Color.lightSolid(c.gradEnd),   lightA);

    // For gradients CLIPPED TO GLYPHS (sentence TEXT) we want FULL opacity.
    // Use solid rgba(...) stops so overlay text is 100%.
    const startTEXT = S.Color.lightSolid(c.gradStart);
    const endTEXT   = S.Color.lightSolid(c.gradEnd);

    const root = document.documentElement;

    // Box & underline
    root.style.setProperty("--sstep-color-box-bg",     toBox(c.boxBg));
    root.style.setProperty("--sstep-color-underline",  toBox(c.boxBg));
    root.style.setProperty("--sstep-color-box-border", c.boxBorder);

    // Gradient stops (used by: line + sentence BG)
    root.style.setProperty("--sstep-color-grad-start", startBG);
    root.style.setProperty("--sstep-color-grad-end",   endBG);

    // Full-opacity text stops (used by: sentence TEXT)
    root.style.setProperty("--sstep-color-grad-start-text", startTEXT);
    root.style.setProperty("--sstep-color-grad-end-text",   endTEXT);

    document.dispatchEvent(new CustomEvent("sstep:colorsChanged", {
      detail: { colors: c, dark: isDark }
    }));
  };

  S.applyTransitionMs = function applyTransitionMs(ms) {
    const clamped = Math.max(0, Math.min(1000, Number(ms) || 0));
    document.documentElement.style.setProperty("--sstep-trans-ms", `${clamped}ms`);
  };

  S.enableSmoothScroll = function enableSmoothScroll() {
    document.documentElement.classList.add("sstep-scroll");
  };

  S.broadcastTransitionMs = function broadcastTransitionMs(ms) {
    document.dispatchEvent(new CustomEvent("sstep:transitionMs", { detail: { ms } }));
  };
})();
