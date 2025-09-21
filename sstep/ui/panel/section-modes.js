// ui/panel/sections/section-modes.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const DEFAULT_MODE = "sentences"; // "sentences" | "paragraphs" | "group"

  function broadcast(mode) {
    const ev = new CustomEvent("sstep:modeChanged", { detail: { mode } });
    document.dispatchEvent(ev);
  }

  S.Panel?.registerSection({
    id: "modes",
    title: "Stepping Mode",
    async render(host) {
      const cur = (await S.Settings?.get("mode")) || DEFAULT_MODE;

      host.innerHTML = `
        <div role="radiogroup" aria-label="Stepping mode" class="sstep-field">
          <label class="sstep-row"><input type="radio" name="sstep-mode" value="sentences"> Sentences</label>
          <label class="sstep-row"><input type="radio" name="sstep-mode" value="paragraphs"> Paragraphs</label>
          <label class="sstep-row"><input type="radio" name="sstep-mode" value="group"> Group short sentences</label>
        </div>
        <div class="sstep-row">
          <small>Choose how the stepper advances. “Group” merges very short sentences into their neighbor.</small>
        </div>
      `;

      // set initial
      const radios = host.querySelectorAll('input[name="sstep-mode"]');
      radios.forEach(r => { if (r.value === cur) r.checked = true; });

      radios.forEach(r => {
        r.addEventListener("change", async () => {
          if (!r.checked) return;
          const mode = r.value;
          await S.Settings?.set({ mode });
          broadcast(mode);
        });
      });

      // reflect external changes
      document.addEventListener("sstep:modeChanged", (ev) => {
        const m = ev?.detail?.mode || DEFAULT_MODE;
        radios.forEach(r => r.checked = (r.value === m));
      });
    }
  });
})();
