/**
 * PDF & DOCX Export utilities
 * - PDF: browser print dialog
 * - DOCX: converts page HTML to a downloadable .docx file
 */

export function exportPageAsPdf(title: string) {
  const originalTitle = document.title;
  document.title = title;
  document.body.classList.add("printing-pdf");
  window.print();
  document.body.classList.remove("printing-pdf");
  document.title = originalTitle;
}

export function exportPageAsDocx(title: string) {
  // Temporarily show all tab panels and remove chrome
  document.body.classList.add("printing-pdf");

  // Small delay to allow re-render
  setTimeout(() => {
    // Grab the main content area
    const mainEl = document.querySelector(".app-layout-main");
    if (!mainEl) {
      document.body.classList.remove("printing-pdf");
      return;
    }

    const clone = mainEl.cloneNode(true) as HTMLElement;

    // Remove hidden elements from clone
    clone.querySelectorAll('.print\\:hidden, [role="tablist"]').forEach(el => el.remove());

    // Show all tab panels
    clone.querySelectorAll('[role="tabpanel"]').forEach(el => {
      (el as HTMLElement).style.display = "block";
      (el as HTMLElement).removeAttribute("hidden");
    });

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #222; line-height: 1.6; margin: 2cm; }
          h1 { font-size: 20pt; color: #1a1a2e; margin-bottom: 8pt; }
          h2 { font-size: 16pt; color: #1a1a2e; margin-top: 16pt; margin-bottom: 6pt; border-bottom: 1px solid #ddd; padding-bottom: 4pt; }
          h3 { font-size: 13pt; color: #333; }
          p, li { font-size: 11pt; }
          code, pre { font-family: Consolas, monospace; font-size: 9pt; background: #f5f5f0; padding: 2px 4px; border-radius: 3px; }
          pre { padding: 8px; border: 1px solid #e0e0e0; white-space: pre-wrap; }
          table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
          td, th { border: 1px solid #ccc; padding: 4pt 8pt; font-size: 10pt; }
          th { background: #f0f0f0; }
          .text-primary { color: #1565C0; }
          .text-muted-foreground { color: #666; }
          .text-destructive { color: #c62828; }
          ul, ol { padding-left: 20pt; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${clone.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);

    document.body.classList.remove("printing-pdf");
  }, 100);
}
