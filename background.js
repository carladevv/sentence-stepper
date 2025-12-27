// background.js — MV3 service worker (refactored injection order)
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
          try { S.removeEffect && S.removeEffect(false); } catch (e) { }
          try { S.unwrapAllSpans && S.unwrapAllSpans(); } catch (e) { }
          try { bar.remove(); } catch (e) { }
          return { state: "turned-off" };
        } else {
          // Scripts present but toolbar missing → turn ON
          try { (S.Toolbar?.mount ? S.Toolbar.mount : S.addToolbar) && (S.Toolbar?.mount ? S.Toolbar.mount() : S.addToolbar()); } catch (e) { }
          try { S.applyEffect && S.applyEffect(); } catch (e) { }
          return { state: "turned-on" };
        }
      }
    });
    toggle = res && res.result;
  } catch (e) { }

  if (toggle && (toggle.state === "turned-off" || toggle.state === "turned-on")) return;

  // 2) Not present → inject CSS and scripts in order, then enable
  const cssFiles = [
    "sstep/styles/base.css",
    "sstep/styles/themes.css",
    "sstep/styles/overlay.css",
    "sstep/styles/toolbar.css",
    "sstep/styles/popover.css",
    "sstep/styles/panel.css",
    "sstep/styles/transitions.css",
  ];
  try {
    for (const css of cssFiles) {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: [css] });
    }
  } catch (e) { }

  const files = [

    // Settings
    "sstep/settings/settings-storage.js",
    "sstep/settings/settings-detect-theme.js",
    "sstep/settings/settings-color-tuning.js",
    "sstep/settings/settings-apply.js",
    "sstep/settings/settings-index.js",

    // Core
    "Readability.js",
    "sstep/01-utils.js",
    "sstep/02-language.js",
    "sstep/03-dom.js",
    "sstep/04-overlay.js",

    // Utils
    "sstep/utils/utils-hotkeys.js",

    // Features
    "sstep/features/feature-hotkeys.js",
    "sstep/features/feature-clickjump.js",
    "sstep/features/feature-spans.js",
    "sstep/features/feature-bookmark.js",
    "sstep/features/feature-whats-new.js",

    // Panel (customization UI) + sections
    "sstep/ui/panel/panel-index.js",
    "sstep/ui/panel/section-transition.js",
    "sstep/ui/panel/section-colors.js",
    "sstep/ui/panel/section-modes.js",
    "sstep/ui/panel/section-hotkeys.js",
    "sstep/ui/panel/section-bookmark.js",

    // Toolbar shell + controls
    "sstep/ui/toolbar/toolbar-index.js",
    "sstep/ui/toolbar/control-position.js",
    "sstep/ui/toolbar/control-theme.js",
    "sstep/ui/toolbar/control-language.js",
    "sstep/ui/toolbar/control-customize.js",

    // Main stepping engine
    "sstep/05-main.js"
  ];

  for (const f of files) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [f] });
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const S = window.SStep;
      if (!S) return;
      try { (S.Toolbar?.mount ? S.Toolbar.mount : S.addToolbar) && (S.Toolbar?.mount ? S.Toolbar.mount() : S.addToolbar()); } catch (e) { }
      try { S.applyEffect && S.applyEffect(); } catch (e) { }
    }
  });
});
