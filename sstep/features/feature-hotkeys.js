// features/hotkeys.js
(() => {
  const S = (window.SStep = window.SStep || {});
  S.Hotkeys = S.Hotkeys || {};
  const U = S.Hotkeys.Utils;

  const DEFAULTS = { next: "Alt+Right", prev: "Alt+Left" };

  let DOWN = new Set();
  let attached = false;
  let callbacks = { onNext: null, onPrev: null };

  function dispatchChange(hotkeys) {
    const ev = new CustomEvent("sstep:hotkeysChanged", { detail: { hotkeys } });
    document.dispatchEvent(ev);
  }

  S.Hotkeys.state = {
    map: { ...DEFAULTS },
  };

  S.Hotkeys.init = function init(opts = {}) {
    callbacks = {
      onNext: typeof opts.onNext === "function" ? opts.onNext : null,
      onPrev: typeof opts.onPrev === "function" ? opts.onPrev : null,
    };
  };

  S.Hotkeys.applySettings = function applySettings(hk) {
    const src = hk && typeof hk === "object" ? hk : {};
    const next = U.normalizeComboString(src.next || DEFAULTS.next) || DEFAULTS.next;
    const prev = U.normalizeComboString(src.prev || DEFAULTS.prev) || DEFAULTS.prev;
    S.Hotkeys.state.map = { next, prev };
    dispatchChange({ ...S.Hotkeys.state.map });
  };

  function keydownHandler(e) {
    if (!S.state?.enabled) return;
    if (U.isEditableTarget(e.target)) return;

    DOWN.add(e.key);
    const combo = U.comboFromEvent(e, DOWN);
    if (!combo) return;

    const map = S.Hotkeys.state.map;
    if (combo === map.next && callbacks.onNext) {
      e.preventDefault(); e.stopPropagation();
      callbacks.onNext();
      return;
    }
    if (combo === map.prev && callbacks.onPrev) {
      e.preventDefault(); e.stopPropagation();
      callbacks.onPrev();
      return;
    }
  }
  function keyupHandler(e) { DOWN.delete(e.key); }

  S.Hotkeys.attach = function attach() {
    if (attached) return;
    DOWN = new Set();
    window.addEventListener("keydown", keydownHandler, true);
    window.addEventListener("keyup", keyupHandler, true);
    attached = true;
  };
  S.Hotkeys.detach = function detach() {
    if (!attached) return;
    window.removeEventListener("keydown", keydownHandler, true);
    window.removeEventListener("keyup", keyupHandler, true);
    DOWN.clear();
    attached = false;
  };

  // Self-bootstrap from storage so persistence works regardless of load order.
  (async () => {
    try {
      if (S.Settings?.get) {
        const hk = await S.Settings.get("hotkeys");
        S.Hotkeys.applySettings(hk);
      } else {
        S.Hotkeys.applySettings(S.Hotkeys.state.map);
      }
    } catch {
      S.Hotkeys.applySettings(S.Hotkeys.state.map);
    }
  })();
})();
