// ui/toolbar/control-position.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const Controls = (S.ToolbarControls = S.ToolbarControls || {});

  const POS_KEY = "sstep-pos-mode";
  const DEFAULT_POS = "tr"; // tl, tr, bl, br, tc, bc
  const POS_LABELS = {
    tl: "Top-left", tr: "Top-right", tc: "Top-center",
    bl: "Bottom-left", br: "Bottom-right", bc: "Bottom-center"
  };

  const RT = (typeof browser !== "undefined" ? browser : chrome);
  const extURL = (p) => (RT?.runtime?.getURL ? RT.runtime.getURL(p) : p);

  function isBottom(mode) { return mode && mode.startsWith("b"); }
  function updateFlipFor(pop, mode) { if (pop) pop.classList.toggle("flip-up", isBottom(mode)); }

  function loadPos() { try { return localStorage.getItem(POS_KEY) || DEFAULT_POS; } catch { return DEFAULT_POS; } }
  function savePos(mode) { try { localStorage.setItem(POS_KEY, mode); } catch {} }

  function applyPos(barEl, posPop, customPop, mode) {
    if (!barEl) return;
    barEl.classList.remove("sstep-pos-tl","sstep-pos-tr","sstep-pos-bl","sstep-pos-br","sstep-pos-tc","sstep-pos-bc");
    barEl.classList.add("sstep-pos-" + mode);
    updateFlipFor(posPop, mode);
    updateFlipFor(customPop, mode);
  }

  function buildPositionPopover(posPop, currentMode, onPick) {
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
      img.src = extURL(`pos-icons/pos-${m}.png`);
      img.alt = POS_LABELS[m];
      b.appendChild(img);
      if (m === currentMode) b.classList.add("active");
      b.onclick = () => onPick(m);
      posPop.appendChild(b);
    }
  }

  Controls.initPosition = function initPosition(bar) {
    const posBtn = document.getElementById("sstep-pos-btn");
    const posIcon = document.getElementById("sstep-pos-icon");
    const posPop = document.getElementById("sstep-pos-pop");
    const customPop = document.getElementById("sstep-custom-pop");

    function setPosButton(mode) {
      if (!posIcon || !posBtn) return;
      posIcon.src = extURL(`pos-icons/pos-${mode}.png`);
      posIcon.alt = POS_LABELS[mode] || mode;
      posBtn.title = POS_LABELS[mode] || mode;
    }

    let current = loadPos();
    applyPos(bar, posPop, customPop, current);
    setPosButton(current);
    buildPositionPopover(posPop, current, (m) => {
      savePos(m);
      applyPos(bar, posPop, customPop, m);
      setPosButton(m);
      posPop.hidden = true;
    });

    // open/close and outside-click
    if (posBtn) {
      posBtn.onclick = () => {
        current = loadPos();
        buildPositionPopover(posPop, current, (m) => {
          savePos(m);
          applyPos(bar, posPop, customPop, m);
          setPosButton(m);
          posPop.hidden = true;
        });
        updateFlipFor(posPop, current);
        posPop.hidden = !posPop.hidden;
        if (!posPop.hidden && customPop) customPop.hidden = true;
      };
    }

    document.addEventListener("mousedown", (e) => {
      if (posPop && !posPop.hidden && !posPop.contains(e.target) && !posBtn.contains(e.target)) posPop.hidden = true;
    }, true);

    // Back-compat (some modules may call this)
    S.setToolbarPos = function setToolbarPos(mode = DEFAULT_POS) {
      applyPos(bar, posPop, customPop, mode);
      setPosButton(mode);
      buildPositionPopover(posPop, mode, (m) => {
        savePos(m);
        applyPos(bar, posPop, customPop, m);
        setPosButton(m);
        posPop.hidden = true;
      });
    };
  };
})();
