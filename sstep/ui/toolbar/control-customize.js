// ui/toolbar/control-customize.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const Controls = (S.ToolbarControls = S.ToolbarControls || {});

  Controls.initCustomize = function initCustomize(barEl) {
    const btn  = document.getElementById("sstep-customize-btn");
    const pop  = document.getElementById("sstep-custom-pop");
    const gear = document.getElementById("sstep-gear-icon");

    const RT = (typeof browser !== "undefined" ? browser : chrome);
    const extURL = (p) => (RT?.runtime?.getURL ? RT.runtime.getURL(p) : p);

    if (gear) {
      gear.src = extURL("other-icons/gear.png");
      gear.style.width = "18px";
      gear.style.height = "18px";
      gear.style.display = "block";
    }
    if (!btn || !pop) return;

    // Ensure a dedicated scroll container inside the popover.
    // This lets the outer popover keep border-radius + overflow: hidden,
    // so the scrollbar never destroys the rounded corners.
    function getBody() {
      let body = pop.querySelector(".sstep-popover-body");
      if (!body) {
        body = document.createElement("div");
        body.className = "sstep-popover-body";
        pop.appendChild(body);
      }
      return body;
    }

    btn.addEventListener("click", () => {
      const wasHidden = !!pop.hidden;

      // close position popover if open
      const posPop = document.getElementById("sstep-pos-pop");
      if (posPop) posPop.hidden = true;

      if (wasHidden) {
        const body = getBody();
        if (typeof S.Panel?.renderTo === "function") {
          S.Panel.renderTo(body);
        } else if (typeof S.renderPanelOptions === "function") {
          // legacy fallback
          S.renderPanelOptions(body);
        }
      }

      // Flip based on toolbar position
      const mode = (barEl.className.match(/sstep-pos-(\w+)/) || [,"tr"])[1];
      pop.classList.toggle("flip-up", /^b/.test(mode));

      pop.hidden = !wasHidden;
      btn.setAttribute("aria-expanded", pop.hidden ? "false" : "true");
    });

    // Outside-click close
    document.addEventListener("mousedown", (e) => {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) {
        pop.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    }, true);
  };
})();
