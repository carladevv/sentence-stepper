
(() => {
    const S = (window.SStep = window.SStep || {});

    S.PDFContentType = function PDFContentType() {
        return { type: 'PDF' };
    };

    S.HTMLContentType = function HTMLContentType() {
        return { type: 'HTML' };
    };

    S.detectFireFoxPDFViewer = function detectFireFoxPDFViewer() {
        const base = document.querySelector('base[href^="resource://pdf.js"]');
        if (base) {
            return S.PDFContentType();
        }
        return null;
    };

    S.detectContentType = function detectContentType() {
        return (
            S.detectFireFoxPDFViewer() ||
            S.HTMLContentType()
        );
    };
})();
