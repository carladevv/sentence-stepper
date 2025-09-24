// ui/toolbar/index.js
(() => {
  const S = (window.SStep = window.SStep || {});
  S.Toolbar = S.Toolbar || {};

  function createShell() {
    if (document.getElementById("sstep-toolbar")) return document.getElementById("sstep-toolbar");

    const barEl = document.createElement("div");
    barEl.id = "sstep-toolbar";
    barEl.className = "sstep-toolbar";

    barEl.innerHTML = `
    <button id="sstep-help-btn" title="What’s new?" aria-label="What’s new">?</button>
      <span class="brand">Sentence-Stepper</span>
      
      <button class="btn" id="sstep-prev" title="Alt+Left">Prev</button>
      <button class="btn" id="sstep-next" title="Alt+Right">Next</button>

      <div class="sstep-group" id="sstep-theme-slot"></div>
      <div class="sstep-group" id="sstep-lang-slot"></div>

      <button class="btn iconbtn" id="sstep-customize-btn" title="Customize" aria-expanded="false">
        <img id="sstep-gear-icon" alt="Customize">
      </button>
      <div class="custom-popover" id="sstep-custom-pop" hidden></div>

      <button class="btn iconbtn" id="sstep-pos-btn" title="Toolbar position">
        <img id="sstep-pos-icon" alt="" />
      </button>
      <div class="pos-popover" id="sstep-pos-pop" hidden></div>

      <a class="btn iconbtn" id="sstep-kofi" href="https://ko-fi.com/Z8Z61KT5MM" target="_blank" rel="noopener noreferrer" title="Find the extension useful? Support development on Ko-Fi.">
        <img id="sstep-kofi-icon" alt="" />
      </a>
    `;

    document.documentElement.appendChild(barEl);
    return barEl;
  }

  function fmtCombo(c) {
    const norm = S.Hotkeys?.Utils?.normalizeComboString?.(c) || c || "";
    return norm.trim();
  }

  function setHotkeyTooltips(prevBtn, nextBtn, hk) {
    const fallback = S.Hotkeys?.state?.map || { next: "Alt+Right", prev: "Alt+Left" };
    const prev = fmtCombo((hk && hk.prev) || fallback.prev);
    const next = fmtCombo((hk && hk.next) || fallback.next);

    if (prevBtn) prevBtn.title = prev ? `Previous (${prev})` : "Previous";
    if (nextBtn) nextBtn.title = next ? `Next (${next})` : "Next";
  }

  S.Toolbar.mount = function mount() {
    const bar = createShell();

    const prevBtn = document.getElementById("sstep-prev");
    const nextBtn = document.getElementById("sstep-next");
    if (prevBtn) prevBtn.onclick = () => S.prev && S.prev();
    if (nextBtn) nextBtn.onclick = () => S.next && S.next();

    // What's new button
    const helpBtn = document.getElementById("sstep-help-btn");
    helpBtn?.addEventListener("click", () => S.WhatsNew?.open?.());

    // Initial + live hotkey tooltips
    (async () => {
      try {
        if (S.Settings?.get) {
          const hk = await S.Settings.get("hotkeys");
          setHotkeyTooltips(prevBtn, nextBtn, hk);
        } else {
          setHotkeyTooltips(prevBtn, nextBtn, S.Hotkeys?.state?.map);
        }
      } catch {
        setHotkeyTooltips(prevBtn, nextBtn, S.Hotkeys?.state?.map);
      }
    })();
    document.addEventListener("sstep:hotkeysChanged", (ev) => {
      const hk = ev?.detail?.hotkeys;
      setHotkeyTooltips(prevBtn, nextBtn, hk);
    });

    S.ToolbarControls = S.ToolbarControls || {};
    S.ToolbarControls.initPosition && S.ToolbarControls.initPosition(bar);
    S.ToolbarControls.initTheme && S.ToolbarControls.initTheme(bar);
    S.ToolbarControls.initLanguage && S.ToolbarControls.initLanguage(bar);
    S.ToolbarControls.initCustomize && S.ToolbarControls.initCustomize(bar);

    const RT = (typeof browser !== "undefined" ? browser : chrome);
    const extURL = (p) => (RT?.runtime?.getURL ? RT.runtime.getURL(p) : p);

    const kofiIcon = document.getElementById("sstep-kofi-icon");
    if (kofiIcon) {
      kofiIcon.src = extURL("other-icons/kofi.png");
      kofiIcon.style.width = "18px";
      kofiIcon.style.height = "18px";
      kofiIcon.style.display = "block";
    }

    const gearIcon = document.getElementById("sstep-gear-icon");
    if (gearIcon) gearIcon.style.pointerEvents = "none";

    S.addToolbar = S.Toolbar.mount;
  };
})();
