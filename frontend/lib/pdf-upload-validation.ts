export const MAX_PDF_PAGES = 50;

export class PdfPageLimitError extends Error {
  constructor() {
    super(
      `PDF resumes cannot exceed ${MAX_PDF_PAGES} pages. Please choose a shorter PDF.`,
    );
    this.name = "PdfPageLimitError";
  }
}

export async function validatePdfPageLimit(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return;
  }

  let loadingTask:
    | import("pdfjs-dist/legacy/build/pdf.mjs").PDFDocumentLoadingTask
    | undefined;

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    loadingTask = pdfjs.getDocument({
      data: await file.arrayBuffer(),
    });

    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new PdfPageLimitError();
    }
  } catch (cause) {
    if (cause instanceof PdfPageLimitError) {
      throw cause;
    }

    console.warn(
      "Could not verify the PDF page count in the browser; the backend will validate the file.",
      cause,
    );
  } finally {
    if (loadingTask) {
      await loadingTask.destroy().catch((cause: unknown) => {
        console.warn("Could not release the PDF page-count check:", cause);
      });
    }
  }
}
