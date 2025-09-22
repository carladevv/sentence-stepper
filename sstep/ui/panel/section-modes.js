// ui/panel/sections/section-modes.js
(() => {
  const S = (window.SStep = window.SStep || {});

  function sanitize(mode) {
    return mode === "paragraphs" ? "paragraphs" : "sentences";
  }

  function broadcast(mode) {
    const ev = new CustomEvent("sstep:modeChanged", { detail: { mode } });
    document.dispatchEvent(ev);
  }

  S.Panel?.registerSection({
    id: "modes",
    title: "Stepping Mode",
    async render(host) {
      const stored = await S.Settings?.get("mode");
      let mode = sanitize(stored);
      // Migrate away from deprecated "group"
      if (stored && stored !== mode) {
        await S.Settings?.set({ mode });
      }

      const wrap = document.createElement("div");
      wrap.className = "sstep-field";
      host.appendChild(wrap);

      // Radio helper
      function addOption(val, label) {
        const line = document.createElement("label");
        line.style.display = "flex";
        line.style.gap = "8px";
        line.style.alignItems = "center";
        line.style.margin = "4px 0";

        const r = document.createElement("input");
        r.type = "radio";
        r.name = "sstep-mode";
        r.value = val;
        r.checked = (mode === val);

        const span = document.createElement("span");
        span.textContent = label;

        r.addEventListener("change", async () => {
          if (!r.checked) return;
          mode = sanitize(val);
          await S.Settings?.set({ mode });
          S.Spans?.setMode(mode);
          broadcast(mode);
        });

        line.appendChild(r);
        line.appendChild(span);
        wrap.appendChild(line);
      }

      addOption("sentences", "Sentence by sentence (default)");
      addOption("paragraphs", "Paragraph by paragraph");

      const note = document.createElement("div");
      note.className = "sstep-row";
      note.innerHTML = `<small>Switching mode rebuilds spans but keeps your place on the page.</small>`;
      host.appendChild(note);
    }
  });
})();

