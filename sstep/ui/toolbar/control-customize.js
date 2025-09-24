// ui/toolbar/control-customize.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const Controls = (S.ToolbarControls = S.ToolbarControls || {});

  Controls.initCustomize = function initCustomize(barEl) {
    const btn  = document.getElementById("sstep-customize-btn");
    const pop  = document.getElementById("sstep-custom-pop");
    const gear = document.getElementById("sstep-gear-icon");

    // --- start CLOSED on load ---
    if (pop) pop.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");

    // gear icon setup (no extra click target)
    const RT = (typeof browser !== "undefined" ? browser : chrome);
    const extURL = (p) => (RT?.runtime?.getURL ? RT.runtime.getURL(p) : p);
    if (gear) {
      gear.src = extURL("other-icons/gear.png");
      gear.style.width = "18px";
      gear.style.height = "18px";
      gear.style.display = "block";
      gear.style.pointerEvents = "none"; // avoid double-toggle via icon
    }
    if (!btn || !pop) return;

    // Toggle on click
    btn.addEventListener("click", () => {
      const opening = pop.hidden;

      // close the position popover if open
      const posPop = document.getElementById("sstep-pos-pop");
      if (posPop) posPop.hidden = true;

      if (opening) {
        // build Shadow UI once, on first open
        S.Panel?.ensureMounted?.();
      }

      // Flip based on toolbar position class
      const mode = (barEl.className.match(/sstep-pos-(\w+)/) || [, "tr"])[1];
      pop.classList.toggle("flip-up", /^b/.test(mode));

      pop.hidden = !opening;
      btn.setAttribute("aria-expanded", opening ? "true" : "false");
    });

    // Outside-click to close
    document.addEventListener("mousedown", (e) => {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) {
        pop.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    }, true);
  };
})();

