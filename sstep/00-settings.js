// 00-settings.js
(() => {
  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const store = RT?.storage?.local;
  const S = (window.SStep = window.SStep || {});

  // Global, user-scoped settings
  S.DEFAULTS = {
    transitionMs: 0,     // 0..1000 — fade duration for highlight transitions
  };

  S.Settings = {
    async getAll() {
      const data = await store.get(null);
      return { ...S.DEFAULTS, ...data };
    },
    async get(key) {
      const { [key]: val } = await store.get(key);
      return (val ?? S.DEFAULTS[key]);
    },
    async set(patch) { await store.set(patch); },
    async reset()    { await store.clear(); await store.set(S.DEFAULTS); }
  };

  // Apply the transition duration to a CSS variable
  S.applyTransitionMs = function applyTransitionMs(ms) {
    const root = document.documentElement;
    const clamped = Math.max(0, Math.min(1000, Number(ms) || 0));
    root.style.setProperty("--sstep-trans-ms", `${clamped}ms`);
  };

  // Always use smooth scroll while extension is active
  S.enableSmoothScroll = function enableSmoothScroll() {
    document.documentElement.classList.add("sstep-scroll");
  };

  // Broadcast to all UIs that the value changed
  S.broadcastTransitionMs = function broadcastTransitionMs(ms) {
    const ev = new CustomEvent("sstep:transitionMs", { detail: { ms } });
    document.dispatchEvent(ev);
  };

  // Initialize on load
  (async () => {
    S.enableSmoothScroll();
    const ms = await S.Settings.get("transitionMs");
    S.applyTransitionMs(ms);
    // Also broadcast so late-mounted toolbars can sync on first paint
    S.broadcastTransitionMs(ms);
  })();

  // Live update when any tab changes the value
  RT.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.prototype.hasOwnProperty.call(changes, "transitionMs")) {
      const ms = changes.transitionMs.newValue;
      S.applyTransitionMs(ms);
      S.broadcastTransitionMs(ms);
    }
  });
})();
