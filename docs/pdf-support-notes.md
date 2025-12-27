# PDF Support

I believe a good basis for the project can be the [Hypothesis](https://github.com/hypothesis/browser-extension) extension. 

* Extension logic: https://github.com/hypothesis/browser-extension/tree/main
* Client: https://github.com/hypothesis/client/tree/main/src

There seem to be two main components to how Hypothesis deals with pdfs: `pdf.js` in the extension repo, and `pdf.ts` in the client repo.

```txt
browser-extension repo
│
├── detects content type
├── decides injection strategy
├── loads client bundle
│
└── client repo
     ├── inspects DOM
     ├── reads PDF text layer
     ├── anchors highlights
     └── draws overlays

```

**Tangential**, but the way the extension and the client are separated is kind of interesting and the way the connection is made from browser-extension repo to the client repo is worth investigating. Since the extension repo is just a wrapper for the client repo, it has to be linked somewhere.

The client repository needs to be built beforehand and 

```txt
yarn link ../client
```

```json
"web_accessible_resources": [
    {
      "resources": [
        "client/*",
        "help/*",
        "pdfjs/*",
        "pdfjs/web/viewer.html"
      ],
      "matches": ["<all_urls>"]
    }
  ]
```



Below is some relevant snippets and annotated code from both repos that could be useful in developing PDF support for Sentence Stepper:


```ts
// browser-extension/src/background/detect-content-type.ts

export type PDFContentType = { type: 'PDF' };

export type HTMLContentType = { type: 'HTML' };

export type ContentTypeInfo = PDFContentType | HTMLContentType;

... function detectChromePDFViewer(): PDFContentType | null {...}

 // When viewing a PDF in Chrome, the viewer consists of a top-level
    // document with an <embed> tag, which in turn instantiates an inner HTML
    // document providing the PDF viewer UI plus another <embed> tag which
    // instantiates the native PDF renderer.
    //
    // The selector below matches the <embed> tag in the top-level document. To
    // see this document, open the developer tools from Chrome's menu rather
    // than right-clicking on the viewport and selecting the 'Inspect' option
    // which will instead show the _inner_ document.

... function detectFirefoxPDFViewer(): PDFContentType | null {...}

// The Firefox PDF viewer is an instance of PDF.js.
   //
    // The Firefox PDF plugin specifically can be detected via the <base>
    // tag it includes, which can be done from a content script (which runs
    // in an isolated JS world from the page's own scripts).
    //
    // Generic PDF.js detection can be done by looking for the
    // `window.PDFViewerApplication` object. This however requires running JS
    // code in the same JS context as the page's own code.

```

**Tangential**, but it would probably be useful to include something like this as well. 

```ts
// browser-extension/src/background/url-info.ts

const BLOCKED_HOSTNAMES = new Set([
	'facebook.com',
	'www.facebook.com',
	'mail.google.com',
]);

```

```ts
// client/src/anchoring/pdf.ts

...
import type {
  PDFPageProxy,
  PDFPageView,
  PDFViewer,
  TextLayer,
} from '../../types/pdfjs';
...

// !Get the PDF.js viewer application.
function getPDFViewer(): PDFViewer {
  // @ts-ignore - TS doesn't know about PDFViewerApplication global.
  return PDFViewerApplication.pdfViewer;
}

```