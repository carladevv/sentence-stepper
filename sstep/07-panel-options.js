// 07-panel-options.js
(() => {
  const S = (window.SStep = window.SStep || {});
  // Will be replaced next step with real fields + persistence.
  S.renderPanelOptions = function renderPanelOptions(host) {
    if (!host) return;
    host.innerHTML = `
      <div class="section-title">Appearance</div>
      <div class="sstep-field">
        <label>Theme</label>
        <div class="sstep-row"><em>Move Theme select and add custom colors here next.</em></div>
      </div>

      <div class="section-title">Behavior</div>
      <div class="sstep-field">
        <label>Modes</label>
        <div class="sstep-row"><em>Sentences / Group / Paragraph selector goes here.</em></div>
      </div>

      <div class="section-title">Shortcuts</div>
      <div class="sstep-field">
        <label>Hotkeys</label>
        <div class="sstep-row"><em>Custom hotkeys editor will live here.</em></div>
      </div>
    `;
  };
})();
