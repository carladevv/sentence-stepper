// features/whats-new.js
(() => {
    const S = (window.SStep = window.SStep || {});

    // Toggle: show once EVER (true) vs once per version (false)
    const SHOW_ONCE_EVER = true;

    function getVersion() {
        try {
            const RT = (typeof browser !== "undefined" ? browser : chrome);
            return RT?.runtime?.getManifest?.().version || "";
        } catch { return ""; }
    }

    async function getSeenValue() {
        try { return await S.Settings?.get("whatsNewSeen"); }
        catch { return undefined; }
    }
    async function setSeenValue(v) {
        try { await S.Settings?.set({ whatsNewSeen: v }); } catch { }
    }

    // Detect Chrome vs Firefox
    function getPlatform() {
        try {
            const RT = (typeof browser !== "undefined" ? browser : chrome);
            const url = RT?.runtime?.getURL?.("") || "";
            if (url.startsWith("moz-extension://")) return "firefox";
            if (url.startsWith("chrome-extension://")) return "chrome";
        } catch { }
        if (typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent)) return "firefox";
        return "chrome";
    }

    // Paste your static store links here
    const RATE_CWS = "https://chromewebstore.google.com/detail/sentence-stepper/cfiappnihemjkaaepefjfofagcobikek";
    const RATE_AMO = "https://addons.mozilla.org/en-US/firefox/addon/sentence-stepper"; // ← replace when ready

    function buildRateLink() {
        return getPlatform() === "firefox" ? RATE_AMO : RATE_CWS;
    }
    function rateButtonText() {
        return getPlatform() === "firefox"
            ? "★★★★★  Rate on Firefox Add-ons"
            : "★★★★★  Rate on the Chrome Web Store";
    }

    // helper for packaged asset URLs
    function extURL(p) {
        try {
            // prefer browser if present, then chrome
            if (typeof browser !== "undefined" && browser.runtime?.getURL) {
                return browser.runtime.getURL(p);
            }
            if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
                return chrome.runtime.getURL(p);
            }
        } catch (e) {
            // Extension context invalidated (e.g., updated); fall through to return p
        }
        return p; // harmless fallback; img.onerror will remove if it can't load
    }


    function renderModal({ version }) {
        // Palette (match toolbar)
        const BG = "#f8fafc";
        const FG = "#111827";
        const BORDER = "#e5e7eb";
        const BTN_BG = "#eef2f7";
        const BTN_BG_HOVER = "#e3e9f1";
        const BTN_BORDER = "#d6dde7";
        const ACCENT = "#ffa74a";

        const overlay = document.createElement("div");
        overlay.id = "sstep-whatsnew";
        Object.assign(overlay.style, {
            position: "fixed", inset: "0", zIndex: "2147483647",
            background: "rgba(17,24,39,.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
        });

        const wrap = document.createElement("div");
        Object.assign(wrap.style, {
            background: BG, color: FG, width: "520px", maxWidth: "92vw",
            borderRadius: "12px", border: `1px solid ${BORDER}`,
            boxShadow: "0 18px 60px rgba(0,0,0,.28)",
            overflow: "hidden",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        });

        // Header with title + GOT IT (no bottom footer)
        const header = document.createElement("div");
        Object.assign(header.style, {
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderBottom: `1px solid ${BORDER}`,
        });
        const title = document.createElement("div");
        title.textContent = version
            ? `What's new in Sentence-Stepper v${version}`
            : "What’s new in Sentence-Stepper";
        Object.assign(title.style, { fontWeight: "600", fontSize: "14px", letterSpacing: ".01em" });

        const gotIt = document.createElement("button");
        gotIt.textContent = "Got it";
        Object.assign(gotIt.style, {
            all: "unset", color: FG,
            background: ACCENT, border: `1px solid ${BTN_BORDER}`,
            padding: "8px 12px", borderRadius: "8px", cursor: "pointer",
        });

        const body = document.createElement("div");
        Object.assign(body.style, { padding: "14px" });

        // Bold lead-in about Global Settings
        const p = document.createElement("div");
        p.textContent = `Customize your experience from the new 'Global Settings' ⚙ panel:`;
        Object.assign(p.style, { marginBottom: "8px", color: "#374151", fontSize: "13px", fontWeight: "600" });

        const ul = document.createElement("ul");
        Object.assign(ul.style, { margin: "8px 0 12px 18px", fontSize: "13px", lineHeight: "1.45" });
        [
            "Set a soft transition between sentences.",
            "Pick any custom colors.",
            "Remap prev/next to your custom hotkeys.",
            "Step by sentences (default) or whole paragraphs.",
            "Add a bookmark to pick up right where you left off (on by default).",
        ].forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });

        // Additional notes
        const p2 = document.createElement("div");
        p2.textContent = "Additionally:";
        Object.assign(p2.style, { margin: "6px 0 6px 0", color: "#374151", fontSize: "13px", fontWeight: "600" });

        const ul2 = document.createElement("ul");
        Object.assign(ul2.style, { margin: "6px 0 12px 18px", fontSize: "13px", lineHeight: "1.45" });
        [
            "You may now click-to-jump to any sentence.",
            "The bug concerning closing the addon has been fixed.",
            "The bug concerning lists has been fixed."
        ].forEach(t => { const li = document.createElement("li"); li.textContent = t; ul2.appendChild(li); });

        // Feature image (max 400px wide, auto height), centered
        const img = document.createElement("img");
        img.alt = "New features preview";
        img.src = extURL("images/new_features.PNG");
        Object.assign(img.style, {
            display: "block",
            maxWidth: "400px",
            width: "min(100%, 400px)",
            height: "auto",
            margin: "8px auto 0",
            borderRadius: "8px"
        });
        img.onerror = () => { img.remove(); };

        // Rate button (Chrome vs Firefox)
        const rate = document.createElement("a");
        rate.href = buildRateLink();
        rate.target = "_blank"; rate.rel = "noopener noreferrer";
        rate.textContent = rateButtonText();
        Object.assign(rate.style, {
            display: "block",
            margin: "10px auto 0",
            textDecoration: "none",
            color: FG, background: BTN_BG, border: `1px solid ${BTN_BORDER}`,
            padding: "8px 12px", borderRadius: "8px", width: "fit-content"
        });
        rate.onmouseenter = () => rate.style.background = BTN_BG_HOVER;
        rate.onmouseleave = () => rate.style.background = BTN_BG;

        // Ko-fi link (after rate)
        const kofi = document.createElement("a");
        kofi.href = "https://ko-fi.com/Z8Z61KT5MM";
        kofi.target = "_blank"; kofi.rel = "noopener noreferrer";
        kofi.textContent = "☕ Thank me with a Ko-Fi :)";
        Object.assign(kofi.style, {
            display: "block",
            margin: "8px auto 0",
            textDecoration: "none",
            color: FG, background: BTN_BG, border: `1px solid ${BTN_BORDER}`,
            padding: "8px 12px", borderRadius: "8px", width: "fit-content"
        });
        kofi.onmouseenter = () => kofi.style.background = BTN_BG_HOVER;
        kofi.onmouseleave = () => kofi.style.background = BTN_BG;

        function close() { overlay.remove(); }
        gotIt.addEventListener("click", close);

        header.appendChild(title);
        header.appendChild(gotIt);
        body.appendChild(p);
        body.appendChild(ul);
        body.appendChild(p2);
        body.appendChild(ul2);
        body.appendChild(img);     // image goes here
        body.appendChild(rate);    // then rate
        body.appendChild(kofi);    // then Ko-fi

        wrap.appendChild(header);
        wrap.appendChild(body);
        overlay.appendChild(wrap);
        document.documentElement.appendChild(overlay);

        overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); }, { once: true });

        return { overlay, close };
    }

    // Public API
    S.WhatsNew = {
        async maybeShow() {
            const seen = await getSeenValue();
            const ver = getVersion();

            if (SHOW_ONCE_EVER) {
                if (seen === true) return;
            } else {
                if (typeof seen === "string" && ver && seen === ver) return;
            }

            renderModal({ version: ver });

            const remember = async () => {
                await setSeenValue(SHOW_ONCE_EVER ? true : (ver || true));
            };
            const overlay = document.getElementById("sstep-whatsnew");
            overlay?.addEventListener("click", (e) => { if (e.target === overlay) remember(); });
            overlay?.querySelectorAll("button").forEach(btn => {
                btn.addEventListener("click", remember, { once: true });
            });
        },

        open() {
            try {
                renderModal({ version: getVersion() });
            } catch (e) {
                console.warn("[SStep] WhatsNew.open failed:", e);
                // Optional: show a minimal text-only modal instead of doing nothing
                try { renderModal({ version: "" }); } catch { }
            }
        }

    };
})();
