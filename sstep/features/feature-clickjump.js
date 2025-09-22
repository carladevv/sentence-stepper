// features/clickjump.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = (S.state = S.state || {});

  const ClickJump = (S.ClickJump = S.ClickJump || {});

  ClickJump.attach = function attach(scope = (S.rootEl || document.body)) {
    if (ST.clickHandler) return;

    const handler = (e) => {
      // Left click only; ignore while a selection is active; ignore UI/inputs
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed) return;
      if (e.target.closest("#sstep-toolbar, .sstep-toolbar, a[href], button, input, textarea, select, [contenteditable='true']")) return;

      const span = e.target.closest(".sstep-sentence");
      if (!span || !scope.contains(span)) return;

      const idx = (ST.sentences || []).indexOf(span);
      if (idx >= 0) {
        e.preventDefault();
        S.focusIndex && S.focusIndex(idx, { scroll: true });
      }
    };

    scope.addEventListener("click", handler, true);
    ST.clickScope = scope;
    ST.clickHandler = handler;
    scope.classList.add("sstep-clickable");
  };

  ClickJump.detach = function detach() {
    const scope = ST.clickScope;
    if (scope && ST.clickHandler) {
      scope.removeEventListener("click", ST.clickHandler, true);
      scope.classList.remove("sstep-clickable");
    }
    ST.clickScope = null;
    ST.clickHandler = null;
  };

  // Back-compat aliases (so other code keeps working if it calls old names)
  S.enableClickToJump = ClickJump.attach;
  S.disableClickToJump = ClickJump.detach;
})();
