// background.js — MV3 service worker

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !/^https?:/i.test(tab.url || "")) return;

  // 1) Try to TOGGLE in-page if SStep is already injected
  let toggle = null;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const S = window.SStep;
        const bar = document.getElementById("sstep-toolbar");
        if (!S) return { state: "not-present" };

        if (bar) {
          // ON → turn OFF
          try { S.removeEffect && S.removeEffect(false); } catch (e) {}
          try { S.unwrapAllSpans && S.unwrapAllSpans(); } catch (e) {}
          try { bar.remove(); } catch (e) {}
          return { state: "turned-off" };
        } else {
          // Scripts present but toolbar missing → turn ON
          try { S.addToolbar && S.addToolbar(); } catch (e) {}
          try { S.applyEffect && S.applyEffect(); } catch (e) {}
          return { state: "turned-on" };
        }
      }
    });
    toggle = res && res.result;
  } catch (e) {
    // ignore; we'll inject below
  }

  if (toggle && (toggle.state === "turned-off" || toggle.state === "turned-on")) {
    return; // already toggled, done
  }

  // 2) Not present → inject CSS and scripts in order, then enable
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["styles.css"] // optional; ignore failure if your build doesn’t ship it
    });
  } catch (e) {}

  const files = [
    "Readability.js",
    "sstep/01-utils.js",
    "sstep/02-language.js",
    "sstep/03-dom.js",
    "sstep/04-overlay.js",
    "sstep/05-toolbar.js",
    "sstep/06-panel.js",
    "sstep/07-panel-options.js",
    "sstep/08-main.js"
  ];

  for (const f of files) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [f] });
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (window.SStep) {
        try { window.SStep.addToolbar(); } catch (e) {}
        try { window.SStep.applyEffect(); } catch (e) {}
      }
    }
  });
});
