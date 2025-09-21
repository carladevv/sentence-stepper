// ui/panel/sections/section-colors.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const DEFAULTS = {
    boxBg:     "#fff59d",
    boxBorder: "#000000",
    gradStart: "#ff6b6b",
    gradEnd:   "#4d7cff",
  };

  function makeRow(host, key, labelText, initial, onChange) {
    const row = document.createElement("div");
    row.className = "sstep-row";

    const label = document.createElement("label");
    label.style.minWidth = "130px";
    label.textContent = labelText;

    const picker = document.createElement("input");
    picker.type = "color";
    picker.value = initial;

    const hex = document.createElement("input");
    hex.type = "text";
    hex.value = initial;
    hex.style.width = "90px";
    hex.spellcheck = false;

    function normalizeHex(v) {
      const t = (v || "").trim();
      if (!/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(t)) return null;
      return t.length === 4
        ? ("#" + t[1] + t[1] + t[2] + t[2] + t[3] + t[3]).toLowerCase()
        : t.toLowerCase();
    }

    function sync(val, fromPicker) {
      const normalized = normalizeHex(val);
      if (fromPicker) {
        hex.value = picker.value;
        onChange(picker.value);
      } else {
        if (normalized) { picker.value = normalized; onChange(normalized); }
        else { hex.value = picker.value; }
      }
    }

    picker.addEventListener("input", () => sync(picker.value, true));
    hex.addEventListener("input",   () => sync(hex.value, false));

    row.appendChild(label);
    row.appendChild(picker);
    row.appendChild(hex);
    host.appendChild(row);

    return { picker, hex, set(v) { picker.value = v; hex.value = v; } };
  }

  S.Panel?.registerSection({
    id: "colors",
    title: "Colors",
    async render(host) {
      const persisted = (await S.Settings?.get("colors")) || {};
      const state = { ...DEFAULTS, ...persisted };
      const handles = {};

      handles.boxBg     = makeRow(host, "boxBg",     "Box highlight",  state.boxBg,     (v) => { state.boxBg = v; commit(); });
      handles.boxBorder = makeRow(host, "boxBorder", "Box border",     state.boxBorder, (v) => { state.boxBorder = v; commit(); });
      handles.gradStart = makeRow(host, "gradStart", "Gradient start", state.gradStart, (v) => { state.gradStart = v; commit(); });
      handles.gradEnd   = makeRow(host, "gradEnd",   "Gradient end",   state.gradEnd,   (v) => { state.gradEnd   = v; commit(); });

      const btnRow = document.createElement("div");
      btnRow.className = "sstep-row";
      const resetBtn = document.createElement("button");
      resetBtn.className = "btn";
      resetBtn.textContent = "Reset to defaults";
      btnRow.appendChild(resetBtn);
      host.appendChild(btnRow);

      // Apply current
      S.applyColors && S.applyColors(state);

      let t;
      async function commit() {
        clearTimeout(t);
        t = setTimeout(async () => {
          await S.Settings?.set({ colors: { ...state } });
          S.applyColors && S.applyColors(state);
        }, 60);
      }

      resetBtn.onclick = async () => {
        Object.assign(state, DEFAULTS);
        handles.boxBg.set(state.boxBg);
        handles.boxBorder.set(state.boxBorder);
        handles.gradStart.set(state.gradStart);
        handles.gradEnd.set(state.gradEnd);
        S.applyColors && S.applyColors(state);
        await S.Settings?.set({ colors: { ...state } });
      };

      document.addEventListener("sstep:colorsChanged", (ev) => {
        const c = ev?.detail?.colors;
        if (!c) return;
        Object.assign(state, { ...DEFAULTS, ...c });
        handles.boxBg.set(state.boxBg);
        handles.boxBorder.set(state.boxBorder);
        handles.gradStart.set(state.gradStart);
        handles.gradEnd.set(state.gradEnd);
      });
    }
  });
})();
