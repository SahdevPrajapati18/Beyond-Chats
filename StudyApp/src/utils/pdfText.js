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

// Enhanced function to extract text with page information for RAG
export async function extractTextWithPages(objectUrl) {
  const loadingTask = getDocument(objectUrl)
  const pdf = await loadingTask.promise
  const pages = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = {
      pageNumber: pageNum,
      content: content.items.map((it) => it.str).join(' '),
      items: content.items // Keep original items for potential future use
    }
    pages.push(pageText)
  }

  return {
    fullText: pages.map(p => p.content).join('\n'),
    pages: pages,
    totalPages: pdf.numPages
  }
}

// Chunk text into smaller pieces for better RAG performance
export function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

  let currentChunk = ''
  let chunkStartPage = 1

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.'

    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        startPage: chunkStartPage,
        endPage: chunkStartPage
      })

      // Start new chunk with overlap
      currentChunk = sentence
      if (overlap > 0 && chunks.length > 0) {
        const prevChunk = chunks[chunks.length - 1].content
        const overlapText = prevChunk.substring(prevChunk.length - overlap)
        currentChunk = overlapText + ' ' + currentChunk
      }
    } else {
      if (currentChunk.length === 0) {
        chunkStartPage = 1 // Will be updated with actual page info
      }
      currentChunk += ' ' + sentence
    }
  }

  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      startPage: chunkStartPage,
      endPage: chunkStartPage
    })
  }

  return chunks
}

// Create chunks with page information from PDF pages
export async function createChunksWithPageInfo(objectUrl, chunkSize = 500, overlap = 50) {
  const pdfData = await extractTextWithPages(objectUrl)
  const allText = pdfData.pages.map(p => p.content).join('\n')

  // First create basic chunks
  const basicChunks = chunkText(allText, chunkSize, overlap)

  // Then enhance with page information by matching content back to pages
  const enhancedChunks = basicChunks.map((chunk, index) => {
    // Find which pages this chunk's content comes from
    const chunkPages = []
    let currentPos = 0

    for (const page of pdfData.pages) {
      const pageStart = currentPos
      const pageEnd = currentPos + page.content.length

      // Check if chunk content overlaps with this page
      if (chunk.content.includes(page.content.substring(0, 100)) ||
          page.content.includes(chunk.content.substring(0, 100))) {
        chunkPages.push(page.pageNumber)
      }

      currentPos = pageEnd + 1 // +1 for the newline
    }

    return {
      ...chunk,
      pages: chunkPages.length > 0 ? chunkPages : [1], // Default to page 1 if no match
      chunkIndex: index
    }
  })

  return {
    chunks: enhancedChunks,
    totalPages: pdfData.totalPages,
    metadata: {
      totalChunks: enhancedChunks.length,
      avgChunkSize: Math.round(allText.length / enhancedChunks.length),
      chunkSize,
      overlap
    }
  }
}


