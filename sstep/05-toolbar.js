(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = S.state;

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
    try { localStorage.setItem(POS_KEY, mode); } catch {}
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

  // compact API used by main.js
  S.setToolbarCompact = function setToolbarCompact(isCompact) {
    if (!barEl) return;
    barEl.classList.toggle("compact", !!isCompact);
    // close popover if compacted
    if (posPop) posPop.hidden = true;
  };

  function buildPositionPopover(currentMode) {
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

  S.addToolbar = function addToolbar() {
    if (document.getElementById("sstep-toolbar")) return;

    barEl = document.createElement("div");
    barEl.id = "sstep-toolbar";
    barEl.className = "sstep-toolbar";

    barEl.innerHTML = `
      <span class="brand">Sentence-Stepper</span>
      <button class="btn hide-when-compact" id="sstep-prev" title="Alt+Left">Prev</button>
      <button class="btn hide-when-compact" id="sstep-next" title="Alt+Right">Next</button>

      <select class="select hide-when-compact" id="sstep-theme" title="Highlight theme">
        <option value="box">Box</option>
        <option value="underline">Underline</option>
        <option value="none">No highlight</option>
        <option value="gradient-line">Line gradient (bg)</option>
        <option value="gradient-span">Sentence gradient (bg)</option>
        <option value="gradient-text-span">Sentence gradient (text)</option>
      </select>

      <select class="select hide-when-compact" id="sstep-lang" title="Sentence language">
        <option value="auto">Language: Auto</option>
        <option value="en">English (abbr.-aware)</option>
        <option value="zh">Chinese (。！？)</option>
        <option value="ja">Japanese (。！？)</option>
        <option value="hi">Indic (। ॥)</option>
        <option value="ur">Urdu/Arabic (۔ ؟)</option>
        <option value="my">Burmese (။)</option>
        <option value="km">Khmer (។ ៕)</option>
        <option value="bo">Tibetan (། ༎)</option>
        <option value="hy">Armenian (։)</option>
      </select>

      <!-- Position button + popover -->
      <button class="btn iconbtn hide-when-compact" id="sstep-pos-btn" title="Toolbar position">
        <img id="sstep-pos-icon" alt="" />
      </button>
      <div class="pos-popover hide-when-compact" id="sstep-pos-pop" hidden></div>

      <button class="btn" id="sstep-toggle" title="Toggle effect">On</button>
    `; // NOTE: initial label is "On" because clicking turns it on.

    document.documentElement.appendChild(barEl);

    // wire
    document.getElementById("sstep-prev").onclick = () => S.prev();
    document.getElementById("sstep-next").onclick = () => S.next();

    ST.toggleBtn = document.getElementById("sstep-toggle");
    ST.toggleBtn.onclick = () => {
      if (ST.enabled) {
        S.removeEffect(true);
        S.setToolbarCompact(true);
        try { localStorage.setItem("sstep-enabled", "false"); } catch {}
      } else {
        if (ST.sentences.length && document.querySelector(".sstep-sentence")) {
          ST.enabled = true; S.attachKeys(); S.focusIndex(ST.current); ST.toggleBtn.textContent = "Off";
        } else {
          S.applyEffect();
        }
        S.setToolbarCompact(false);
        try { localStorage.setItem("sstep-enabled", "true"); } catch {}
      }
    };

    const themeSel = document.getElementById("sstep-theme");
    const savedTheme = (() => { try { return localStorage.getItem("sstep-theme"); } catch { return null; } })() || "box";
    themeSel.value = savedTheme; S.setTheme(savedTheme);
    themeSel.onchange = () => S.setTheme(themeSel.value);

    const langSel = document.getElementById("sstep-lang");
    langSel.value = S.langKey;
    langSel.onchange = () => S.setLanguage(langSel.value);

    // Position UI
    posBtn = document.getElementById("sstep-pos-btn");
    posIcon = document.getElementById("sstep-pos-icon");
    posPop = document.getElementById("sstep-pos-pop");

    const current = loadPos();
    applyPos(current);
    setPosButton(current);
    buildPositionPopover(current);
    wireOutsideClose();

    posBtn.onclick = () => {
      const cur = loadPos();
      buildPositionPopover(cur);
      updatePopoverDirection(cur);
      posPop.hidden = !posPop.hidden;
    };

    // initial compact state follows ST.enabled (main sets this)
    S.setToolbarCompact(!ST.enabled);
  };
})();
