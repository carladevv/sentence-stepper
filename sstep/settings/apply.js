// sstep/settings/apply.js
(() => {
  const S = (window.SStep = window.SStep || {});

  S.applyColors = function applyColors(colors) {
    const defaults = S.__DEFAULT_COLORS || {};
    const c = { ...defaults, ...(colors || {}) };
    const isDark = S.detectIsDarkPage ? S.detectIsDarkPage() : false;

    const toBg   = isDark ? S.Color.darkRich   : S.Color.lightSolid;
    const toGrad = isDark ? S.Color.darkRich   : S.Color.lightSolid;

    const root = document.documentElement;
    root.style.setProperty("--sstep-color-box-bg",     toBg(c.boxBg));
    root.style.setProperty("--sstep-color-underline",  toBg(c.boxBg));
    root.style.setProperty("--sstep-color-box-border", c.boxBorder); // keep border solid
    root.style.setProperty("--sstep-color-grad-start", toGrad(c.gradStart));
    root.style.setProperty("--sstep-color-grad-end",   toGrad(c.gradEnd));

    document.dispatchEvent(new CustomEvent("sstep:colorsChanged", { detail: { colors: c, dark: isDark } }));
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
