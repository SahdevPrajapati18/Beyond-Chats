/**
 * YouTube Data API integration for educational video recommendations
 */

// YouTube API configuration
const YOUTUBE_API_KEY = 'AIzaSyCzBj2hwrymd9WMWCjMj1p1hf9foB_43aA'; // Replace with actual API key
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// Search for educational videos based on topics
export async function searchEducationalVideos(searchQuery, maxResults = 5) {
  try {
    console.log(`Searching YouTube for: "${searchQuery}"`);

    // Build search parameters for educational content
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      q: `${searchQuery} tutorial OR explanation OR lecture OR course`,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'relevance',
      safeSearch: 'strict',
      key: YOUTUBE_API_KEY
    });

    const response = await fetch(`${YOUTUBE_API_URL}?${params}`);

    if (!response.ok) {
      console.warn(`YouTube API error: ${response.status} - ${response.statusText}. Using demo data instead.`);
      return getDemoVideoResults(searchQuery, maxResults);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No videos found, falling back to demo');
      return getDemoVideoResults(searchQuery, maxResults);
    }

    // Filter and enhance videos with metadata
    const enhancedVideos = data.items
      .filter(video => video.statistics && video.contentDetails) // Ensure we have metadata
      .map(video => ({
        ...video,
        metadata: {
          viewCount: parseInt(video.statistics.viewCount || '0'),
          likeCount: parseInt(video.statistics.likeCount || '0'),
          duration: video.contentDetails.duration,
          formattedDuration: formatVideoDuration(video.contentDetails.duration),
          publishedAt: video.snippet.publishedAt
        }
      }))
      .filter(video => {
        // Enhanced content filtering for better relevance
        const eduScore = isEducationalContent(video);
        const hasMetadata = video.metadata && video.metadata.viewCount > 0;

        // Only include videos that are educational and have engagement
        return eduScore.isEducational && hasMetadata && video.metadata.viewCount > 100;
      })
      .sort((a, b) => {
        // Sort by engagement and relevance
        const aScore = (a.metadata.likeCount / Math.max(a.metadata.viewCount, 1)) * 1000;
        const bScore = (b.metadata.likeCount / Math.max(b.metadata.viewCount, 1)) * 1000;
        return bScore - aScore;
      });

    if (enhancedVideos.length === 0) {
      console.log('No high-quality educational videos found, falling back to demo');
      return getDemoVideoResults(searchQuery, maxResults);
    }

    console.log(`Found ${enhancedVideos.length} high-quality educational videos for "${searchQuery}"`);

    return enhancedVideos;

  } catch (error) {
    console.error('Error searching YouTube videos:', error);

    // Return demo results as fallback
    return getDemoVideoResults(searchQuery, maxResults);
  }
}

