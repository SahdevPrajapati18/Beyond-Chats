/**
 * AI-Powered Video Recommendation System
 */

// AI Service Configuration
const AI_SERVICES = {
  OPENAI: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY',
    model: 'gpt-3.5-turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  GEMINI: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY',
    model: 'gemini-pro',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
  }
};

// Debug logging for API key
console.log('AI Services Configuration:', {
  OPENAI: {
    hasKey: !!AI_SERVICES.OPENAI.apiKey,
    keyLength: AI_SERVICES.OPENAI.apiKey?.length || 0,
    keyPrefix: AI_SERVICES.OPENAI.apiKey?.substring(0, 7) || 'none'
  },
  GEMINI: {
    hasKey: !!AI_SERVICES.GEMINI.apiKey,
    keyLength: AI_SERVICES.GEMINI.apiKey?.length || 0
  }
});

// AI Provider selection - prioritize OpenAI since user has the key
const PREFERRED_AI = 'OPENAI'; // Can be 'OPENAI' or 'GEMINI'

// Analyze PDF content using AI for better topic extraction
export async function analyzePdfWithAI(textContent, pdfName = '') {
  try {
    console.log(' Starting AI analysis for:', pdfName);
    console.log(' Text content length:', textContent.length);

    if (!textContent || textContent.length < 200) {
      console.warn(' PDF content too short for AI analysis');
      return analyzeWithRules(textContent, pdfName);
    }

    const aiProvider = PREFERRED_AI;
    console.log(' Selected AI provider:', aiProvider);

    // Check if API key is configured (now accepts project keys)
    if (aiProvider === 'GEMINI' && (!AI_SERVICES.GEMINI.apiKey || AI_SERVICES.GEMINI.apiKey === 'YOUR_GEMINI_API_KEY' || AI_SERVICES.GEMINI.apiKey.startsWith('sk-proj'))) {
      console.log(' Gemini API key not configured, using rule-based analysis');
      return analyzeWithRules(textContent, pdfName);
    } else if (aiProvider === 'OPENAI' && (!AI_SERVICES.OPENAI.apiKey || AI_SERVICES.OPENAI.apiKey === 'YOUR_OPENAI_API_KEY' || (!AI_SERVICES.OPENAI.apiKey.startsWith('sk-') && !AI_SERVICES.OPENAI.apiKey.startsWith('sk-svcacct-') && !AI_SERVICES.OPENAI.apiKey.startsWith('sk-proj-')))) {
      console.log(' OpenAI API key not configured or invalid format, using rule-based analysis');
      console.log(' OpenAI key check:', {
        exists: !!AI_SERVICES.OPENAI.apiKey,
        placeholder: AI_SERVICES.OPENAI.apiKey === 'YOUR_OPENAI_API_KEY',
        startsWithSK: AI_SERVICES.OPENAI.apiKey?.startsWith('sk-'),
        prefix: AI_SERVICES.OPENAI.apiKey?.substring(0, 8)
      });
      return analyzeWithRules(textContent, pdfName);
    }

    console.log(' API key validation passed, proceeding with AI analysis');

    if (aiProvider === 'GEMINI' && AI_SERVICES.GEMINI.apiKey) {
      console.log(' Calling Gemini API...');
      return await analyzeWithGemini(textContent, pdfName);
    } else if (aiProvider === 'OPENAI' && AI_SERVICES.OPENAI.apiKey) {
      console.log(' Calling OpenAI API...');
      return await analyzeWithOpenAI(textContent, pdfName);
    } else {
      // Fallback to rule-based analysis
      console.log(' No AI API keys available, using rule-based analysis');
      return analyzeWithRules(textContent, pdfName);
    }

  } catch (error) {
    console.error(' Error in AI analysis, falling back to rules:', error);
    return analyzeWithRules(textContent, pdfName);
  }
}

