// 00-settings.js
(() => {
  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const store = RT?.storage?.local;
  const S = (window.SStep = window.SStep || {});

  // ---- defaults (extend any time) -------------------------------------------
  S.DEFAULTS = {
    theme: "box",
    lang: "auto",
    pos: "tr", // tl,tr,tc,bl,bc,br
    colors: {},
    hotkeys: {},
    grouping: "sentence",            // "sentence" | "group" | "paragraph"
    softTransition: false,
    resetPositionOnRefresh: false,
  };

  // ---- settings wrapper (global, extension-scoped) --------------------------
  S.Settings = {
    async getAll() {
      const data = await store.get(null);
      return { ...S.DEFAULTS, ...data };
    },
    async get(key) {
      const { [key]: val } = await store.get(key);
      return (val ?? S.DEFAULTS[key]);
    },
    async set(patch) {
      await store.set(patch);
    },
    async reset() {
      await store.clear();
      await store.set(S.DEFAULTS);
    },
    // one-time migration off page localStorage (safe if re-run)
    async migrateFromLocalStorage() {
      try {
        const patch = {};
        const t = localStorage.getItem("sstep-theme");
        const l = localStorage.getItem("sstep-lang");
        const p = localStorage.getItem("sstep-pos-mode");
        if (t) patch.theme = t;
        if (l) patch.lang  = l;
        if (p) patch.pos   = p;
        if (Object.keys(patch).length) await store.set(patch);
        localStorage.removeItem("sstep-theme");
        localStorage.removeItem("sstep-lang");
        localStorage.removeItem("sstep-pos-mode");
      } catch {}
    }
  };

  // ---- live updates everywhere (used by toolbar position now) ---------------
  RT.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.pos?.newValue !== undefined && S.setToolbarPos) {
      S.setToolbarPos(changes.pos.newValue);
    }
    if (changes.theme?.newValue !== undefined && S.setTheme) {
      S.setTheme(changes.theme.newValue);
    }
    if (changes.lang?.newValue !== undefined && S.setLanguage) {
      S.setLanguage(changes.lang.newValue);
    }
  });

  // kick migration early (no-op if nothing to migrate)
  S.Settings.migrateFromLocalStorage();
})();
