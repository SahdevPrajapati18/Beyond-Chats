/**
 * Simple vector storage system for RAG documents
 */

// In-memory storage for demo purposes
// In production, this would use a proper vector database
class VectorStore {
  constructor() {
    this.documents = new Map();
    this.chunks = new Map();
    this.isInitialized = false;
  }

  // Add a processed document to the store
  addDocument(document) {
    console.log(`Adding document to vector store: ${document.fileName}`);

    this.documents.set(document.id, {
      id: document.id,
      fileName: document.fileName,
      totalPages: document.totalPages,
      totalChunks: document.totalChunks,
      processedAt: document.processedAt
    });

    // Add chunks with document reference
    document.chunks.forEach(chunk => {
      this.chunks.set(chunk.id, {
        ...chunk,
        documentId: document.id,
        documentName: document.fileName
      });
    });

    this.isInitialized = true;
    console.log(`Document added. Total documents: ${this.documents.size}, Total chunks: ${this.chunks.size}`);
  }

  // Remove a document and its chunks
  removeDocument(documentId) {
    const document = this.documents.get(documentId);
    if (!document) return false;

    // Remove all chunks for this document
    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.documentId === documentId) {
        this.chunks.delete(chunkId);
      }
    }

    // Remove document
    this.documents.delete(documentId);

    console.log(`Document removed: ${document.fileName}`);
    return true;
  }

  // Get all documents
  getAllDocuments() {
    return Array.from(this.documents.values());
  }

  // Get chunks for a specific document
  getDocumentChunks(documentId) {
    const chunks = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.documentId === documentId) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  // Search for relevant chunks across all documents
  searchSimilar(query, topK = 3) {
    if (!this.isInitialized || this.chunks.size === 0) {
      console.warn('Vector store not initialized or empty');
      return [];
    }

    try {
      console.log(`Searching for "${query}" in ${this.chunks.size} chunks`);

      // Import ragSystem dynamically to avoid circular dependency
      import('./ragSystem.js').then(({ searchRelevantChunks }) => {
        const documents = Array.from(this.documents.values()).map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          chunks: this.getDocumentChunks(doc.id)
        }));

        const results = searchRelevantChunks(query, documents, topK);
        console.log(`Found ${results.length} relevant chunks`);
        return results;
      }).catch(error => {
        console.error('Error importing ragSystem:', error);
        return [];
      });

    } catch (error) {
      console.error('Error in vector store search:', error);
      return [];
    }
  }

  // Get chunk by ID
  getChunk(chunkId) {
    return this.chunks.get(chunkId);
  }

  // Clear all data
  clear() {
    this.documents.clear();
    this.chunks.clear();
    this.isInitialized = false;
    console.log('Vector store cleared');
  }

  // Get statistics
  getStats() {
    return {
      totalDocuments: this.documents.size,
      totalChunks: this.chunks.size,
      isInitialized: this.isInitialized
    };
  }
}

// Singleton instance
export const vectorStore = new VectorStore();

export { VectorStore };
