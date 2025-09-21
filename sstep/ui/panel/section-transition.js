// ui/panel/sections/section-transition.js
(() => {
  const S = (window.SStep = window.SStep || {});

  S.Panel?.registerSection({
    id: "transition",
    title: "Transition Speed",
    render(host) {
      host.innerHTML = `
        <div class="sstep-row">
          <input id="sstep-trans-slider" type="range" min="0" max="1" step="0.1" value="0" />
          <span id="sstep-trans-label">0.0s</span>
        </div>
        <div class="sstep-row">
          <small>Controls how quickly highlights fade in and out as you step. 'Zero' removes the fade effect.</small>
        </div>
      `;

      const slider = host.querySelector("#sstep-trans-slider");
      const label  = host.querySelector("#sstep-trans-label");
      if (!slider || !label) return;

      function syncUI(ms) {
        const secs = Math.round((Number(ms) || 0) / 100) / 10; // ms → one decimal seconds
        slider.value = String(secs);
        label.textContent = `${secs.toFixed(1)}s`;
      }

      (async () => {
        const ms = await S.Settings?.get("transitionMs");
        syncUI(ms);
        S.applyTransitionMs && S.applyTransitionMs(ms);
      })();

      slider.addEventListener("input", () => {
        const s = Number(slider.value) || 0;
        label.textContent = `${s.toFixed(1)}s`;
        S.applyTransitionMs && S.applyTransitionMs(Math.round(s * 1000));
      });
      slider.addEventListener("change", async () => {
        const s = Number(slider.value) || 0;
        await S.Settings?.set({ transitionMs: Math.round(s * 1000) });
      });

      // Reflect external changes (other tabs)
      document.addEventListener("sstep:transitionMs", (ev) => {
        const ms = ev?.detail?.ms;
        syncUI(ms);
      });
    }
  });
})();
