// sstep/settings/detect-theme.js
(() => {
  const S = (window.SStep = window.SStep || {});

  // --- helpers ---------------------------------------------------------------
  function parseRGB(str) {
    const m = /rgba?\s*\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)(?:\s*,\s*([.\d]+))?\s*\)/i.exec(str || "");
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  }
  function relLuminance([r, g, b]) {
    const lin = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.04045 ? v/12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  // Returns a concrete RGB background for the page. If body/html are transparent,
  // we assume the UA default (white). We ignore text color and OS preference.
  function getEffectivePageBackground() {
    const docEl = document.documentElement;
    const body  = document.body || docEl;

    const bodyCS = getComputedStyle(body);
    const htmlCS = getComputedStyle(docEl);

    // try body first
    let bg = bodyCS.backgroundColor || "";
    let rgba = parseRGB(bg);
    if (!rgba || rgba[3] === 0) {
      // try html
      bg = htmlCS.backgroundColor || "";
      rgba = parseRGB(bg);
    }

    // if still transparent/unknown, assume white
    if (!rgba || rgba[3] === 0) return [255, 255, 255, 1];

    return rgba;
  }

  // Public: true for dark pages, false for light pages.
  // Only background luminance is used; default is LIGHT if unknown.
  S.detectIsDarkPage = function detectIsDarkPage() {
    const rgba = getEffectivePageBackground();
    const L = relLuminance(rgba);
    // threshold: < 0.50 ⇒ dark (tweakable; was 0.45 before)
    return L < 0.50;
  };

  // Re-run detection when the page theme could change.
  S.installThemeWatchers = function installThemeWatchers(cb) {
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    const debounced = debounce(cb, 120);

    // html/body attributes (class/style) often toggle themes
    const cfg = { attributes: true, attributeFilter: ["class", "style"] };
    const o1 = new MutationObserver(debounced);
    o1.observe(document.documentElement, cfg);

    const startBodyObs = () => {
      if (!document.body) return;
      const o2 = new MutationObserver(debounced);
      o2.observe(document.body, cfg);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => { debounced(); startBodyObs(); });
    } else {
      startBodyObs();
    }

    // Late CSS/paint retries
    requestAnimationFrame(() => debounced());
    setTimeout(() => debounced(), 1000);
    setTimeout(() => debounced(), 3000);
  };
})();
