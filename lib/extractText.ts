// lib/extractText.ts
export async function extractTextFromFile(file: File): Promise<string> {
    // If it's a plain text file, read directly
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      return await file.text();
    }
  
    // If it's a PDF, extract via pdfjs-dist without crashing Next.js
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = await import("pdfjs-dist");
  
      // Configure CDN worker to avoid webpack/turbopack bundling issues
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      let combinedText = "";
  
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        combinedText += pageStrings + "\n";
      }
  
      return combinedText.trim();
    }
  
    throw new Error("Unsupported file format. Please upload a .pdf or .txt file.");
  }