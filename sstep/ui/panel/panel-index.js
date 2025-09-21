// ui/panel/customization-panel.js
(() => {
  const S = (window.SStep = window.SStep || {});

  const Panel = (S.Panel = S.Panel || {});
  Panel._sections = []; // array of { id, title, render(host) }

  Panel.registerSection = function registerSection(section) {
    if (!section || !section.id || !section.render) return;
    Panel._sections.push(section);
  };

  // Render all registered sections into a provided container (the toolbar popover)
  Panel.renderTo = function renderTo(host) {
    if (!host) return;
    host.replaceChildren();

    for (const sec of Panel._sections) {
      const wrap = document.createElement("section");
      wrap.dataset.section = sec.id;

      const title = document.createElement("div");
      title.className = "section-title";
      title.textContent = sec.title || sec.id;

      const field = document.createElement("div");
      field.className = "sstep-field";

      wrap.appendChild(title);
      wrap.appendChild(field);
      host.appendChild(wrap);

      try { sec.render(field); } catch (e) { console.error("[SStep] section render error:", sec.id, e); }
    }
  };

  // Legacy helper to render into older callsites
  S.renderPanelOptions = function renderPanelOptions(host) {
    Panel.renderTo(host);
  };

  // No side panel/backdrop in this version — the toolbar popover is the UI.
})();
