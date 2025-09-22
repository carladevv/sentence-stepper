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

    const hk = await S.Settings.get("hotkeys");
    S.Hotkeys?.applySettings(hk || S.Hotkeys?.state?.map);

    const mode = await S.Settings.get("mode");
    S.Spans?.setMode(mode);
    if (S.state?.enabled) S.hardRebuildKeepingScroll && S.hardRebuildKeepingScroll();

    // Bookmark toggle bootstrap (default true)
    const on = await S.Settings.get("bookmarkEnabled");
    S.Bookmark?.applyEnabled(on !== false);
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

    if (Object.prototype.hasOwnProperty.call(changes, "hotkeys")) {
      const hk = changes.hotkeys.newValue;
      S.Hotkeys?.applySettings(hk);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "mode")) {
      const m = changes.mode.newValue;
      S.Spans?.setMode(m);
      if (S.state?.enabled) S.hardRebuildKeepingScroll && S.hardRebuildKeepingScroll();
    }

    if (Object.prototype.hasOwnProperty.call(changes, "bookmarkEnabled")) {
      const on = changes.bookmarkEnabled.newValue;
      S.Bookmark?.applyEnabled(on !== false);
    }
  });

  // React to theme changes (OS or page-driven)
  S.installThemeWatchers && S.installThemeWatchers(async () => {
    const colors = await S.Settings.get("colors");
    S.applyColors && S.applyColors(colors);
  });
})();
