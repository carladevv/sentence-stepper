(() => {
  const S = (window.SStep = window.SStep || {});
  const ST = S.state || (S.state = { current: 0, sentences: [] });

  // ── Apply / remove (lifecycle only)
  S.applyEffect = async function () {
    if (ST.enabled) return;

    // Build spans for the page content
    S.Spans?.buildIfNeeded();
    if (!ST.sentences.length) return;

    ST.enabled = true;

    // Attach features
    S.Hotkeys?.init({ onNext: S.next, onPrev: S.prev });
    S.Hotkeys?.attach();

    S.ClickJump?.attach(S.rootEl || document.body);

    // Try to restore bookmark (sets ST.current if match found)
    if (S.Bookmark?.maybeRestore) {
      try { await S.Bookmark.maybeRestore(); } catch {}
    }

    // Initial focus (will also dispatch focusChanged)
    S.focusIndex(ST.current, { scroll: true });
  };

  S.removeEffect = function (keepPlace = true) {
    ST.sentences.forEach(s => {
      s.classList.remove("sstep-current", "sstep-muted");
      if (s.style && (s.style.color === "transparent" || s.style.webkitTextFillColor === "transparent")) {
        s.style.color = ""; s.style.webkitTextFillColor = "";
      }
    });

    ST.enabled = false;

    S.ClickJump?.detach();
    S.Hotkeys?.detach();

    S.clearOverlay && S.clearOverlay();
    if (ST.lastTextPaintIndex !== -1) {
      S.restoreSpanColor && S.restoreSpanColor(ST.sentences[ST.lastTextPaintIndex]);
      ST.lastTextPaintIndex = -1;
    }
    if (!keepPlace) ST.current = 0;
  };

  // ── Navigation
  S.focusIndex = function (i, opts = {}) {
    if (!ST.sentences.length) return;
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    ST.current = clamp(i, 0, ST.sentences.length - 1);

    ST.sentences.forEach(s => s.classList.remove("sstep-current", "sstep-muted"));
    if (!ST.enabled) return;

    const cur = ST.sentences[ST.current];
    cur.classList.add("sstep-current");
    ST.sentences.forEach((s, idx) => { if (idx !== ST.current) s.classList.add("sstep-muted"); });

    if (opts.scroll !== false) cur.scrollIntoView({ block: "center", behavior: "smooth" });
    S.scheduleOverlayUpdate && S.scheduleOverlayUpdate();

    // Notify listeners (Bookmark) with canonical text
    const text = (cur.textContent || "").replace(/\s+/g, " ").trim();
    document.dispatchEvent(new CustomEvent("sstep:focusChanged", {
      detail: { index: ST.current, text }
    }));
  };
  S.next = () => S.focusIndex((ST.current || 0) + 1);
  S.prev = () => S.focusIndex((ST.current || 0) - 1);

  // ── Events & boot
  const schedule = () => S.scheduleOverlayUpdate && S.scheduleOverlayUpdate();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  S.addToolbar && S.addToolbar();
})();
