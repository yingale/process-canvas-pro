/**
 * PDF Export utility — uses browser print dialog to generate PDFs
 * Temporarily hides non-content elements for clean output.
 */
export function exportPageAsPdf(title: string) {
  // Set document title for PDF filename
  const originalTitle = document.title;
  document.title = title;

  // Add print-optimized class
  document.body.classList.add("printing-pdf");

  window.print();

  // Restore
  document.body.classList.remove("printing-pdf");
  document.title = originalTitle;
}
