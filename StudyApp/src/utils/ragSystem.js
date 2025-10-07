/**
 * Enhanced PDF processing utilities for RAG system
 */

// Simple hash function for generating document IDs
function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Simple embedding function (demo - in production use proper embedding model)
function generateEmbedding(text) {
  // Simple TF-IDF style embedding based on word frequency
  const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const wordFreq = {};

  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Convert to a simple vector representation (first 100 dimensions)
  const embedding = [];
  let index = 0;

  for (const [word, freq] of Object.entries(wordFreq)) {
    if (index >= 100) break;
    // Simple hash-based positioning
    const pos = parseInt(word.slice(-2), 36) % 100;
    if (!embedding[pos]) {
      embedding[pos] = freq / words.length;
      index++;
    }
  }

  // Fill remaining positions with zeros
  while (embedding.length < 100) {
    embedding.push(0);
  }

  return embedding;
}

// Cosine similarity for vector comparison
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Chunk text into smaller pieces for better retrieval
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  let currentChunk = '';
  let startPage = 1;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.';

    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: simpleHash(currentChunk),
        content: currentChunk.trim(),
        startPage: startPage,
        endPage: startPage,
        wordCount: currentChunk.split(' ').length,
        embedding: generateEmbedding(currentChunk)
      });

      // Start new chunk with overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5)); // Approximate overlap
      currentChunk = overlapWords.join(' ') + ' ' + sentence;

      // Estimate page number (rough approximation)
      startPage += Math.floor(currentChunk.length / 300); // Assume ~300 words per page
    } else {
      currentChunk += sentence + ' ';
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: simpleHash(currentChunk),
      content: currentChunk.trim(),
      startPage: startPage,
      endPage: startPage,
      wordCount: currentChunk.split(' ').length,
      embedding: generateEmbedding(currentChunk)
    });
  }

  return chunks;
}

// Process PDF and create chunks with embeddings
export async function processPdfForRag(pdfUrl, fileName) {
  try {
    console.log('Processing PDF for RAG:', fileName);

    // Extract text with page information (enhanced version)
    const textData = await extractTextWithPages(pdfUrl);

    if (!textData || textData.length === 0) {
      throw new Error('No text content found in PDF');
    }

    console.log(`Extracted ${textData.length} pages of text`);

    // Combine all pages into single text for chunking
    const fullText = textData.map(page => page.text).join('\n\n');

    // Create chunks
    const chunks = chunkText(fullText, 600, 100); // Larger chunks for better context

    console.log(`Created ${chunks.length} chunks`);

    // Create document record
    const document = {
      id: simpleHash(fileName + Date.now()),
      fileName: fileName,
      totalPages: textData.length,
      totalChunks: chunks.length,
      processedAt: new Date().toISOString(),
      chunks: chunks
    };

    return document;

  } catch (error) {
    console.error('Error processing PDF for RAG:', error);
    throw error;
  }
}

// Enhanced text extraction with page tracking (reusing from RAG system)
async function extractTextWithPages(pdfUrl) {
  return new Promise((resolve, reject) => {
    console.log('Loading PDF.js for text extraction...');

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = async () => {
      try {
        console.log('PDF.js loaded, extracting text...');

        const pdfjsLib = window['pdfjs-dist/build/pdf'];

        // Load PDF
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        console.log(`PDF loaded with ${pdf.numPages} pages`);

        const pages = [];
        const totalPages = pdf.numPages;

        // Extract text from each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          try {
            console.log(`Extracting text from page ${pageNum}/${totalPages}`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
              .map(item => item.str)
              .join(' ')
              .trim();

            if (pageText) {
              pages.push({
                pageNumber: pageNum,
                text: pageText,
                wordCount: pageText.split(' ').length
              });
            }
          } catch (pageError) {
            console.error(`Error extracting page ${pageNum}:`, pageError);
          }
        }

        console.log(`Successfully extracted ${pages.length} pages of text`);
        resolve(pages);

      } catch (error) {
        console.error('Error in PDF text extraction:', error);
        reject(error);
      }
    };

    script.onerror = () => {
      console.error('Failed to load PDF.js');
      reject(new Error('Failed to load PDF.js'));
    };

    document.head.appendChild(script);
  });
}

// Search for relevant chunks based on query
export function searchRelevantChunks(query, documents, topK = 3) {
  const queryEmbedding = generateEmbedding(query);
  const results = [];

  documents.forEach(doc => {
    doc.chunks.forEach(chunk => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

      results.push({
        ...chunk,
        documentId: doc.id,
        documentName: doc.fileName,
        similarity: similarity
      });
    });
  });

  // Sort by similarity and return top K
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, topK);
}

