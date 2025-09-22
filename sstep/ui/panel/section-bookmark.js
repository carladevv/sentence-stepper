// ui/panel/sections/section-bookmark.js
(() => {
  const S = (window.SStep = window.SStep || {});

  S.Panel?.registerSection({
    id: "bookmark",
    title: "Bookmark",
    async render(host) {
      const wrap = document.createElement("div");
      wrap.className = "sstep-field";
      host.appendChild(wrap);

      const line = document.createElement("label");
      line.style.display = "flex";
      line.style.gap = "8px";
      line.style.alignItems = "center";

      const cb = document.createElement("input");
      cb.type = "checkbox";

      // default ON
      let enabled = true;
      try {
        const val = await S.Settings?.get("bookmarkEnabled");
        enabled = (val !== false);
      } catch {}
      cb.checked = enabled;

      const text = document.createElement("span");
      text.textContent = "Remember where I left off (per page)";

      cb.addEventListener("change", async () => {
        enabled = cb.checked;
        await S.Settings?.set({ bookmarkEnabled: enabled });
        S.Bookmark?.applyEnabled(enabled);
      });

      line.appendChild(cb);
      line.appendChild(text);
      wrap.appendChild(line);

      const note = document.createElement("div");
      note.className = "sstep-row";
      note.innerHTML = `<small>On by default. One bookmark per page. If the exact sentence no longer exists, you’ll start at the top.</small>`;
      host.appendChild(note);
    }
  });
})();
