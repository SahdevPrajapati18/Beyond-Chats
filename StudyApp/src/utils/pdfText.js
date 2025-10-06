import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

// Configure PDF.js worker for Vite (use URL string)
GlobalWorkerOptions.workerSrc = workerSrc

export async function extractTextFromPdfUrl(objectUrl) {
  const loadingTask = getDocument(objectUrl)
  const pdf = await loadingTask.promise
  let fullText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const strings = content.items.map((it) => it.str)
    fullText += strings.join(' ') + '\n'
  }
  return fullText
}


