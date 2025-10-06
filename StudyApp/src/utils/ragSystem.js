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

// Generate citation from chunk
export function generateCitation(chunk, query) {
  try {
    console.log('Generating citation for chunk:', chunk.id, 'query:', query);

    // Extract 2-3 line snippet around relevant content
    const sentences = chunk.content.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length === 0) {
      console.warn('No sentences found in chunk for citation');
      return {
        pageNumber: chunk.startPage || 1,
        snippet: chunk.content.substring(0, 150) + '...',
        documentName: chunk.documentName || 'Unknown Document'
      };
    }

    // Find sentences most relevant to the query (simple keyword matching)
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);

    let bestSentences = sentences;
    if (queryWords.length > 0) {
      // Score sentences by keyword matches
      const scoredSentences = sentences.map(sentence => {
        const sentenceWords = sentence.toLowerCase();
        const score = queryWords.reduce((acc, word) => {
          return acc + (sentenceWords.includes(word) ? 1 : 0);
        }, 0);
        return { sentence, score };
      });

      scoredSentences.sort((a, b) => b.score - a.score);
      bestSentences = scoredSentences.slice(0, 3).map(item => item.sentence);
    }

    const snippet = bestSentences.join(' ').substring(0, 200) + (bestSentences.join(' ').length > 200 ? '...' : '');

    const citation = {
      pageNumber: chunk.startPage || 1,
      snippet: snippet.trim(),
      documentName: chunk.documentName || 'Unknown Document'
    };

    console.log('Generated citation:', citation);
    return citation;

  } catch (error) {
    console.error('Error generating citation:', error);
    // Return safe fallback
    return {
      pageNumber: 1,
      snippet: 'Content citation unavailable.',
      documentName: 'Document'
    };
  }
}
