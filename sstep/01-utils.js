(() => {
  const S = (window.SStep = window.SStep || {});
  S.state = S.state || { sentences: [], current: 0, enabled: false, overlayEl: null, overlayRaf: 0, lastTextPaintIndex: -1 };

  // Sentence splitting helpers (kept here)
  S.escapeForCharClass = function (s) {
    return s.replace(/[-\\^\]]/g, "\\$&");
  };

  S.buildEndTester = function (profile) {
    const base = profile.includeDot ? ".!?…" : "!?…";
    const chars = base + (profile.extra || "");
    const re = new RegExp(
      `[${S.escapeForCharClass(chars)}](?:["'’”»）\\]])*(?:\\[[^\\]]*\\])?\\s*$`
    );
    return (slice) => re.test(slice);
  };
})();
