// sstep/settings/color-tuning.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const Color = (S.Color = S.Color || {});

  // Public config
  Color.DARK_ALPHA = 0.40;              // default dark-page opacity
  Color.setDarkAlpha = (a) => { Color.DARK_ALPHA = Math.max(0, Math.min(1, Number(a) || 0)); };

  // --- helpers ---------------------------------------------------------------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function hexToRgb(hex) {
    if (!hex) return null;
    let h = hex.trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const m = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2;               break;
        default: h = (r - g) / d + 4;              break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = (h % 360 + 360) % 360; s /= 100; l /= 100;
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hk = h / 360;
    const t = [hk + 1/3, hk, hk - 1/3].map(x => {
      x = (x % 1 + 1) % 1;
      if (x < 1/6) return p + (q - p) * 6 * x;
      if (x < 1/2) return q;
      if (x < 2/3) return p + (q - p) * (2/3 - x) * 6;
      return p;
    });
    return { r: Math.round(t[0] * 255), g: Math.round(t[1] * 255), b: Math.round(t[2] * 255) };
  }

  function rgba({ r, g, b }, a) { return `rgba(${r},${g},${b},${a})`; }

  // --- exported transforms ---------------------------------------------------
  // Dark-page version: richer (more saturated, darker) then alpha applied
  Color.darkRich = function darkRich(hex, alpha = Color.DARK_ALPHA) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const s2  = clamp(hsl.s * 1.25 + 8, 0, 100);   // saturation boost
    const l2  = clamp(hsl.l * 0.55, 0, 100);       // lightness down
    const rgb2 = hslToRgb(hsl.h, s2, l2);
    return rgba(rgb2, alpha);
  };

  // Light-page version: solid color (no alpha)
  Color.lightSolid = function lightSolid(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex || "transparent";
    return rgba(rgb, 1);
  };
})();
