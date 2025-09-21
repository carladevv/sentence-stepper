// 00-settings.js
(() => {
  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const store = RT?.storage?.local;
  const S = (window.SStep = window.SStep || {});

  // Global, user-scoped defaults
  const DEFAULT_COLORS = {
    boxBg:     "#fff59d",  // light yellow
    boxBorder: "#000000",
    gradStart: "#ff6b6b",
    gradEnd:   "#4d7cff",
  };

  S.DEFAULTS = {
    transitionMs: 0,              // 0..1000
    colors: { ...DEFAULT_COLORS } // persisted as one object
  };

  S.Settings = {
    async getAll() {
      const data = await store.get(null);
      return { ...S.DEFAULTS, ...data, colors: { ...DEFAULT_COLORS, ...(data.colors || {}) } };
    },
    async get(key) {
      if (key === "colors") {
        const { colors } = await store.get("colors");
        return { ...DEFAULT_COLORS, ...(colors || {}) };
      }
      const { [key]: val } = await store.get(key);
      return (val ?? S.DEFAULTS[key]);
    },
    async set(patch) { await store.set(patch); },
    async reset()    { await store.clear(); await store.set(S.DEFAULTS); }
  };

  // Apply transition duration to CSS var
  S.applyTransitionMs = function applyTransitionMs(ms) {
    const root = document.documentElement;
    const clamped = Math.max(0, Math.min(1000, Number(ms) || 0));
    root.style.setProperty("--sstep-trans-ms", `${clamped}ms`);
  };

  // Apply color set to CSS vars (and broadcast)
  S.applyColors = function applyColors(colors) {
    const c = { ...DEFAULT_COLORS, ...(colors || {}) };
    const root = document.documentElement;

    root.style.setProperty("--sstep-color-box-bg",     c.boxBg);
    root.style.setProperty("--sstep-color-box-border", c.boxBorder);
    // underline follows boxBg
    root.style.setProperty("--sstep-color-underline",  c.boxBg);

    root.style.setProperty("--sstep-color-grad-start", c.gradStart);
    root.style.setProperty("--sstep-color-grad-end",   c.gradEnd);

    document.dispatchEvent(new CustomEvent("sstep:colorsChanged", { detail: { colors: c } }));
  };

  // Always use smooth scroll while extension is active
  S.enableSmoothScroll = function enableSmoothScroll() {
    document.documentElement.classList.add("sstep-scroll");
  };

  // Broadcast transition changes to UIs
  S.broadcastTransitionMs = function broadcastTransitionMs(ms) {
    document.dispatchEvent(new CustomEvent("sstep:transitionMs", { detail: { ms } }));
  };

  // Initialize on load
  (async () => {
    S.enableSmoothScroll();

    const ms = await S.Settings.get("transitionMs");
    S.applyTransitionMs(ms);
    S.broadcastTransitionMs(ms);

    // ✅ Load and apply COLORS immediately on every page
    const colors = await S.Settings.get("colors");
    S.applyColors(colors);
  })();

  // Cross-tab live updates
  RT.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (Object.prototype.hasOwnProperty.call(changes, "transitionMs")) {
      const ms = changes.transitionMs.newValue;
      S.applyTransitionMs(ms);
      S.broadcastTransitionMs(ms);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "colors")) {
      const c = changes.colors.newValue || {};
      S.applyColors(c);
    }
  });
})();
