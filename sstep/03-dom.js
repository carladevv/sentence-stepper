(() => {
  const S = (window.SStep = window.SStep || {});

  S.pickMainRoot = function pickMainRoot() {
    const candidates = [
      "#mw-content-text", ".mw-parser-output", "[role='main']", "main", "article",
      "#content", ".content", ".post", ".entry", ".article-body", ".story-body", ".post-content"
    ].flatMap(sel => Array.from(document.querySelectorAll(sel)));
    const byLen = el => (el.innerText || "").trim().length;
    let best = candidates.sort((a,b)=>byLen(b)-byLen(a))[0];
    if (!best) {
      const scan = Array.from(document.querySelectorAll("main, article, #content, .content, body"));
      best = scan.sort((a,b)=>byLen(b)-byLen(a))[0] || document.body;
    }
    return best;
  };

  S.findFirstContentP = function findFirstContentP(root) {
    const isTiny = p => (p.innerText || "").trim().length < 80;
    const skipSel = "header,nav,footer,aside,.infobox,.thumb,.thumbcaption,.hatnote,.shortdescription,.metadata,.toc,.sidebar,.breadcrumbs";
    const ps = Array.from(root.querySelectorAll("p"));
    return ps.find(p => !isTiny(p) && !p.closest(skipSel)) || null;
  };

  S.normalizeStructure = function normalizeStructure(root) {
    root.normalize();
    root.querySelectorAll("br").forEach(br => br.replaceWith(" "));
  };

  function atOrAfter(node, anchor) {
    if (!anchor) return true;
    return anchor.contains(node) || !!(anchor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  S.collectBlocks = function collectBlocks(root, startAt) {
    const blockSel = "p, li, dd, blockquote";
    const excludeSel = "header,nav,footer,aside,.infobox,.thumb,.thumbcaption,.hatnote,.shortdescription,.metadata,.toc,.sidebar,.breadcrumbs,.mw-editsection,table,figcaption,caption,ol.references,.reflist";
    return Array.from(root.querySelectorAll(blockSel))
      .filter(b => !b.closest(excludeSel) && atOrAfter(b, startAt))
      .filter(b => (b.innerText || "").trim().length > 1);
  };

  S.collectTextNodesIn = function collectTextNodesIn(block) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (/SCRIPT|STYLE|NOSCRIPT|IFRAME|SVG|CODE|PRE/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest("sup.reference, .reference")) return NodeFilter.FILTER_REJECT;
        const t = n.nodeValue ?? "";
        return t.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const out = [];
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  };

  S.buildIndexMap = function buildIndexMap(textNodes) {
    let offset = 0;
    return textNodes.map(n => {
      const start = offset, len = n.nodeValue.length;
      offset += len;
      return { node: n, start, end: start + len };
    });
  };

  S.findPos = function findPos(index, map) {
    let lo = 0, hi = map.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, m = map[mid];
      if (index < m.start) hi = mid - 1;
      else if (index >= m.end) lo = mid + 1;
      else return { node: m.node, offset: index - m.start };
    }
    return null;
  };
})();
