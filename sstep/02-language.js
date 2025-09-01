(() => {
  const S = (window.SStep = window.SStep || {});

  // Language profiles
  S.LANG_PROFILES = {
    auto: { key: "auto", locale: undefined, includeDot: true, extra: "。！？۔؟।॥։။។៕།༎።" },
    zh: { key: "zh", locale: "zh", includeDot: false, extra: "。！？…" },
    ja: { key: "ja", locale: "ja", includeDot: false, extra: "。！？…" },
    ur: { key: "ur", locale: "ur", includeDot: false, extra: "۔؟!" },
    hi: { key: "hi", locale: "hi", includeDot: false, extra: "।॥" },
    my: { key: "my", locale: "my", includeDot: false, extra: "။" },
    km: { key: "km", locale: "km", includeDot: false, extra: "។៕" },
    bo: { key: "bo", locale: "bo", includeDot: false, extra: "།༎" },
    hy: { key: "hy", locale: "hy", includeDot: false, extra: "։" },
    en: { key: "en", locale: "en", includeDot: true, extra: "!?…" }
  };

  function inferDefaultLang() {
    try { const saved = localStorage.getItem("sstep-lang"); if (saved) return saved; } catch {}
    const lang = (document.documentElement.lang || "").toLowerCase();
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("ja")) return "ja";
    if (lang.startsWith("hi") || lang.startsWith("mr") || lang.startsWith("sa") || lang.startsWith("ne") || lang.startsWith("bn")) return "hi";
    if (lang.startsWith("ur") || lang.startsWith("ar")) return "ur";
    if (lang.startsWith("my")) return "my";
    if (lang.startsWith("km")) return "km";
    if (lang.startsWith("bo")) return "bo";
    if (lang.startsWith("hy")) return "hy";
    return "en"; // default to English (abbr-aware)
  }

  S.langKey = inferDefaultLang();
  S.setLanguage = function setLanguage(key) {
    S.langKey = S.LANG_PROFILES[key] ? key : "auto";
    try { localStorage.setItem("sstep-lang", S.langKey); } catch {}
    S.hardRebuildKeepingScroll(); // defined in main
  };
  S.currentProfile = function currentProfile() {
    return S.LANG_PROFILES[S.langKey] || S.LANG_PROFILES.auto;
  };

  // ----- English abbreviation logic (case-aware + patterns) -----
  const EN_ABBREV_CASED = new Set([
    "Mr.","Mrs.","Ms.","Dr.","Prof.","Rev.","Hon.","Gen.","Col.","Capt.","Lt.","Sgt.","Cmdr.","Sen.","Rep.","Gov.",
    "St.","Mt.","Rd.","Ave.","Blvd.","No.","Fig.","Eq.","Ch.","Dept.","Univ.","Jr.","Sr.",
    "Jan.","Feb.","Mar.","Apr.","Jun.","Jul.","Aug.","Sep.","Sept.","Oct.","Nov.","Dec.",
    "Mon.","Tue.","Tues.","Wed.","Thu.","Thur.","Thurs.","Fri.","Sat.","Sun."
  ]);
  const EN_ABBREV_CI = new Set([
    "e.g.","i.e.","etc.","cf.","vs.","al.","a.m.","p.m.","no.","jr.","sr.","fig.","eq.","ch.","dept.","univ."
  ]);

  function looksLikeEnglishAcronym(s) { return /(?:\b[A-Za-z]\.){2,}\s*$/.test(s) || /\b[A-Za-z]\.[A-Za-z]\.[A-Za-z]?\.?\s*$/.test(s); }
  function looksLikeInitialAndName(prev, next) { return /\b[A-Z]\.\s*$/.test(prev) && /^\s*(?:[A-Z][a-z]|[A-Z]\.)/.test(next || ""); }
  function looksLikeDecimalOrVersion(s) { return /(?:\d\.\d|\bv\d+\.\d+)(?:\.\d+)*\s*[\])'"»）]*\s*$/.test(s); }
  function looksLikeDomainOrFile(s) { return /\b[\w-]+\.(?:com|org|net|edu|gov|io|co|uk|de|fr|es|it|nl|se|no|fi|au|ca|br|mx|ar|ru|cn|jp|ch|pl|pt)\.?[\])'"»）]*\s*$/.test(s); }
  function looksLikeNumberAbbrev(prev, next) { return /\bNo\.\s*$/.test(prev) && /^\s*\d+/.test(next || ""); }
  function looksLikeSaintOrStreet(prev, next) { return /\bSt\.\s*$/.test(prev) && /^\s*[A-Z]/.test(next || ""); }
  function looksLikeEtAl(prev) { return /\bet\s+al\.\s*$/.test(prev); }

  function isEnglishNonTerminal(prevSlice, nextSlice) {
    const prev = (prevSlice || "").trimEnd();
    const next = (nextSlice || "").trimStart();
    const m = prev.match(/([A-Za-z][A-Za-z'.]*\.)\s*$/);
    const lastRaw = m ? m[1] : "";
    const lastLower = lastRaw.toLowerCase();
    if (lastRaw && EN_ABBREV_CASED.has(lastRaw)) return true;
    if (lastLower && EN_ABBREV_CI.has(lastLower)) return true;
    if (looksLikeEnglishAcronym(prev)) return true;
    if (looksLikeInitialAndName(prev, next)) return true;
    if (looksLikeDecimalOrVersion(prev)) return true;
    if (looksLikeDomainOrFile(prev)) return true;
    if (looksLikeNumberAbbrev(prev, next)) return true;
    if (looksLikeSaintOrStreet(prev, next)) return true;
    if (looksLikeEtAl(prev)) return true;
    return false;
  }

  function looksLatin(s) { return /[A-Za-z]/.test(s) && !/[\u3040-\u30ff\u3400-\u9fff]/.test(s); }

  S.endsOkayFactory = function endsOkayFactory(profile) {
    const endsWith = S.buildEndTester(profile);
    return (slice, nextSlice) => {
      if (!endsWith(slice)) return false;
      const englishLike = profile.key === "en" || (profile.key === "auto" && looksLatin(slice));
      if (englishLike && /\.\s*$/.test(slice) && isEnglishNonTerminal(slice, nextSlice)) return false;
      return true;
    };
  };
})();
