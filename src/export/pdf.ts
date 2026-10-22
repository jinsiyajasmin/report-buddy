/**
 * PDF export uses the browser's own rendering of the live preview as the source
 * of truth, so the PDF is pixel-identical to what the user reviewed on screen.
 * A hidden print-only copy of the deck (#print-root) is laid out one slide per
 * landscape page by the @media print rules in styles.css.
 */
export function exportPdf(documentTitle: string): void {
  if (typeof window === "undefined") return;
  const previous = document.title;
  document.title = documentTitle;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
  window.setTimeout(restore, 1000);
}
