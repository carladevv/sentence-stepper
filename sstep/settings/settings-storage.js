// sstep/settings/storage.js
(() => {
  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const store = RT?.storage?.local;
  const S = (window.SStep = window.SStep || {});

  const DEFAULT_COLORS = {
    boxBg:     "#fff59d",
    boxBorder: "#000000",
    gradStart: "#ff0000ff",
    gradEnd:   "#0044ffff",
  };
  const DEFAULT_HOTKEYS = { next: "Alt+Right", prev: "Alt+Left" };

  S.DEFAULTS = {
    transitionMs: 0,
    colors: { ...DEFAULT_COLORS },
    mode: "sentences",
    hotkeys: { ...DEFAULT_HOTKEYS },
    bookmarkEnabled: true,
    bookmarks: {}, // pageKey -> { text, ts }
  };

  S.__DEFAULT_COLORS = DEFAULT_COLORS;

  S.Settings = {
    async getAll() {
      const data = await store.get(null);
      return {
        ...S.DEFAULTS,
        ...data,
        colors:  { ...DEFAULT_COLORS, ...(data.colors  || {}) },
        hotkeys: { ...DEFAULT_HOTKEYS, ...(data.hotkeys || {}) },
        mode:    (data.mode ?? "sentences"),
        bookmarkEnabled: (data.bookmarkEnabled !== false),
        bookmarks: (data.bookmarks || {}),
      };
    },
    async get(key) {
      if (key === "colors") {
        const { colors } = await store.get("colors");
        return { ...DEFAULT_COLORS, ...(colors || {}) };
      }
      if (key === "hotkeys") {
        const { hotkeys } = await store.get("hotkeys");
        return { ...DEFAULT_HOTKEYS, ...(hotkeys || {}) };
      }
      if (key === "mode") {
        const { mode } = await store.get("mode");
        return (mode ?? "sentences");
      }
      if (key === "bookmarkEnabled") {
        const { bookmarkEnabled } = await store.get("bookmarkEnabled");
        return (bookmarkEnabled !== false);
      }
      if (key === "bookmarks") {
        const { bookmarks } = await store.get("bookmarks");
        return (bookmarks || {});
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
