// utils/hotkeys.js
(() => {
  const S = (window.SStep = window.SStep || {});
  S.Hotkeys = S.Hotkeys || {};
  const U = (S.Hotkeys.Utils = S.Hotkeys.Utils || {});

  const MOD_ORDER = ["Ctrl", "Meta", "Alt", "Shift"];
  const KEY_ALIASES = {
    ArrowLeft: "Left", ArrowRight: "Right", ArrowUp: "Up", ArrowDown: "Down",
    " ": "Space", Esc: "Escape", Del: "Delete", Return: "Enter",
  };
  const MOD_SYNONYM = { Control: "Ctrl", Ctrl: "Ctrl", Meta: "Meta", Alt: "Alt", Shift: "Shift" };
  const IS_MOD = (k) => ["Control", "Ctrl", "Meta", "Alt", "Shift"].includes(k);

  function normalizeKeyName(key) {
    if (!key) return "";
    let k = KEY_ALIASES[key] || key;
    if (k.length === 1) k = k.toUpperCase();
    return k;
  }
  function normalizeComboParts(mods, primaries) {
    const orderedMods = MOD_ORDER.filter((m) => mods.has(m));
    const orderedPrim = Array.from(primaries).sort((a, b) => a.localeCompare(b));
    return [...orderedMods, ...orderedPrim].join("+");
  }

  U.comboFromEvent = function comboFromEvent(e, downKeysSet) {
    const mods = new Set();
    if (e.ctrlKey) mods.add("Ctrl");
    if (e.metaKey) mods.add("Meta");
    if (e.altKey) mods.add("Alt");
    if (e.shiftKey) mods.add("Shift");

    const primaries = new Set();
    if (downKeysSet && downKeysSet.size) {
      for (const k of downKeysSet) {
        if (IS_MOD(k)) continue;
        primaries.add(normalizeKeyName(KEY_ALIASES[k] || k));
      }
    }
    const ek = e.key;
    if (!IS_MOD(ek)) primaries.add(normalizeKeyName(ek));

    if (!primaries.size) return null;
    return normalizeComboParts(mods, primaries);
  };

  U.normalizeComboString = function normalizeComboString(str) {
    if (!str) return "";
    const parts = String(str).split("+").map((s) => s.trim()).filter(Boolean);
    const mods = new Set();
    const prim = new Set();
    for (const p of parts) {
      const guess =
        MOD_SYNONYM[p] ||
        MOD_SYNONYM[p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()] ||
        null;
      if (guess) {
        mods.add(guess);
        continue;
      }
      prim.add(normalizeKeyName(KEY_ALIASES[p] || p));
    }
    if (!prim.size) return "";
    return normalizeComboParts(mods, prim);
  };

  U.isEditableTarget = function isEditableTarget(target) {
    if (!target) return false;
    const el = target.closest?.(
      "input, textarea, select, [contenteditable=''], [contenteditable='true']"
    );
    const roleTextbox = target.closest?.("[role='textbox']");
    return !!(el || roleTextbox);
  };
})();
