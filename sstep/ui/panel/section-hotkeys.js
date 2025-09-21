// ui/panel/sections/section-hotkeys.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const DEFAULTS = {
    next: "Alt+Right",
    prev: "Alt+Left",
  };

  function broadcast(map) {
    const ev = new CustomEvent("sstep:hotkeysChanged", { detail: { hotkeys: map } });
    document.dispatchEvent(ev);
  }

  function prettyCombo(e) {
    const parts = [];
    if (e.ctrlKey)  parts.push("Ctrl");
    if (e.metaKey)  parts.push("Meta");
    if (e.altKey)   parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    let key = e.key;
    // Normalize common keys
    const map = { ArrowRight: "Right", ArrowLeft: "Left", " ": "Space" };
    key = map[key] || key;

    // Ignore pure modifier presses
    if (["Control","Meta","Alt","Shift"].includes(key)) return null;

    // Single-letter uppercase
    if (key.length === 1) key = key.toUpperCase();

    parts.push(key);
    return parts.join("+");
  }

  function makeRecorder(rowEl, labelText, value, onSet) {
    const row = document.createElement("div");
    row.className = "sstep-row";
    const label = document.createElement("label");
    label.style.minWidth = "130px";
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.readOnly = true;
    input.style.width = "160px";
    input.style.cursor = "pointer";

    const hint = document.createElement("small");
    hint.textContent = "Click, then press keys";

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(hint);
    rowEl.appendChild(row);

    let recording = false;

    input.addEventListener("focus", () => {
      recording = true;
      hint.textContent = "Listening… press combo";
    });
    input.addEventListener("blur", () => {
      recording = false;
      hint.textContent = "Click, then press keys";
    });

    input.addEventListener("keydown", (e) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();
      const combo = prettyCombo(e);
      if (!combo) return; // ignore pure modifier
      input.value = combo;
      onSet(combo);
    });
  }

  S.Panel?.registerSection({
    id: "hotkeys",
    title: "Hotkeys",
    async render(host) {
      const cur = (await S.Settings?.get("hotkeys")) || {};
      const state = { ...DEFAULTS, ...cur };

      const wrap = document.createElement("div");
      wrap.className = "sstep-field";
      host.appendChild(wrap);

      async function commit() {
        await S.Settings?.set({ hotkeys: { ...state } });
        broadcast(state);
      }

      makeRecorder(wrap, "Next", state.next, (v) => { state.next = v; commit(); });
      makeRecorder(wrap, "Previous", state.prev, (v) => { state.prev = v; commit(); });

      const note = document.createElement("div");
      note.className = "sstep-row";
      note.innerHTML = `<small>These override the default Alt+Left / Alt+Right when the page is active.</small>`;
      host.appendChild(note);

      // reflect external changes
      document.addEventListener("sstep:hotkeysChanged", (ev) => {
        const hk = ev?.detail?.hotkeys || state;
        state.next = hk.next || state.next;
        state.prev = hk.prev || state.prev;
        // (UI inputs will reflect on next open; keeping live sync is optional)
      });
    }
  });
})();
