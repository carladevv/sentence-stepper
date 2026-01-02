# **Sentence-Stepper**

Sentence-Stepper is a lightweight accessibility-focused browser extension for Firefox and Chrome that lets users **step through on-page text one sentence at a time**, dimming surrounding content to reduce cognitive load and improve reading focus.

Designed for smooth, distraction-free reading, Sentence-Stepper works directly on standard web pages and dynamically adapts to different languages, layouts, and document structures. It emphasizes **polish, responsiveness, and low-friction interaction**.

<div align="center">

### Chrome Extension
[![Install from Chrome Web Store](https://img.shields.io/badge/Install_Chrome-Extension-blue?logo=google-chrome&logoColor=white&style=for-the-badge)](https://chromewebstore.google.com/detail/sentence-stepper/cfiappnihemjkaaepefjfofagcobikek)

### Firefox Add-on
[![Install from Firefox Add-ons](https://img.shields.io/badge/Install_Firefox-Add_on-orange?logo=firefox-browser&logoColor=white&style=for-the-badge)](https://addons.mozilla.org/en-US/firefox/addon/sentence-stepper/)

</div>

---

## **🖼️ What It Does**
- **Sentence-by-sentence navigation:** Step forward and backward through detected sentences using buttons or keyboard shortcuts
- **Visual focus mode:** Highlights the current sentence while dimming surrounding text
- **Language-aware segmentation:** Uses `Intl.Segmenter` with custom heuristics to handle abbreviations, acronyms, and non-Latin punctuation
- **Toolbar with quick controls:** Access navigation, language selection, theme, and customization from a floating toolbar
- **Positionable UI:** Move the toolbar to six screen positions (top/bottom × left/center/right)
- **Theme options:** Box, underline, gradient, or minimal highlighting styles
- **Click-to-jump:** Click any sentence to jump focus directly to it
- **Performance-conscious:** Minimal DOM mutation, no page reloads, and clean teardown when disabled

---

## **📂 Repository Structure**
```bash
icons/                     # Extension identity icons (manifest)

assets/
├── ui-icons/              # Toolbar & UI icons
└── images/                # Screenshots and documentation images

sstep/                     # Core Sentence-Stepper logic
├── features/              # Modular feature logic
├── settings/              # Persistent user settings & sync
├── styles/                # Core styling injected into pages
├── ui/                    # Floating toolbar & customization panel
├── 01-utils.js            # Shared helpers & regex utilities
├── 02-language.js         # Language profiles & sentence boundary logic
├── 03-dom.js              # DOM traversal & sentence span construction
├── 04-overlay.js          # Visual overlay & gradient rendering
└── 05-main.js             # Core state, navigation, and lifecycle

background.js              # MV3 background script
manifest.json              # Extension manifest
```

---

## **🛠️ Tech Stack**
- **Platform:** Firefox & Chromium-based browsers (Manifest V3)
- **Language:** Vanilla JavaScript (no framework)
- **Text segmentation:** `Intl.Segmenter` with custom fallback heuristics
- **UI:** DOM-based toolbar + lightweight CSS
- **State:** In-memory state + `localStorage` / extension storage
- **Accessibility:** Focus-driven reading, reduced visual noise, keyboard-first navigation

---

## **▶️ Local Development**
```bash
# Firefox
about:debugging#/runtime/this-firefox
→ Load Temporary Add-on → select manifest.json

# Chrome
chrome://extensions
→ Enable Developer Mode → Load unpacked → select repo folder
```

> **Note:** Sentence-Stepper injects scripts only into active HTTP(S) tabs when explicitly activated via the toolbar icon.

---

## **📌 Project Status**
Sentence-Stepper is actively maintained and focused on **web page reading**.

A third-party plugin for the **Calibre EPUB reader** is currently under development.



