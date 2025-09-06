chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:/.test(tab.url || "")) return;

  // Inject your CSS first (once is cheap/safe)
  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["styles.css"]
  });

  // Inject your scripts in order
  const files = [
    "Readability.js",
    "sstep/01-utils.js",
    "sstep/02-language.js",
    "sstep/03-dom.js",
    "sstep/04-overlay.js",
    "sstep/05-toolbar.js",
    "sstep/06-main.js"
  ];
  for (const f of files) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [f]
    });
  }
});