import { createChunksWithPageInfo } from './pdfText.js';
class SimpleVectorStore {
  constructor() {
    this.chunks = []
    this.chunkMetadata = []
  }

  // Add chunks from a PDF
  async addDocument(fileId, objectUrl, metadata = {}) {
    try {
      const chunkData = await createChunksWithPageInfo(objectUrl)

      const chunksWithMetadata = chunkData.chunks.map((chunk, index) => ({
        id: `${fileId}_${chunk.chunkIndex}`,
        content: chunk.content,
        pages: chunk.pages,
        metadata: {
          fileId,
          chunkIndex: chunk.chunkIndex,
          ...metadata
        }
      }))

      this.chunks.push(...chunksWithMetadata)
      this.chunkMetadata.push({
        fileId,
        totalChunks: chunksWithMetadata.length,
        metadata
      })

      return chunksWithMetadata.length
    } catch (error) {
      console.error('Error adding document to vector store:', error)
      throw error
    }
  }

  // Simple keyword-based search with relevance scoring
  search(query, topK = 5) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)

    if (queryTerms.length === 0) return []

    // Score chunks based on keyword matches and position
    const scoredChunks = this.chunks.map(chunk => {
      let score = 0
      const chunkText = chunk.content.toLowerCase()

      queryTerms.forEach(term => {
        // Exact matches get higher scores
        if (chunkText.includes(term)) {
          score += 10
        }

        // Partial matches get lower scores
        if (chunkText.includes(term.substring(0, 4))) {
          score += 2
        }

        // Boost score for matches in first 200 characters (likely more important)
        if (chunkText.substring(0, 200).includes(term)) {
          score += 5
        }
      })

      // Boost score for chunks with multiple page references (likely more comprehensive)
      score += chunk.pages.length * 2

      return {
        ...chunk,
        relevanceScore: score
      }
    })

    // Sort by relevance and return top K
    return scoredChunks
      .filter(chunk => chunk.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK)
  }

  // Get chunks by file ID
  getChunksByFile(fileId) {
    return this.chunks.filter(chunk => chunk.metadata.fileId === fileId)
  }

  // Clear all chunks
  clear() {
    this.chunks = []
    this.chunkMetadata = []
  }

  // Get stats
  getStats() {
    return {
      totalChunks: this.chunks.length,
      totalDocuments: this.chunkMetadata.length,
      documents: this.chunkMetadata
    }
  }
}

// Global vector store instance
export const vectorStore = new SimpleVectorStore()

// Generate RAG response with citations
export async function generateRAGResponse(query, contextFiles = []) {
  try {
    // Get relevant chunks from all context files
    let relevantChunks = []

    for (const fileId of contextFiles) {
      const chunks = vectorStore.getChunksByFile(fileId)
      const fileResults = vectorStore.search(query, 3) // Get top 3 from each file
      relevantChunks.push(...fileResults.filter(chunk => chunk.metadata.fileId === fileId))
    }

    // If no context files specified, search all chunks
    if (contextFiles.length === 0) {
      relevantChunks = vectorStore.search(query, 5)
    }

    if (relevantChunks.length === 0) {
      return {
        response: "I don't have enough information from the uploaded documents to answer this question. Please upload relevant PDFs or ask about a different topic.",
        citations: []
      }
    }

    // Generate response based on retrieved chunks
    const contextText = relevantChunks.map(chunk => chunk.content).join('\n\n')
    const citations = relevantChunks.map(chunk => ({
      pages: chunk.pages,
      snippet: chunk.content.substring(0, 150) + '...',
      fileId: chunk.metadata.fileId
    }))

    // Create a contextual response (in a real implementation, this would use an LLM)
    const response = `Based on the information I found in your documents:\n\n${contextText.substring(0, 300)}...\n\nThis information appears on pages ${citations.map(c => c.pages.join(', ')).join(', ')}.`

    return {
      response,
      citations,
      contextChunks: relevantChunks.length
    }

  } catch (error) {
    console.error('Error generating RAG response:', error)
    return {
      response: "I encountered an error while processing your question. Please try again.",
      citations: []
    }
  }
}

// Initialize vector store with uploaded files
export async function initializeRAGWithFiles(uploadedFiles) {
  vectorStore.clear()

  for (const file of uploadedFiles) {
    try {
      await vectorStore.addDocument(file.id, file.url, {
        fileName: file.name,
        uploadDate: new Date().toISOString()
      })
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
    }
  }

  return vectorStore.getStats()
}
