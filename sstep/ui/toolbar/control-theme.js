// ui/toolbar/control-theme.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const Controls = (S.ToolbarControls = S.ToolbarControls || {});

  Controls.initTheme = function initTheme() {
    const slot = document.getElementById("sstep-theme-slot");
    if (!slot) return;

    const sel = document.createElement("select");
    sel.className = "select";
    sel.id = "sstep-theme";
    sel.title = "Highlight theme";
    sel.innerHTML = `
      <option value="box">Box</option>
      <option value="underline">Underline</option>
      <option value="none">No highlight</option>
      <option value="gradient-line">Line gradient (bg)</option>
      <option value="gradient-span">Sentence gradient (bg)</option>
      <option value="gradient-text-span">Sentence gradient (text)</option>
    `;
    slot.appendChild(sel);

    const saved = (() => { try { return localStorage.getItem("sstep-theme"); } catch { return null; } })() || "box";
    sel.value = saved;
    if (S.setTheme) S.setTheme(saved);

    sel.onchange = () => {
      const v = sel.value;
      try { localStorage.setItem("sstep-theme", v); } catch {}
      S.setTheme && S.setTheme(v);
    };
  };
})();
