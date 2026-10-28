export const MAX_PDF_PAGES = 50;

export async function validatePdfPageLimit(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".pdf")) return;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({
    data: await file.arrayBuffer(),
  });

  try {
    const pdf = await task.promise;

    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(
        `PDF resumes cannot exceed ${MAX_PDF_PAGES} pages. Please choose a shorter PDF.`,
      );
    }
  } finally {
    await task.destroy();
  }
}
