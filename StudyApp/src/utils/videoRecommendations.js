/**
 * PDF Topic Extraction for YouTube Video Recommendations
 */

// Common academic keywords and phrases for better topic detection
const ACADEMIC_KEYWORDS = [
  // Math & Science
  'mathematics', 'calculus', 'algebra', 'geometry', 'statistics', 'probability',
  'physics', 'chemistry', 'biology', 'computer science', 'programming',
  'algorithm', 'data structure', 'machine learning', 'artificial intelligence',

  // Engineering
  'engineering', 'mechanical', 'electrical', 'civil', 'chemical', 'software',
  'circuit', 'system', 'design', 'analysis', 'simulation',

  // Business & Economics
  'economics', 'finance', 'accounting', 'marketing', 'management', 'business',
  'strategy', 'entrepreneurship', 'leadership', 'project management',

  // Humanities
  'philosophy', 'psychology', 'sociology', 'anthropology', 'history',
  'literature', 'linguistics', 'political science', 'law',

  // General Academic
  'research', 'methodology', 'theory', 'concept', 'principle', 'framework',
  'analysis', 'evaluation', 'assessment', 'conclusion', 'introduction',
  'chapter', 'section', 'paragraph', 'figure', 'table', 'equation'
];

// Stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'what', 'which', 'who', 'when', 'where', 'why', 'how'
]);

