// 05-toolbar.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = S.state || (S.state = { sentences: [], current: 0, enabled: false });

  // ---- position handling ----------------------------------------------------
  const POS_KEY = "sstep-pos-mode";
  const DEFAULT_POS = "tr"; // tl, tr, bl, br, tc, bc
  const POS_LABELS = {
    tl: "Top-left", tr: "Top-right", tc: "Top-center",
    bl: "Bottom-left", br: "Bottom-right", bc: "Bottom-center"
  };

  let barEl = null, posBtn = null, posIcon = null, posPop = null;

  // cross-browser runtime.getURL
  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const extURL = (p) => (RT?.runtime?.getURL ? RT.runtime.getURL(p) : p);

  function isBottom(mode) {
    return mode && mode.startsWith("b"); // bl, bc, br
  }
  function updatePopoverDirection(mode) {
    if (!posPop) return;
    posPop.classList.toggle("flip-up", isBottom(mode));
  }

  function loadPos() {
    try { return localStorage.getItem(POS_KEY) || DEFAULT_POS; }
    catch { return DEFAULT_POS; }
  }
  function savePos(mode) {
    try { localStorage.setItem(POS_KEY, mode); } catch { /* ignore */ }
  }
  function applyPos(mode) {
    if (!barEl) return;
    barEl.classList.remove("sstep-pos-tl", "sstep-pos-tr", "sstep-pos-bl", "sstep-pos-br", "sstep-pos-tc", "sstep-pos-bc");
    barEl.classList.add("sstep-pos-" + mode);
    updatePopoverDirection(mode);
  }

  function iconFor(mode) { return extURL(`pos-icons/pos-${mode}.png`); }
  function setPosButton(mode) {
    if (!posIcon || !posBtn) return;
    posIcon.src = iconFor(mode);
    posIcon.alt = POS_LABELS[mode] || mode;
    posBtn.title = POS_LABELS[mode] || mode;
  }

  function buildPositionPopover(currentMode) {
    if (!posPop) return;
    posPop.replaceChildren();
    const modes = ["tl", "tc", "tr", "bl", "bc", "br"];
    for (const m of modes) {
      const b = document.createElement("button");
      b.className = "pos-item";
      b.type = "button";
      b.dataset.mode = m;
      b.title = POS_LABELS[m];
      const img = document.createElement("img");
      img.decoding = "async";
      img.loading = "lazy";
      img.src = iconFor(m);
      img.alt = POS_LABELS[m];
      b.appendChild(img);
      if (m === currentMode) b.classList.add("active");
      b.onclick = () => {
        savePos(m); applyPos(m); setPosButton(m);
        posPop.hidden = true;
      };
      posPop.appendChild(b);
    }
  }

  function wireOutsideClose() {
    document.addEventListener("mousedown", (e) => {
      if (!posPop || posPop.hidden) return;
      if (!posPop.contains(e.target) && !posBtn.contains(e.target)) {
        posPop.hidden = true;
      }
    }, true);
  }

  // ---- public: add the toolbar ---------------------------------------------
  S.addToolbar = function addToolbar() {
    if (document.getElementById("sstep-toolbar")) return;

    barEl = document.createElement("div");
    barEl.id = "sstep-toolbar";
    barEl.className = "sstep-toolbar";

    barEl.innerHTML = `
      <span class="brand">Sentence-Stepper</span>

      <button class="btn" id="sstep-prev" title="Alt+Left">Prev</button>
      <button class="btn" id="sstep-next" title="Alt+Right">Next</button>

      <select class="select" id="sstep-theme" title="Highlight theme">
        <option value="box">Box</option>
        <option value="underline">Underline</option>
        <option value="none">No highlight</option>
        <option value="gradient-line">Line gradient (bg)</option>
        <option value="gradient-span">Sentence gradient (bg)</option>
        <option value="gradient-text-span">Sentence gradient (text)</option>
      </select>

      <select class="select" id="sstep-lang" title="Sentence language">
        <option value="auto">Language: Auto</option>
        <option value="en">English (abbr.-aware)</option>
        <option value="zh">Chinese (。)</option>
        <option value="ja">Japanese (。)</option>
        <option value="hi">Indic (। ॥)</option>
        <option value="ur">Urdu/Arabic (۔ ؟)</option>
        <option value="my">Burmese (။)</option>
        <option value="km">Khmer (។ ៕)</option>
        <option value="bo">Tibetan (། ༎)</option>
        <option value="hy">Armenian (։)</option>
      </select>

      <!-- Position button + popover -->
      <button class="btn iconbtn" id="sstep-pos-btn" title="Toolbar position">
        <img id="sstep-pos-icon" alt="" />
      </button>
      <div class="pos-popover" id="sstep-pos-pop" hidden></div>

      <!-- Customization panel button -->
      <button class="btn iconbtn" id="sstep-customize-btn" title="Customize (panel)" aria-haspopup="dialog" aria-expanded="false">
        <img id="sstep-gear-icon" alt="Customize">
      </button>

      <!-- Ko-fi button -->
      <a class="btn iconbtn" id="sstep-kofi" href="https://ko-fi.com/Z8Z61KT5MM" target="_blank" rel="noopener noreferrer" title="Support on Ko-fi">
        <img id="sstep-kofi-icon" alt="" />
      </a>
    `;

    document.documentElement.appendChild(barEl);

    // wire core buttons
    const prevBtn = document.getElementById("sstep-prev");
    const nextBtn = document.getElementById("sstep-next");
    if (prevBtn) prevBtn.onclick = () => S.prev && S.prev();
    if (nextBtn) nextBtn.onclick = () => S.next && S.next();

    // theme
    const themeSel = document.getElementById("sstep-theme");
    const savedTheme = (() => { try { return localStorage.getItem("sstep-theme"); } catch { return null; } })() || "box";
    if (themeSel) {
      themeSel.value = savedTheme;
      if (S.setTheme) S.setTheme(savedTheme);
      themeSel.onchange = () => S.setTheme && S.setTheme(themeSel.value);
    }

    // language
    const langSel = document.getElementById("sstep-lang");
    if (langSel) {
      langSel.value = S.langKey || "auto";
      langSel.onchange = () => S.setLanguage && S.setLanguage(langSel.value);
    }

    // position UI
    posBtn = document.getElementById("sstep-pos-btn");
    posIcon = document.getElementById("sstep-pos-icon");
    posPop = document.getElementById("sstep-pos-pop");

    const current = loadPos();
    applyPos(current);
    setPosButton(current);
    buildPositionPopover(current);
    wireOutsideClose();

    if (posBtn) {
      posBtn.onclick = () => {
        const cur = loadPos();
        buildPositionPopover(cur);
        updatePopoverDirection(cur);
        posPop.hidden = !posPop.hidden;
      };
    }

    // customization panel (delegates to S.Panel)
    const gearBtn = barEl.querySelector("#sstep-customize-btn");
    const gearIcon = barEl.querySelector("#sstep-gear-icon");
    if (gearIcon) {
      gearIcon.src = extURL("other-icons/gear.png");
      gearIcon.style.width = "18px";
      gearIcon.style.height = "18px";
      gearIcon.style.display = "block";
    }
    if (gearBtn) {
      gearBtn.addEventListener("click", () => {
        if (!window.SStep.Panel) return;   // safe if files load out of order
        window.SStep.Panel.ensure();       // ensure shell exists
        window.SStep.Panel.toggle();       // open/close
      });
    }

    // Ko-fi icon
    const kofiIcon = document.getElementById("sstep-kofi-icon");
    if (kofiIcon) {
      kofiIcon.src = extURL("other-icons/kofi.png");
      kofiIcon.style.width = "18px";
      kofiIcon.style.height = "18px";
      kofiIcon.style.display = "block";
    }
  };
})();
