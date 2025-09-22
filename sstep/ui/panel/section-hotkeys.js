// ui/panel/sections/section-hotkeys.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const U = S.Hotkeys?.Utils;
  const DEFAULTS = { next: "Alt+Right", prev: "Alt+Left" };

  function broadcast(map) {
    const ev = new CustomEvent("sstep:hotkeysChanged", { detail: { hotkeys: map } });
    document.dispatchEvent(ev);
  }

  function makeRecorder(rowEl, labelText, value, onSet) {
    const row = document.createElement("div");
    row.className = "sstep-row";

    const label = document.createElement("label");
    label.style.minWidth = "130px";
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "text";
    input.value = U.normalizeComboString(value) || "";
    input.readOnly = true;
    input.style.width = "180px";
    input.style.cursor = "pointer";

    const hint = document.createElement("small");
    hint.textContent = "Click, then press keys together";

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(hint);
    rowEl.appendChild(row);

    let recording = false;
    let down = new Set();

    function update(e) {
      const combo = U.comboFromEvent(e, down);
      if (!combo) return;
      input.value = combo;
      onSet(combo);
    }

    input.addEventListener("focus", () => {
      recording = true;
      down.clear();
      hint.textContent = "Listening… press combo";
    });
    input.addEventListener("blur", () => {
      recording = false;
      down.clear();
      hint.textContent = "Click, then press keys together";
    });

    input.addEventListener("keydown", (e) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();
      down.add(e.key);
      update(e);
    });
    input.addEventListener("keyup", (e) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();
      down.delete(e.key);
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
        S.Hotkeys?.applySettings(state);
        broadcast(state);
      }

      makeRecorder(wrap, "Next", state.next, (v) => { state.next = v; commit(); });
      makeRecorder(wrap, "Previous", state.prev, (v) => { state.prev = v; commit(); });

      const note = document.createElement("div");
      note.className = "sstep-row";
      note.innerHTML = `<small>Defaults remain <strong>Alt+Left / Alt+Right</strong> until you remap. You can use multiple keys (e.g., Alt+J+K).</small>`;
      host.appendChild(note);

      document.addEventListener("sstep:hotkeysChanged", (ev) => {
        const hk = ev?.detail?.hotkeys || state;
        state.next = hk.next || state.next;
        state.prev = hk.prev || state.prev;
      });
    }
  });
})();
