// 06-panel.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const extURL = (p) => (RT?.runtime?.getURL ? RT.runtime.getURL(p) : p);

  function ensurePanelOnce() {
    let back = document.getElementById("sstep-panel-backdrop");
    let panel = document.getElementById("sstep-panel");
    if (!back) {
      back = document.createElement("div");
      back.id = "sstep-panel-backdrop";
      back.className = "sstep-panel-backdrop";
      back.setAttribute("aria-hidden", "true");
      document.body.appendChild(back);
    }
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "sstep-panel";
      panel.className = "sstep-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-hidden", "true");
      panel.innerHTML = `
        <header>
          <h2 id="sstep-panel-title">Customize</h2>
          <button class="closebtn" id="sstep-panel-close" title="Close">✕</button>
        </header>
        <div class="content" id="sstep-panel-content" tabindex="0"></div>
      `;
      document.body.appendChild(panel);
    }
    // (Re)ask options module to (re)render content
    if (typeof S.renderPanelOptions === "function") {
      S.renderPanelOptions(document.getElementById("sstep-panel-content"));
    }
    // wire close
    const closeBtn = document.getElementById("sstep-panel-close");
    if (closeBtn && !closeBtn._sstep_wired) {
      closeBtn._sstep_wired = true;
      closeBtn.addEventListener("click", closePanel);
    }
    return { back, panel };
  }

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); closePanel(); }
    if (e.key === "Tab") {
      const panel = document.getElementById("sstep-panel");
      if (!panel) return;
      const f = panel.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function onOutside(e) {
    const back = document.getElementById("sstep-panel-backdrop");
    if (back && back.contains(e.target)) { e.preventDefault(); e.stopPropagation(); closePanel(); }
  }

  function openPanel() {
    const { back, panel } = ensurePanelOnce();
    panel.setAttribute("aria-hidden", "false");
    back.setAttribute("aria-hidden", "false");
    const close = document.getElementById("sstep-panel-close");
    const content = document.getElementById("sstep-panel-content");
    (close || content || panel).focus();
    document.addEventListener("keydown", onKey, true);
    setTimeout(() => document.addEventListener("click", onOutside, true), 0);
    const gearBtn = document.getElementById("sstep-customize-btn");
    if (gearBtn) gearBtn.setAttribute("aria-expanded", "true");
  }
  function closePanel() {
    const back = document.getElementById("sstep-panel-backdrop");
    const panel = document.getElementById("sstep-panel");
    if (!back || !panel) return;
    panel.setAttribute("aria-hidden", "true");
    back.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("click", onOutside, true);
    const gearBtn = document.getElementById("sstep-customize-btn");
    if (gearBtn) gearBtn.setAttribute("aria-expanded", "false");
    if (gearBtn) gearBtn.focus();
  }
  function togglePanel() {
    const panel = document.getElementById("sstep-panel");
    const hidden = panel?.getAttribute("aria-hidden") !== "false";
    hidden ? openPanel() : closePanel();
  }

  S.Panel = { open: openPanel, close: closePanel, toggle: togglePanel, ensure: ensurePanelOnce };
})();
