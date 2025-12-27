// pdf-adapter.js
(() => {
  const S = (window.SStep = window.SStep || {});
 
  // ! Very basic.
  S.extractAllTextRuns = function extractAllTextRuns(pdfViewer) {
    const sentences = [];
    const currentPage = pdfViewer.currentPageNumber - 1;
    const page = pdfViewer.getPageView(currentPage);
    
    if (!page || !page.textLayer) {
      console.log('[SentenceStepper][PDF] No text layer detected.');
      return sentences;
    }

    const textLayer = page.textLayer;
    const textItems = textLayer.textContent?.items || []; 

    let currentSentence = '';
    for (const item of textItems) {
      const text = item.str;
      currentSentence += text;

      if (/[.!?]\s*$/.test(text)) {
        sentences.push(currentSentence.trim());
        currentSentence = '';
      } else {
        currentSentence += ' '; // Adds a space between words.
      }
    }

    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    console.log(`[SentenceStepper][PDF] Found ${sentences.length} sentences`);
    return sentences;
  };

  S.initPDFAdapter = async function initPDFAdapter() {
    if (!window.PDFViewerApplication) {
      console.warn('[SentenceStepper][PDF] PDFViewerApplication not found');
      return null;
    }

    const app = window.PDFViewerApplication;

    if (app.initializedPromise) {
      await app.initializedPromise;
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const pdfViewer = app.pdfViewer;
    console.log('[SentenceStepper][PDF] PDF viewer detected');
    
    const sentences = S.extractAllTextRuns(pdfViewer);
    console.log('[SentenceStepper][PDF] Sentences extracted:', sentences);

    pdfViewer.eventBus.on('pagesloaded', () => {
      console.log('[SentenceStepper][PDF] Page reloaded.');
      S.extractAllTextRuns(pdfViewer);
    });
    
    return sentences;
  };
})();