// Analyze PDF content using Google's Gemini AI
async function analyzeWithGemini(textContent, pdfName) {
  try {
    const prompt = `
      Analyze the following educational content and provide a structured summary:

      Document: ${pdfName || 'Unknown Document'}

      Content (first 3000 characters):
      ${textContent.substring(0, 3000)}

      Please provide:
      1. A brief 2-3 sentence summary of the main topic
      2. 5-8 key topics/concepts (single words or short phrases)
      3. 2-3 broader subject areas this content relates to
      4. Estimated difficulty level (beginner/intermediate/advanced)
      5. Primary subject category (math, science, engineering, business, humanities, etc.)

      Format your response as JSON:
      {
        "summary": "brief summary here",
        "topics": ["topic1", "topic2", "topic3"],
        "concepts": ["concept1", "concept2"],
        "difficulty": "intermediate",
        "subject": "computer science"
      }
    `;

    const response = await fetch(`${AI_SERVICES.GEMINI.endpoint}?key=${AI_SERVICES.GEMINI.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    // Try to parse JSON response
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, extracting manually');
      return extractFromTextResponse(aiResponse);
    }

  } catch (error) {
    console.error('Error with Gemini API:', error);
    throw error;
  }
}

// Analyze PDF content using OpenAI GPT
async function analyzeWithOpenAI(textContent, pdfName) {
  try {
    console.log('🚀 Calling OpenAI API for PDF analysis...');

    // Validate API key format (now accepts project keys)
    if (!AI_SERVICES.OPENAI.apiKey || AI_SERVICES.OPENAI.apiKey === 'YOUR_OPENAI_API_KEY') {
      throw new Error('OpenAI API key not configured');
    }

    // Accept all sk- prefixed keys (direct, project, service account)
    if (!AI_SERVICES.OPENAI.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }

    console.log('✅ API key validation passed');

    const prompt = `
      You are an expert educational content analyst. Analyze the following PDF content and extract meaningful educational topics and concepts.

      DOCUMENT INFORMATION:
      - Title: ${pdfName || 'Unknown Educational Document'}
      - Content Length: ${textContent.length} characters

      CONTENT TO ANALYZE:
      ${textContent.substring(0, 4000)}

      EXTRACTION REQUIREMENTS:
      1. Provide a comprehensive 3-4 sentence summary that captures the main educational focus and key learning objectives
      2. Extract 8-12 specific technical/academic topics (not generic words) - these should be actual concepts, methodologies, or subject matter from the content
      3. Identify 3-4 broader subject categories this content belongs to
      4. Determine the appropriate difficulty level (beginner/intermediate/advanced/expert)
      5. Specify the primary academic field (computer science, mathematics, physics, engineering, business, humanities, etc.)

      QUALITY GUIDELINES:
      - Topics should be specific and technical, not generic words like "chapter" or "section"
      - Focus on actual concepts, techniques, theories, or methodologies mentioned
      - Prioritize educational/academic content over administrative or structural elements
      - Ensure topics are directly related to the core subject matter

      EXAMPLE OUTPUT:
      {
        "summary": "This document provides a comprehensive introduction to machine learning algorithms, covering fundamental concepts from linear regression to neural networks. It explains key mathematical principles underlying these algorithms and demonstrates practical implementation through coding examples and case studies.",
        "topics": ["machine learning", "linear regression", "neural networks", "gradient descent", " overfitting", "cross-validation", "feature engineering", "model evaluation"],
        "concepts": ["artificial intelligence", "supervised learning", "statistical modeling"],
        "difficulty": "intermediate",
        "subject": "computer science"
      }

      IMPORTANT: Respond with valid JSON only. No explanations or additional text.
    `;

    console.log('📤 Making OpenAI API request...');

    const requestBody = {
      model: AI_SERVICES.OPENAI.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content analyst specializing in academic and technical documents. Extract specific, meaningful topics and concepts, not generic terms. Focus on actual subject matter and methodologies.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    };

    console.log('🔧 Request config:', {
      endpoint: AI_SERVICES.OPENAI.endpoint,
      model: AI_SERVICES.OPENAI.model,
      contentLength: prompt.length,
      apiKeyPrefix: AI_SERVICES.OPENAI.apiKey.substring(0, 10) + '...'
    });

    const response = await fetch(AI_SERVICES.OPENAI.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_SERVICES.OPENAI.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 OpenAI API response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 OpenAI API response data keys:', Object.keys(data));

    if (!data.choices || data.choices.length === 0) {
      console.error('❌ No choices in OpenAI response:', data);
      throw new Error('No response from OpenAI API');
    }

    const aiResponse = data.choices[0].message.content;
    console.log('🤖 AI response content:', aiResponse);

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(aiResponse);
      console.log('✅ Successfully parsed AI response:', parsed);

      // Validate the response has meaningful content
      if (parsed.topics && parsed.topics.length > 0 && parsed.summary) {
        return parsed;
      } else {
        throw new Error('AI response missing required fields');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response as JSON, extracting manually');
      return extractFromTextResponse(aiResponse);
    }

  } catch (error) {
    console.error('💥 Error with OpenAI API:', error);
    throw error;
  }
}

// Fallback rule-based analysis when AI is unavailable
function analyzeWithRules(textContent, pdfName) {
  console.log('Using rule-based PDF analysis...');

  // Extract topics using existing method but with AI-like processing
  const { extractTopicsFromPdf, extractConceptsFromTopics } = require('./videoRecommendations');

  const topics = extractTopicsFromPdf(textContent, {
    maxTopics: 10,
    minWordLength: 4,
    minFrequency: 1
  });

  const concepts = extractConceptsFromTopics(topics);

  // Generate AI-like summary
  const summary = generateRuleBasedSummary(textContent, topics, pdfName);

  // Estimate difficulty and subject
  const { difficulty, subject } = estimateContentMetadata(textContent, topics);

  return {
    summary,
    topics: topics.map(t => t.word),
    concepts: concepts.map(c => c.name),
    difficulty,
    subject
  };
}

// Generate summary using rule-based approach
function generateRuleBasedSummary(text, topics, pdfName) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

  if (sentences.length === 0) {
    return 'Educational content analysis completed.';
  }

  // Try to find topic sentences
  const topicWords = topics.slice(0, 3).map(t => t.word.toLowerCase());
  const relevantSentences = sentences.filter(sentence =>
    topicWords.some(word => sentence.toLowerCase().includes(word))
  );

  if (relevantSentences.length > 0) {
    return relevantSentences[0].trim() + '.';
  }

  // Fallback to first meaningful sentence
  return sentences[0].trim() + '.';
}

// Estimate content difficulty and subject
function estimateContentMetadata(text, topics) {
  const lowerText = text.toLowerCase();

  // Subject detection based on keywords
  const subjectKeywords = {
    'computer science': ['programming', 'algorithm', 'software', 'computer', 'coding', 'development'],
    'mathematics': ['equation', 'theorem', 'calculus', 'algebra', 'geometry', 'statistics'],
    'physics': ['force', 'energy', 'motion', 'quantum', 'relativity', 'mechanics'],
    'chemistry': ['molecule', 'reaction', 'compound', 'element', 'bond', 'solution'],
    'biology': ['cell', 'organism', 'evolution', 'genetics', 'ecosystem', 'physiology'],
    'engineering': ['design', 'system', 'circuit', 'mechanical', 'electrical', 'structure'],
    'business': ['management', 'economics', 'finance', 'marketing', 'strategy', 'accounting'],
    'humanities': ['philosophy', 'psychology', 'sociology', 'history', 'literature', 'politics']
  };

  let bestSubject = 'general';
  let bestScore = 0;

  Object.entries(subjectKeywords).forEach(([subject, keywords]) => {
    const score = keywords.reduce((acc, keyword) => {
      return acc + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestSubject = subject;
    }
  });

  // Difficulty estimation based on text complexity
  const avgSentenceLength = text.split(/[.!?]+/).reduce((acc, s) => acc + s.split(' ').length, 0) /
                           Math.max(text.split(/[.!?]+/).length, 1);

  const technicalTerms = topics.filter(t => t.word.length > 8).length;

  let difficulty = 'beginner';
  if (avgSentenceLength > 20 || technicalTerms > 3) {
    difficulty = 'advanced';
  } else if (avgSentenceLength > 15 || technicalTerms > 1) {
    difficulty = 'intermediate';
  }

  return { difficulty, subject: bestSubject };
}

// Extract structured data from AI text response (fallback)
function extractFromTextResponse(textResponse) {
  console.log('Extracting data from AI text response...');

  // Simple extraction patterns
  const summaryMatch = textResponse.match(/"summary":\s*"([^"]+)"/) ||
                      textResponse.match(/summary[:\s]*([^\n\r]+)/i);

  const topicsMatch = textResponse.match(/"topics":\s*\[(.*?)\]/) ||
                     textResponse.match(/topics[:\s]*([^\n\r]+)/i);

  const conceptsMatch = textResponse.match(/"concepts":\s*\[(.*?)\]/) ||
                      textResponse.match(/concepts[:\s]*([^\n\r]+)/i);

  const difficultyMatch = textResponse.match(/"difficulty":\s*"([^"]+)"/) ||
                        textResponse.match(/difficulty[:\s]*([^\n\r]+)/i);

  const subjectMatch = textResponse.match(/"subject":\s*"([^"]+)"/) ||
                     textResponse.match(/subject[:\s]*([^\n\r]+)/i);

  return {
    summary: summaryMatch ? summaryMatch[1] : 'AI analysis completed',
    topics: topicsMatch ? topicsMatch[1].split(',').map(t => t.replace(/"/g, '').trim()).slice(0, 8) : [],
    concepts: conceptsMatch ? conceptsMatch[1].split(',').map(c => c.replace(/"/g, '').trim()).slice(0, 3) : [],
    difficulty: difficultyMatch ? difficultyMatch[1].toLowerCase() : 'intermediate',
    subject: subjectMatch ? subjectMatch[1].toLowerCase() : 'general'
  };
}

// Generate AI-enhanced search queries
export function generateAIEnhancedQueries(analysis, pdfName = '') {
  const queries = [];

  if (!analysis || !analysis.topics || analysis.topics.length === 0) {
    console.warn('No AI analysis available for query generation');
    return ['educational tutorial']; // Fallback query
  }

  // Create targeted queries based on AI analysis
  const { topics, concepts, subject, difficulty } = analysis;

  // 1. Subject-specific queries (highest priority)
  if (subject && subject !== 'general') {
    queries.push(`${subject} tutorial`);
    queries.push(`${subject} explained`);
    queries.push(`introduction to ${subject}`);
    queries.push(`${subject} fundamentals`);
  }

  // 2. Topic-specific queries (most specific)
  const importantTopics = topics.slice(0, 6); // Top 6 topics
  importantTopics.forEach(topic => {
    queries.push(`${topic} tutorial`);
    queries.push(`${topic} explained`);
    queries.push(`learn ${topic}`);
    queries.push(`${topic} guide`);
  });

  // 3. Concept-based queries (broader understanding)
  concepts.forEach(concept => {
    queries.push(`${concept} tutorial`);
    queries.push(`${concept} explained simply`);
    queries.push(`understanding ${concept}`);
  });

  // 4. Difficulty-appropriate queries
  if (difficulty === 'beginner') {
    queries.push('beginner friendly tutorial');
    queries.push('introduction for beginners');
    queries.push('basics explained');
  } else if (difficulty === 'intermediate') {
    queries.push('intermediate tutorial');
    queries.push('comprehensive guide');
    queries.push('detailed explanation');
  } else if (difficulty === 'advanced') {
    queries.push('advanced tutorial');
    queries.push('in-depth explanation');
    queries.push('expert guide');
  }

  // 5. PDF-specific context queries
  if (pdfName && pdfName !== 'unknown.pdf') {
    const cleanName = pdfName.replace(/\.pdf$/i, '').replace(/[^\w\s]/g, ' ');
    const nameWords = cleanName.split(' ').filter(word => word.length > 3);

    if (nameWords.length > 0) {
      queries.push(`${nameWords[0]} tutorial`);
      if (nameWords.length > 1) {
        queries.push(`${nameWords[0]} ${nameWords[1]} tutorial`);
      }
    }
  }

  // 6. Combined topic queries for better relevance
  if (importantTopics.length >= 2) {
    const topTwo = importantTopics.slice(0, 2);
    queries.push(`${topTwo[0]} and ${topTwo[1]} tutorial`);
  }

  // Remove duplicates and prioritize based on specificity
  const uniqueQueries = [...new Set(queries)].slice(0, 12);

  console.log('Generated AI-enhanced search queries:', uniqueQueries);
  console.log('Query sources:', {
    subject: subject || 'none',
    topicsCount: topics.length,
    conceptsCount: concepts.length,
    difficulty: difficulty || 'unknown'
  });

  return uniqueQueries;
}

// Test function to verify OpenAI API connectivity
export async function testOpenAIApi() {
  try {
    console.log('Testing OpenAI API connectivity...');

    // Simple test prompt
    const testPrompt = {
      model: AI_SERVICES.OPENAI.model,
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with just the word "OK" to confirm you are working.'
        }
      ],
      temperature: 0.1,
      max_tokens: 10
    };

    console.log('Test API Key prefix:', AI_SERVICES.OPENAI.apiKey?.substring(0, 10));

    // Accept all sk- prefixed keys for testing
    if (!AI_SERVICES.OPENAI.apiKey?.startsWith('sk-')) {
      return {
        success: false,
        error: 'Invalid API key format. Key must start with sk-'
      };
    }

    const response = await fetch(AI_SERVICES.OPENAI.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_SERVICES.OPENAI.apiKey}`
      },
      body: JSON.stringify(testPrompt)
    });

    console.log('Test response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API test failed:', response.status, errorText);
      return {
        success: false,
        error: `API Error ${response.status}: ${errorText}`,
        status: response.status
      };
    }

    const data = await response.json();
    console.log('Test response data:', data);

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const responseText = data.choices[0].message.content.trim();
      console.log('OpenAI API test successful. Response:', responseText);

      return {
        success: true,
        response: responseText,
        usage: data.usage
      };
    } else {
      console.error('Unexpected API response format:', data);
      return {
        success: false,
        error: 'Unexpected response format from API',
        response: data
      };
    }

  } catch (error) {
    console.error('OpenAI API test error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Enhanced PDF processing with AI analysis
export async function processPdfWithAI(pdfUrl, pdfName) {
  try {
    console.log('Processing PDF with AI analysis:', pdfName);

    // Extract text from PDF
    const textData = await extractTextWithPages(pdfUrl);

    if (!textData || textData.length === 0) {
      throw new Error('No text content found in PDF');
    }

    // Combine all pages
    const fullText = textData.map(page => page.text).join('\n\n');

    console.log(`Extracted ${fullText.length} characters for AI analysis`);

    // Use AI for content analysis
    const aiAnalysis = await analyzePdfWithAI(fullText, pdfName);

    console.log('AI analysis completed:', aiAnalysis);

    // Generate enhanced search queries
    const searchQueries = generateAIEnhancedQueries(aiAnalysis, pdfName);

    return {
      pdfName,
      aiAnalysis,
      searchQueries,
      textLength: fullText.length,
      processedAt: new Date().toISOString(),
      aiPowered: true
    };

  } catch (error) {
    console.error('Error in AI PDF processing:', error);
    throw error;
  }
}

// Enhanced text extraction with page tracking (reusing from existing system)
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