// Demo video results for development (replace with real API calls)
async function getDemoVideoResults(searchQuery, maxResults) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const demoVideos = [
    {
      id: { videoId: 'dQw4w9WgXcQ' },
      snippet: {
        title: `Complete ${searchQuery} Tutorial for Beginners`,
        description: `Learn ${searchQuery} from scratch with this comprehensive beginner-friendly tutorial. Perfect for students and self-learners. This video covers all the essential concepts and provides practical examples.`,
        thumbnails: {
          medium: { url: `https://picsum.photos/320/180?random=${Math.floor(Math.random() * 1000)}` }
        },
        channelTitle: 'Educational Channel',
        publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      metadata: {
        viewCount: Math.floor(Math.random() * 100000) + 10000,
        likeCount: Math.floor(Math.random() * 1000) + 100,
        duration: 'PT15M30S',
        formattedDuration: '15:30',
        publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      reason: `Educational tutorial for ${searchQuery}`,
      overallScore: 0.85 + Math.random() * 0.1
    },
    {
      id: { videoId: '9bZkp7q19f0' },
      snippet: {
        title: `${searchQuery} Explained Simply - Visual Learning`,
        description: `Understanding ${searchQuery} made easy with visual explanations and real-world examples. Great for visual learners who want to grasp complex concepts quickly.`,
        thumbnails: {
          medium: { url: `https://picsum.photos/320/180?random=${Math.floor(Math.random() * 1000)}` }
        },
        channelTitle: 'Visual Learning Hub',
        publishedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
      },
      metadata: {
        viewCount: Math.floor(Math.random() * 50000) + 5000,
        likeCount: Math.floor(Math.random() * 500) + 50,
        duration: 'PT12M45S',
        formattedDuration: '12:45',
        publishedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
      },
      reason: `Visual explanation of ${searchQuery}`,
      overallScore: 0.80 + Math.random() * 0.1
    },
    {
      id: { videoId: 'jNQXAC9IVRw' },
      snippet: {
        title: `${searchQuery} Masterclass - Advanced Concepts`,
        description: `Deep dive into advanced ${searchQuery} concepts with expert insights and practical applications. Perfect for students looking to master this topic.`,
        thumbnails: {
          medium: { url: `https://picsum.photos/320/180?random=${Math.floor(Math.random() * 1000)}` }
        },
        channelTitle: 'Advanced Learning',
        publishedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      metadata: {
        viewCount: Math.floor(Math.random() * 25000) + 2000,
        likeCount: Math.floor(Math.random() * 200) + 20,
        duration: 'PT25M15S',
        formattedDuration: '25:15',
        publishedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      reason: `Advanced ${searchQuery} concepts`,
      overallScore: 0.75 + Math.random() * 0.1
    }
  ];

  return demoVideos.slice(0, maxResults);
}

// AI-Enhanced video recommendations with intelligent scoring
export async function getAIEnhancedRecommendations(pdfAnalysis, maxVideosPerTopic = 3) {
  try {
    console.log('Getting AI-enhanced video recommendations for PDF:', pdfAnalysis.pdfName);

    const allRecommendations = [];
    const searchAttempts = new Map();

    // Use AI analysis for better query generation
    const { generateAIEnhancedQueries } = await import('./aiRecommendations');
    const aiQueries = generateAIEnhancedQueries(pdfAnalysis.aiAnalysis, pdfAnalysis.pdfName);

    // Process AI-generated queries first (they're more relevant)
    for (const searchQuery of aiQueries.slice(0, 6)) {
      if (searchAttempts.has(searchQuery)) continue;

      try {
        const videos = await searchEducationalVideos(searchQuery, maxVideosPerTopic + 1);

        // Enhanced AI-powered scoring for each video
        const scoredVideos = videos.map(video => {
          const eduScore = isEducationalContent(video);
          const aiRelevanceScore = calculateAIRelevanceScore(video, searchQuery, pdfAnalysis);
          const contentSimilarityScore = calculateContentSimilarity(video, pdfAnalysis);

          return {
            ...video,
            educationalScore: eduScore.score,
            aiRelevanceScore: aiRelevanceScore,
            contentSimilarityScore: contentSimilarityScore,
            overallScore: (eduScore.score * 0.3) + (aiRelevanceScore * 0.4) + (contentSimilarityScore * 0.3),
            reasons: eduScore.reasons,
            searchQuery: searchQuery,
            aiEnhanced: true
          };
        });

        // Sort by overall AI-enhanced score
        scoredVideos.sort((a, b) => b.overallScore - a.overallScore);

        scoredVideos.slice(0, maxVideosPerTopic).forEach(video => {
          allRecommendations.push(video);
        });

        searchAttempts.set(searchQuery, true);

      } catch (error) {
        console.error(`Error searching for "${searchQuery}":`, error);
      }
    }

    // Remove duplicates and sort by final score
    const uniqueVideos = allRecommendations
      .filter((video, index, self) =>
        index === self.findIndex(v => v.id.videoId === video.id.videoId)
      )
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 15); // Limit to top 15 AI-enhanced recommendations

    console.log(`Generated ${uniqueVideos.length} AI-enhanced video recommendations`);

    return {
      pdfName: pdfAnalysis.pdfName,
      totalRecommendations: uniqueVideos.length,
      recommendations: uniqueVideos,
      aiAnalysis: pdfAnalysis.aiAnalysis,
      searchQueries: aiQueries,
      generatedAt: new Date().toISOString(),
      aiPowered: true
    };

  } catch (error) {
    console.error('Error getting AI-enhanced video recommendations:', error);
    throw error;
  }
}

// Calculate AI-enhanced relevance score
function calculateAIRelevanceScore(video, searchQuery, pdfAnalysis) {
  const title = video.snippet.title.toLowerCase();
  const description = video.snippet.description.toLowerCase();
  let score = 0;

  // Query-term matching with AI weighting
  const queryTerms = searchQuery.toLowerCase().split(' ');
  queryTerms.forEach(term => {
    if (term.length > 2) {
      const titleMatches = (title.match(new RegExp(term, 'g')) || []).length;
      const descMatches = (description.match(new RegExp(term, 'g')) || []).length;

      score += (titleMatches * 2.5) + descMatches; // Higher weight for AI queries
    }
  });

  // AI analysis topic matching
  const aiTopics = [...(pdfAnalysis.aiAnalysis?.topics || []), ...(pdfAnalysis.aiAnalysis?.concepts || [])];
  aiTopics.forEach(topic => {
    if (title.includes(topic.toLowerCase()) || description.includes(topic.toLowerCase())) {
      score += 2; // AI topics get higher weight
    }
  });

  // Subject alignment scoring
  if (pdfAnalysis.aiAnalysis?.subject) {
    const subject = pdfAnalysis.aiAnalysis.subject.toLowerCase();
    if (title.includes(subject) || description.includes(subject)) {
      score += 1.5;
    }
  }

  // Difficulty alignment
  const contentDifficulty = pdfAnalysis.aiAnalysis?.difficulty || 'intermediate';
  const difficultyKeywords = {
    'beginner': ['beginner', 'introduction', 'basics', 'simple', 'easy'],
    'intermediate': ['intermediate', 'explanation', 'understanding', 'guide'],
    'advanced': ['advanced', 'comprehensive', 'in-depth', 'masterclass', 'expert']
  };

  const difficultyMatches = difficultyKeywords[contentDifficulty]?.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  ) || false;

  if (difficultyMatches) {
    score += 1;
  }

  return Math.min(score, 7); // Cap the score
}

// Calculate content similarity score using AI analysis
function calculateContentSimilarity(video, pdfAnalysis) {
  const title = video.snippet.title.toLowerCase();
  const description = video.snippet.description.toLowerCase();
  let score = 0;

  // Compare with AI-extracted topics and concepts
  const aiTopics = pdfAnalysis.aiAnalysis?.topics || [];
  const aiConcepts = pdfAnalysis.aiAnalysis?.concepts || [];

  const allAiTerms = [...aiTopics, ...aiConcepts];

  allAiTerms.forEach(term => {
    const termLower = term.toLowerCase();
    if (title.includes(termLower) || description.includes(termLower)) {
      score += 1;
    }
  });

  // Subject category matching
  if (pdfAnalysis.aiAnalysis?.subject) {
    const subject = pdfAnalysis.aiAnalysis.subject.toLowerCase();
    if (title.includes(subject) || description.includes(subject)) {
      score += 0.5;
    }
  }

  // Summary relevance (if available)
  if (pdfAnalysis.aiAnalysis?.summary) {
    const summary = pdfAnalysis.aiAnalysis.summary.toLowerCase();
    const commonWords = summary.split(' ').filter(word =>
      word.length > 4 && (title.includes(word) || description.includes(word))
    );
    score += commonWords.length * 0.3;
  }

  return Math.min(score, 3); // Cap the similarity score
}

// Calculate comprehensive relevance score for a video
function calculateRelevanceScore(video, searchQuery, pdfAnalysis) {
  const title = video.snippet.title.toLowerCase();
  const description = video.snippet.description.toLowerCase();
  let score = 0;

  // Query-term matching (highest weight)
  const queryTerms = searchQuery.toLowerCase().split(' ');
  queryTerms.forEach(term => {
    if (term.length > 2) {
      const titleMatches = (title.match(new RegExp(term, 'g')) || []).length;
      const descMatches = (description.match(new RegExp(term, 'g')) || []).length;

      score += (titleMatches * 2) + descMatches; // Title matches worth more
    }
  });

  // Topic relevance from PDF analysis
  const pdfTopics = [...pdfAnalysis.topics.map(t => t.word), ...pdfAnalysis.concepts.map(c => c.name)];
  pdfTopics.forEach(topic => {
    if (title.includes(topic.toLowerCase()) || description.includes(topic.toLowerCase())) {
      score += 1.5; // PDF topic matches get bonus points
    }
  });

  // Freshness scoring (newer content often better for technical topics)
  const publishedDate = new Date(video.snippet.publishedAt);
  const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);

  // Prefer content from last 2 years for technical topics
  if (daysSincePublished < 730) {
    score += 0.5;
  } else if (daysSincePublished < 1460) {
    score += 0.2; // Still relevant but not latest
  }

  // Channel authority scoring
  const trustedChannels = [
    'freecodecamp', 'google developers', 'microsoft developer',
    'programming with mosh', 'corey schafer', 'sentdex'
  ];

  const channel = video.snippet.channelTitle.toLowerCase();
  if (trustedChannels.some(trusted => channel.includes(trusted))) {
    score += 1;
  }

  return Math.min(score, 5); // Cap the score
}

