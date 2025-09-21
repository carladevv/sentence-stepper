// sstep/settings/index.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const RT = S.Settings?.__rt;
  const store = S.Settings?.__store;

  if (!RT || !store) {
    console.warn("[SStep] Storage not ready; settings bootstrap skipped.");
    return;
  }

  // Init
  (async () => {
    S.enableSmoothScroll && S.enableSmoothScroll();

    const ms = await S.Settings.get("transitionMs");
    S.applyTransitionMs && S.applyTransitionMs(ms);
    S.broadcastTransitionMs && S.broadcastTransitionMs(ms);

    const colors = await S.Settings.get("colors");
    S.applyColors && S.applyColors(colors);
  })();

  // Cross-tab storage changes
  RT.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.prototype.hasOwnProperty.call(changes, "transitionMs")) {
      const ms = changes.transitionMs.newValue;
      S.applyTransitionMs && S.applyTransitionMs(ms);
      S.broadcastTransitionMs && S.broadcastTransitionMs(ms);
    }
    if (Object.prototype.hasOwnProperty.call(changes, "colors")) {
      const c = changes.colors.newValue;
      S.applyColors && S.applyColors(c);
    }
  });

  // React to theme changes (OS or page-driven)
  S.installThemeWatchers && S.installThemeWatchers(async () => {
    const colors = await S.Settings.get("colors");
    S.applyColors && S.applyColors(colors);
  });
})();