// Extract key topics and concepts from PDF text
export function extractTopicsFromPdf(text, options = {}) {
  const {
    maxTopics = 15,
    minWordLength = 3,
    minFrequency = 1
  } = options;

  console.log('Extracting topics from PDF text...');

  if (!text || text.length < 100) {
    console.warn('PDF text too short for topic extraction');
    return [];
  }

  // Clean and normalize text
  const cleanedText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Split into words
  const words = cleanedText.split(' ').filter(word =>
    word.length >= minWordLength &&
    !STOP_WORDS.has(word) &&
    !/^\d+$/.test(word) // Exclude pure numbers
  );

  if (words.length < 10) {
    console.warn('Not enough words for topic extraction');
    return [];
  }

  console.log(`Processing ${words.length} words for topic extraction`);

  // Count word frequency
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Filter by frequency and academic relevance
  const topics = Object.entries(wordFreq)
    .filter(([word, freq]) => {
      // Must appear at least minFrequency times
      if (freq < minFrequency) return false;

      // Boost score for academic keywords
      const isAcademicKeyword = ACADEMIC_KEYWORDS.some(keyword =>
        word.includes(keyword) || keyword.includes(word)
      );

      return isAcademicKeyword || freq >= Math.max(minFrequency, 2);
    })
    .map(([word, freq]) => ({
      word,
      frequency: freq,
      score: calculateTopicScore(word, freq, words.length),
      isAcademic: ACADEMIC_KEYWORDS.some(keyword =>
        word.includes(keyword) || keyword.includes(word)
      )
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTopics);

  console.log(`Extracted ${topics.length} key topics:`, topics.map(t => `${t.word}(${t.frequency})`));

  return topics;
}

// Calculate topic relevance score
function calculateTopicScore(word, frequency, totalWords) {
  let score = frequency;

  // Boost academic keywords
  const isAcademic = ACADEMIC_KEYWORDS.some(keyword =>
    word.includes(keyword) || keyword.includes(word)
  );
  if (isAcademic) score *= 2;

  // Boost longer, more specific terms
  if (word.length > 8) score *= 1.5;
  if (word.length > 12) score *= 1.3;

  // Boost terms that appear in titles or headings (capitalized in original)
  // This is a simple heuristic - in a real implementation you'd track case

  return Math.round(score * 100) / 100;
}

// Extract broader concepts and themes
export function extractConceptsFromTopics(topics) {
  const concepts = [];

  // Group related topics into broader concepts
  const conceptGroups = {
    'mathematics': ['math', 'calculus', 'algebra', 'geometry', 'statistics', 'probability'],
    'computer_science': ['programming', 'algorithm', 'computer', 'software', 'data', 'machine'],
    'natural_sciences': ['physics', 'chemistry', 'biology', 'science'],
    'engineering': ['engineering', 'design', 'system', 'circuit', 'mechanical', 'electrical'],
    'business': ['business', 'management', 'economics', 'finance', 'marketing', 'strategy'],
    'humanities': ['philosophy', 'psychology', 'sociology', 'history', 'literature', 'political']
  };

  // Find matching concept groups
  topics.forEach(topic => {
    for (const [concept, keywords] of Object.entries(conceptGroups)) {
      if (keywords.some(keyword => topic.word.includes(keyword) || keyword.includes(topic.word))) {
        if (!concepts.some(c => c.name === concept)) {
          concepts.push({
            name: concept,
            confidence: topic.score / 10,
            relatedTopics: [topic.word]
          });
        } else {
          const existing = concepts.find(c => c.name === concept);
          if (!existing.relatedTopics.includes(topic.word)) {
            existing.relatedTopics.push(topic.word);
          }
        }
      }
    }
  });

  // If no concept groups matched, create generic concepts from high-scoring topics
  if (concepts.length === 0) {
    topics.slice(0, 3).forEach(topic => {
      concepts.push({
        name: topic.word,
        confidence: topic.score / 10,
        relatedTopics: [topic.word]
      });
    });
  }

  return concepts.sort((a, b) => b.confidence - a.confidence);
}

// Generate YouTube search queries from extracted topics
export function generateVideoSearchQueries(topics, concepts, pdfName = '') {
  const queries = [];
  const queryWeights = new Map();

  if (topics.length === 0 && concepts.length === 0) {
    console.warn('No topics or concepts available for query generation');
    return ['educational tutorial']; // Fallback query
  }

  // Enhanced query generation with weighted scoring
  const allTerms = [
    ...concepts.map(c => ({ term: c.name, weight: c.confidence * 2, type: 'concept' })),
    ...topics.map(t => ({ term: t.word, weight: t.score, type: 'topic' }))
  ];

  // Sort by weight for better query prioritization
  allTerms.sort((a, b) => b.weight - a.weight);

  // Get top terms (most relevant to the PDF)
  const topTerms = allTerms.slice(0, Math.min(5, allTerms.length));

  console.log('Top terms for query generation:', topTerms.map(t => `${t.term}(${t.weight.toFixed(2)})`));

  // Generate specific queries based on actual PDF content
  topTerms.forEach(({ term, weight, type }) => {
    // Create specific, content-based queries
    const specificQueries = [
      `${term} tutorial`,
      `${term} explained`,
      `learn ${term}`,
      `${term} guide`,
      `${term} lecture`,
      `understanding ${term}`,
      `${term} basics`
    ];

    specificQueries.forEach((query, index) => {
      const queryWeight = weight * (1 - index * 0.1); // Slightly decrease weight for variations
      queries.push(query);
      queryWeights.set(query, queryWeight);
    });
  });

  // Add PDF-specific context if available
  if (pdfName && pdfName !== 'unknown.pdf') {
    const cleanName = pdfName.replace(/\.pdf$/i, '').replace(/[^\w\s]/g, ' ');
    const nameWords = cleanName.split(' ').filter(word => word.length > 3);

    if (nameWords.length > 0) {
      // Use PDF name as additional context
      nameWords.forEach((word, index) => {
        if (index < 2) { // Limit to first 2 words
          const pdfQuery = `${word} tutorial`;
          queries.push(pdfQuery);
          queryWeights.set(pdfQuery, 0.8); // Good weight for PDF name matches
        }
      });
    }
  }

  // Remove duplicates and limit to most relevant queries
  const uniqueQueries = [...new Set(queries)]
    .sort((a, b) => (queryWeights.get(b) || 0) - (queryWeights.get(a) || 0))
    .slice(0, 8); // Limit to 8 best queries

  console.log('Generated specific video search queries:', uniqueQueries.map(q => ({
    query: q,
    weight: queryWeights.get(q) || 0
  })));

  return uniqueQueries;
}

// Main function to process PDF for video recommendations
export async function processPdfForVideoRecommendations(pdfUrl, pdfName) {
  try {
    console.log('Processing PDF for video recommendations:', pdfName);

    // Extract text from PDF
    const textData = await extractTextWithPages(pdfUrl);

    if (!textData || textData.length === 0) {
      console.warn('No text content found in PDF');
      return {
        pdfName,
        topics: [],
        concepts: [],
        searchQueries: [],
        textLength: 0,
        processedAt: new Date().toISOString()
      };
    }

    // Combine all pages
    const fullText = textData.map(page => page.text).join('\n\n');

    if (fullText.length < 200) {
      console.warn('PDF text too short for meaningful analysis');
      return {
        pdfName,
        topics: [],
        concepts: [],
        searchQueries: [],
        textLength: fullText.length,
        processedAt: new Date().toISOString()
      };
    }

    console.log(`Extracted ${fullText.length} characters of text`);

    // Extract topics with improved settings
    const topics = extractTopicsFromPdf(fullText, {
      maxTopics: 20,
      minWordLength: 3,
      minFrequency: 1
    });

    if (topics.length === 0) {
      console.warn('No topics extracted from PDF');
      return {
        pdfName,
        topics: [],
        concepts: [],
        searchQueries: [],
        textLength: fullText.length,
        processedAt: new Date().toISOString()
      };
    }

    // Extract broader concepts
    const concepts = extractConceptsFromTopics(topics);

    // Generate search queries with better relevance
    const searchQueries = generateVideoSearchQueries(topics, concepts, pdfName);

    console.log(`Successfully processed PDF: ${topics.length} topics, ${concepts.length} concepts`);

    return {
      pdfName,
      topics,
      concepts,
      searchQueries,
      textLength: fullText.length,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error processing PDF for video recommendations:', error);
    throw error;
  }
}

// Enhanced text extraction with page tracking (reusing from RAG system)
async function extractTextWithPages(pdfUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = async () => {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        const pages = [];
        const totalPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
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
        }

        resolve(pages);

      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}