// Format video duration (YouTube API provides duration in ISO 8601 format)
export function formatVideoDuration(isoDuration) {
  // PT4M13S -> 4:13
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 'Unknown';

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Enhanced educational content detection with ML-like scoring
export function isEducationalContent(video) {
  const title = video.snippet.title.toLowerCase();
  const description = video.snippet.description.toLowerCase();
  const channel = video.snippet.channelTitle.toLowerCase();

  let score = 0;
  let reasons = [];

  // Educational indicators (weighted)
  const educationalPatterns = {
    // Primary educational keywords (high weight)
    'tutorial': { weight: 3, patterns: ['tutorial', 'how to', 'guide', 'walkthrough'] },
    'explanation': { weight: 3, patterns: ['explained', 'explanation', 'understand', 'learn'] },
    'academic': { weight: 2.5, patterns: ['lecture', 'course', 'class', 'university', 'college', 'academic'] },
    'instructional': { weight: 2, patterns: ['introduction', 'beginner', 'basics', 'fundamentals', 'step by step'] },
    'advanced': { weight: 1.5, patterns: ['advanced', 'masterclass', 'comprehensive', 'in-depth', 'detailed'] }
  };

  // Check each pattern category
  Object.entries(educationalPatterns).forEach(([category, config]) => {
    const hasPattern = config.patterns.some(pattern =>
      title.includes(pattern) || description.includes(pattern)
    );

    if (hasPattern) {
      score += config.weight;
      reasons.push(category);
    }
  });

  // Channel-based scoring
  const educationalChannels = [
    'freecodecamp', 'traversy media', 'fireship', 'corey schafer', 'programming with mosh',
    'cs dojo', 'networkchuck', 'tech with tim', 'sentdex', 'thenewboston',
    'university', 'college', 'education', 'academy', 'institute', 'school'
  ];

  const channelScore = educationalChannels.some(indicator =>
    channel.includes(indicator)
  ) ? 2 : 0;

  if (channelScore > 0) {
    score += channelScore;
    reasons.push('educational_channel');
  }

  // Negative indicators (decrease score)
  const nonEducationalPatterns = [
    'music video', 'comedy', 'entertainment', 'gaming', 'reaction', 'challenge',
    'prank', 'fails', 'memes', 'tik tok', 'instagram', 'viral', 'trending',
    'funny', 'hilarious', 'epic fail', 'cringe'
  ];

  const hasNonEducational = nonEducationalPatterns.some(pattern =>
    title.includes(pattern) || description.includes(pattern)
  );

  if (hasNonEducational) {
    score -= 3;
    reasons.push('non_educational_content');
  }

  // Length-based scoring (educational content tends to be longer)
  const titleLength = title.split(' ').length;
  if (titleLength > 5) score += 0.5; // Longer titles often indicate detailed content
  if (titleLength > 10) score += 0.5;

  // Final score threshold
  const isEducational = score >= 2.5;

  console.log(`Educational score for "${title}": ${score.toFixed(2)} (${reasons.join(', ')})`);

  return {
    isEducational,
    score,
    reasons,
    confidence: Math.min(score / 5, 1) // Normalize to 0-1
  };
}
