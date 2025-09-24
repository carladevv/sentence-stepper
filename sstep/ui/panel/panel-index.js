// ui/panel/panel-index.js
(() => {
  const S = (window.SStep = window.SStep || {});
  S.Panel = S.Panel || {};

  // internal registry (sections call registerSection before mount)
  const sections = [];
  S.Panel.registerSection = (def) => { if (def && def.id && def.render) sections.push(def); };

  function extURL(p) {
    const RT = (typeof browser !== "undefined" ? browser : chrome);
    return RT?.runtime?.getURL ? RT.runtime.getURL(p) : p;
  }

  S.Panel.mount = async function mount() {
    const host = document.getElementById("sstep-custom-pop");
    if (!host) return;

    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    while (root.firstChild) root.removeChild(root.firstChild);

    // Load CSS into shadow
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = extURL("sstep/styles/panel.css"); // keep your current path
    root.appendChild(link);

    // Frame
    const frame = document.createElement("div");
    frame.className = "ssp-pop";
    root.appendChild(frame);

    // Header (title only — no Close button)
    const header = document.createElement("div");
    header.className = "header";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "Global Settings";
    header.appendChild(title);
    frame.appendChild(header);

    // Body
    const body = document.createElement("div");
    body.className = "body";
    frame.appendChild(body);

    // Render sections
    for (const def of sections) {
      const sec = document.createElement("section");
      sec.className = "sec";
      sec.setAttribute("data-section", def.id); // CSS can target per-section
      body.appendChild(sec);

      if (def.title) {
        const h = document.createElement("div");
        h.className = "section-title";
        h.textContent = def.title;
        sec.appendChild(h);
      }

      const holder = document.createElement("div");
      holder.className = "sstep-field";
      sec.appendChild(holder);

      try {
        await def.render(holder);
      } catch (err) {
        const warn = document.createElement("div");
        warn.textContent = `Section "${def.id}" failed to render`;
        sec.appendChild(warn);
        console.warn("[SStep] Section render error:", def.id, err);
      }
    }
  };

  S.Panel.ensureMounted = function ensureMounted() {
    try { S.Panel.mount(); } catch (e) { console.warn("[SStep] Panel mount failed", e); }
  };
})();
