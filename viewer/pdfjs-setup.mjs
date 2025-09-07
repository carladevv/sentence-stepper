// Loads pdfjs ESM and exposes it globally as window.pdfjsLib
import * as pdfjsLib from "../pdfjs/pdf.mjs";

const RT = (typeof browser !== "undefined" ? browser : chrome);
const workerUrl = RT?.runtime?.getURL
  ? RT.runtime.getURL("pdfjs/pdf.worker.mjs")
  : new URL("../pdfjs/pdf.worker.mjs", import.meta.url).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
window.pdfjsLib = pdfjsLib;
