// sstep/settings/storage.js
(() => {
  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const store = RT?.storage?.local;
  const S = (window.SStep = window.SStep || {});

  const DEFAULT_COLORS = {
    boxBg:     "#fff59d",
    boxBorder: "#000000",
    gradStart: "#ff6b6b",
    gradEnd:   "#4d7cff",
  };

  S.DEFAULTS = {
    transitionMs: 0,
    colors: { ...DEFAULT_COLORS },
  };

  S.__DEFAULT_COLORS = DEFAULT_COLORS; // internal reuse

  S.Settings = {
    async getAll() {
      const data = await store.get(null);
      return {
        ...S.DEFAULTS,
        ...data,
        colors: { ...DEFAULT_COLORS, ...(data.colors || {}) },
      };
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
    async reset()    { await store.clear(); await store.set(S.DEFAULTS); },
    __store: store,
    __rt: RT,
  };
})();
