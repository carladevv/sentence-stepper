// ui/toolbar/control-language.js
(() => {
  const S = (window.SStep = window.SStep || {});
  const Controls = (S.ToolbarControls = S.ToolbarControls || {});

  Controls.initLanguage = function initLanguage() {
    const slot = document.getElementById("sstep-lang-slot");
    if (!slot) return;

    const sel = document.createElement("select");
    sel.className = "select";
    sel.id = "sstep-lang";
    sel.title = "Sentence language";
    sel.innerHTML = `
      <option value="auto">Language: Auto</option>
      <option value="en">English (abbr.-aware)</option>
      <option value="zh">Chinese (。)</option>
      <option value="ja">Japanese (。)</option>
      <option value="hi">Indic (। ॥)</option>
      <option value="ur">Urdu/Arabic (۔ ؟)</option>
      <option value="my">Burmese (။)</option>
      <option value="km">Khmer (។ ៕)</option>
      <option value="bo">Tibetan (། ༎)</option>
      <option value="hy">Armenian (։)</option>
    `;
    slot.appendChild(sel);

    sel.value = S.langKey || "auto";
    sel.onchange = () => S.setLanguage && S.setLanguage(sel.value);
  };
})();
