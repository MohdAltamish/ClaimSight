export async function extractPdfText(pdfBase64: string) {
  const content = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
  const bytes = Uint8Array.from(Buffer.from(content, "base64"));
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const text = await page.getTextContent();
    const pageText = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push("--- Page " + pageNumber + " ---\n" + pageText);
  }
  return pages.join("\n\n");
}
