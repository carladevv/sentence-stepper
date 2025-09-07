(() => {
    const $ = s => document.querySelector(s);

    const elLayout = $("#layout");
    const elContent = $("#content");
    const elStatus = $("#status");
    const elOpen = $("#open-file");
    const elInput = $("#file-input");
    const elPrev = $("#prevPage");
    const elNext = $("#nextPage");
    const elLabel = $("#pageLabel");
    const elTheme = $("#themeToggle");
    const elJump = $("#pageJump");

    let pdfDoc = null;
    let pages = [];   // [{ el, pageNum }]
    let current = 1;   // 1-based
    const THEME_KEY = "sstep_viewer_theme";
    const PAGE_KEY = "sstep_viewer_current_page";

    // Default SStep toolbar position to bottom-right (extension origin only)
    try { localStorage.setItem("sstep-pos-mode", "br"); } catch { }

    // Theme init
    (function initTheme() {
        const saved = (localStorage.getItem(THEME_KEY) || "dark");
        document.documentElement.setAttribute("data-theme", saved);
        elTheme.textContent = saved === "dark" ? "Light" : "Dark";
    })();

    wireUI();
    const fileParam = new URLSearchParams(location.search).get("file");
    if (fileParam) openFromUrl(fileParam).catch(() => setStatus("Couldn’t fetch that PDF (CORS). Download & open it here.", true));

    function wireUI() {
        elOpen.onclick = () => elInput.click();
        elInput.onchange = async () => {
            const f = elInput.files?.[0];
            if (f) await openFromFile(f);
            elInput.value = "";
        };

        elPrev.onclick = () => showPage(current - 1);
        elNext.onclick = () => showPage(current + 1);

        // Keyboard: plain arrows = page nav; Alt+arrows = SStep (handled by addon)
        window.addEventListener("keydown", e => {
            if (e.altKey) return;
            if (e.key === "ArrowLeft") { e.preventDefault(); showPage(current - 1); }
            if (e.key === "ArrowRight") { e.preventDefault(); showPage(current + 1); }
        });

        // Theme toggle
        elTheme.onclick = () => {
            const cur = document.documentElement.getAttribute("data-theme") || "dark";
            const next = cur === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            elTheme.textContent = next === "dark" ? "Light" : "Dark";
            try { localStorage.setItem(THEME_KEY, next); } catch { }
        };

        // Go to page (Enter)
        elJump.addEventListener("keydown", e => {
            if (e.key !== "Enter") return;
            const n = parseInt(elJump.value, 10);
            if (Number.isFinite(n)) showPage(n);
            elJump.select();
        });

        // Build SStep toolbar immediately
        if (window.SStep) {
            window.SStep.addToolbar();
            window.SStep.setToolbarCompact(false);
            patchSStepPagingBridge();
        }
    }

    function setStatus(msg, warn = false) {
        elStatus.textContent = msg || "";
        elStatus.style.color = warn ? "#9c2f00" : "";
    }

    async function openFromUrl(u) {
        setStatus("Loading PDF…");
        const url = decodeURIComponent(u);
        pdfDoc = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
        await buildPagesFromPdf(pdfDoc);
        setStatus("");
    }

    async function openFromFile(file) {
        setStatus(`Opening ${file.name}…`);
        const buf = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
        await buildPagesFromPdf(pdfDoc);
        setStatus("");
    }

    async function waitForPDFExact(timeout = 8000) {
        if (window.PDFExact) return window.PDFExact;
        return new Promise((resolve, reject) => {
            let done = false;
            const to = setTimeout(() => {
                if (!done) { done = true; reject(new Error("PDFExact not loaded (timeout)")); }
            }, timeout);
            function onReady() {
                if (done) return;
                done = true; clearTimeout(to);
                window.removeEventListener("PDFExact:ready", onReady);
                resolve(window.PDFExact);
            }
            window.addEventListener("PDFExact:ready", onReady);
        });
    }

    // ---------- Build per-page HTML (EXACT mode: canvas + positioned text) ----------
    async function buildPagesFromPdf(doc) {
        try {
            console.log("[viewer] buildPagesFromPdf: start", { numPages: doc?.numPages });

            // Wait for the renderer module
            try {
                const P = await waitForPDFExact(10000);
                console.log("[viewer] PDFExact ready", { version: P?.version, debug: P?.debug });
            } catch (e) {
                console.error("[viewer] PDFExact wait failed:", e);
                setStatus("Facsimile module not loaded.", true);
                return;
            }

            // Clear UI
            elContent.innerHTML = "";
            pages = [];

            // EXACT mode: draw graphics + positioned text
            pages = await window.PDFExact.buildPages(
                doc,
                { container: elContent },
                {
                    textMode: "positioned",
                    renderGfx: true,
                    addAnnoLayer: false,
                    textOpacity: 1,
                    scale: 1
                }
            );

            console.log("[viewer] buildPagesFromPdf: done, pages=", pages.length);
            const saved = parseInt(localStorage.getItem(PAGE_KEY) || "1", 10);
            const target = Number.isFinite(saved) ? saved : 1;
            showPage(Math.min(Math.max(target, 1), pages.length), false);
        } catch (err) {
            console.error("[viewer] buildPagesFromPdf ERROR:", err);
            setStatus(`Error building pages: ${err?.message || err}`, true);
        }
    }


    function showPage(n, scroll = true) {
        if (!pages.length) return;
        n = Math.max(1, Math.min(n, pages.length));
        current = n;

        for (const p of pages) p.el.classList.remove("current");
        const curEl = pages[n - 1].el;
        curEl.classList.add("current");
        elLabel.textContent = `${n} / ${pages.length}`;
        try { localStorage.setItem(PAGE_KEY, String(n)); } catch { }

        // Scope stepper to this page and select first sentence WITHOUT re-centering the view
        if (window.SStep) {
            try { window.SStep.removeEffect(true); } catch { }
            const prevRoot = window.SStep.rootEl;
            try { window.SStep.rootEl = curEl; } catch { }
            window.SStep.applyEffect();

            try {
                const ST = window.SStep.state;
                if (ST && Array.isArray(ST.sentences) && ST.sentences.length) {
                    ST.current = 0;
                    // Apply the same classes as focusIndex(0) but don't call it (it scrolls to center)
                    ST.sentences.forEach(s => s.classList.remove("sstep-current", "sstep-muted"));
                    ST.sentences[0].classList.add("sstep-current");
                    for (let i = 1; i < ST.sentences.length; i++) ST.sentences[i].classList.add("sstep-muted");
                    window.SStep.scheduleOverlayUpdate?.();
                }
            } catch { }

            try { window.SStep.rootEl = prevRoot || null; } catch { }
        }

        // Hard-ensure page starts at the real top
        document.scrollingElement?.scrollTo?.({ top: 0, left: 0, behavior: scroll ? "smooth" : "auto" });
    }

    function patchSStepPagingBridge() {
        if (!window.SStep || window.SStep._viewerPatched) return;
        const S = window.SStep;
        const ST = S.state;

        const origNext = S.next?.bind(S);
        const origPrev = S.prev?.bind(S);
        if (!origNext || !origPrev || !ST) return;

        S.next = function () {
            const before = ST.current;
            origNext();
            if (ST.current === before && Array.isArray(ST.sentences) && before >= ST.sentences.length - 1) {
                if (current < pages.length) showPage(current + 1, false);
            }
        };

        S.prev = function () {
            const before = ST.current;
            origPrev();
            if (ST.current === before && before <= 0) {
                if (current > 1) {
                    showPage(current - 1, false);
                    // jump to last sentence on the new page
                    try {
                        const ST2 = S.state;
                        if (ST2 && Array.isArray(ST2.sentences) && ST2.sentences.length) {
                            ST2.current = ST2.sentences.length - 1;
                            // apply classes without centering
                            ST2.sentences.forEach(s => s.classList.remove("sstep-current", "sstep-muted"));
                            ST2.sentences[ST2.current].classList.add("sstep-current");
                            for (let i = 0; i < ST2.sentences.length - 1; i++) ST2.sentences[i].classList.add("sstep-muted");
                            S.scheduleOverlayUpdate?.();
                        }
                    } catch { }
                }
            }
        };

        S._viewerPatched = true;
    }
})();
