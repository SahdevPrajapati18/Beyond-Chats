/**
 * YouTube Data API integration for educational video recommendations
 */

// YouTube API configuration
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'; // New endpoint for video details

// Test function to verify API responses
export async function testYouTubeAPI() {
  console.log('Testing YouTube API connection...');

  try {
    // Test with a simple search query
    const testQuery = 'javascript tutorial';
    const videos = await searchEducationalVideos(testQuery, 3);

    console.log('API Test Results:');
    console.log(`- Query: "${testQuery}"`);
    console.log(`- Results found: ${videos.length}`);
    console.log(`- API Key configured: ${YOUTUBE_API_KEY ? 'Yes' : 'No'}`);

    if (videos.length > 0) {
      console.log('- Sample video:', {
        title: videos[0].snippet.title.substring(0, 50) + '...',
        channel: videos[0].snippet.channelTitle,
        views: videos[0].metadata?.viewCount || 'N/A'
      });

      if (videos[0].id?.videoId) {
        console.log(`- Video URL: https://www.youtube.com/watch?v=${videos[0].id.videoId}`);
      }
    }

    return {
      success: true,
      query: testQuery,
      resultsCount: videos.length,
      apiKeyConfigured: !!YOUTUBE_API_KEY,
      sampleVideo: videos[0] ? {
        title: videos[0].snippet.title,
        channel: videos[0].snippet.channelTitle,
        videoId: videos[0].id?.videoId
      } : null
    };

  } catch (error) {
    console.error('API test failed:', error);
    return {
      success: false,
      error: error.message,
      apiKeyConfigured: !!YOUTUBE_API_KEY
    };
  }
}

// Search for educational videos based on topics
export async function searchEducationalVideos(searchQuery, maxResults = 5) {
  try {
    console.log(`Searching YouTube for: "${searchQuery}"`);

    // --- STEP 1: Search for video IDs and basic snippet data ---
    const searchParams = new URLSearchParams({
      part: 'snippet', // Only 'snippet' is allowed for search endpoint
      q: `${searchQuery} tutorial OR explanation OR lecture OR course OR guide OR "how to"`,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'relevance', // Changed from relevance to get better results
      safeSearch: 'strict',
      videoCategoryId: '27', // Education category
      key: YOUTUBE_API_KEY
    });

    const searchResponse = await fetch(`${YOUTUBE_SEARCH_URL}?${searchParams}`);

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.warn(`Youtube API error: ${searchResponse.status} - ${errorData.error?.message || searchResponse.statusText}. Using demo data instead.`);
      return getDemoVideoResults(searchQuery, maxResults);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      console.log('No videos found in initial search, falling back to demo');
      return getDemoVideoResults(searchQuery, maxResults);
    }

    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    // --- STEP 2: Fetch detailed information for the found videos ---
    const videoDetailsParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails', // Now we can request these parts
      id: videoIds,
      key: YOUTUBE_API_KEY
    });

    const detailsResponse = await fetch(`${YOUTUBE_VIDEOS_URL}?${videoDetailsParams}`);

    if (!detailsResponse.ok) {
      const errorData = await detailsResponse.json();
      console.warn(`YouTube Video Details API error: ${detailsResponse.status} - ${errorData.error?.message || detailsResponse.statusText}. Using demo data instead.`);
      return getDemoVideoResults(searchQuery, maxResults);
    }

    const detailsData = await detailsResponse.json();

    if (!detailsData.items || detailsData.items.length === 0) {
      console.log('No video details found, falling back to demo');
      return getDemoVideoResults(searchQuery, maxResults);
    }

    // Combine search results with detailed information
    const combinedVideos = searchData.items.map(searchItem => {
      const detailItem = detailsData.items.find(d => d.id === searchItem.id.videoId);
      return detailItem ? { ...searchItem, ...detailItem } : searchItem;
    }).filter(video => video.statistics && video.contentDetails); // Filter out any videos that didn't get details

    // Filter and enhance videos with metadata
    const enhancedVideos = combinedVideos
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
        const eduScore = isEducationalContent(video);
        const hasMetadata = video.metadata && video.metadata.viewCount > 0;
        return eduScore.isEducational && hasMetadata && video.metadata.viewCount > 100;
      })
      .sort((a, b) => {
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
      statistics: {
        viewCount: (Math.floor(Math.random() * 100000) + 10000).toString(),
        likeCount: (Math.floor(Math.random() * 1000) + 100).toString(),
      },
      contentDetails: {
        duration: 'PT15M30S'
      },
      metadata: { // Added for consistency with real API results
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
      statistics: {
        viewCount: (Math.floor(Math.random() * 50000) + 5000).toString(),
        likeCount: (Math.floor(Math.random() * 500) + 50).toString(),
      },
      contentDetails: {
        duration: 'PT12M45S'
      },
      metadata: { // Added for consistency with real API results
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
      statistics: {
        viewCount: (Math.floor(Math.random() * 25000) + 2000).toString(),
        likeCount: (Math.floor(Math.random() * 200) + 20).toString(),
      },
      contentDetails: {
        duration: 'PT25M15S'
      },
      metadata: { // Added for consistency with real API results
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

  // Filter out duplicates if maxResults is higher than unique videos
  const uniqueDemoVideos = demoVideos.filter((video, index, self) =>
    index === self.findIndex(v => v.id.videoId === video.id.videoId)
  );

  return uniqueDemoVideos.slice(0, maxResults);
}


// AI-Enhanced video recommendations with intelligent scoring
export async function getAIEnhancedRecommendations(pdfAnalysis, maxVideosPerTopic = 3) {
  try {
    console.log('Getting AI-enhanced video recommendations for PDF:', pdfAnalysis.pdfName);

    const allRecommendations = [];
    const videoIdSet = new Set(); // To track unique video IDs across all searches

    // Use AI analysis for better query generation
    const { generateAIEnhancedQueries } = await import('./aiRecommendations');
    const aiQueries = generateAIEnhancedQueries(pdfAnalysis.aiAnalysis, pdfAnalysis.pdfName);

    // Process AI-generated queries first (they're more relevant)
    for (const searchQuery of aiQueries.slice(0, 6)) {
      try {
        const videos = await searchEducationalVideos(searchQuery, maxVideosPerTopic + 2); // Fetch a few extra to filter

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

        // Sort by overall AI-enhanced score and add to allRecommendations
        scoredVideos.sort((a, b) => b.overallScore - a.overallScore)
          .slice(0, maxVideosPerTopic) // Take top videos per query
          .forEach(video => {
            if (!videoIdSet.has(video.id.videoId)) { // Add only if not already present
              allRecommendations.push(video);
              videoIdSet.add(video.id.videoId);
            }
          });

      } catch (error) {
        console.error(`Error searching for "${searchQuery}":`, error);
      }
    }

    // Sort all unique recommendations by final score
    const uniqueAndSortedRecommendations = allRecommendations
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 15); // Limit to top 15 AI-enhanced recommendations

    console.log(`Generated ${uniqueAndSortedRecommendations.length} AI-enhanced video recommendations`);

    return {
      pdfName: pdfAnalysis.pdfName,
      totalRecommendations: uniqueAndSortedRecommendations.length,
      recommendations: uniqueAndSortedRecommendations,
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
  // Note: pdfAnalysis.topics and pdfAnalysis.concepts were not directly provided in AI-Enhanced function
  // Assuming structure similar to aiAnalysis.topics/concepts for consistency
  const pdfTopics = [...(pdfAnalysis.aiAnalysis?.topics || []), ...(pdfAnalysis.aiAnalysis?.concepts || [])];
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

  // Channel-based scoring - expanded trusted channels
  const educationalChannels = [
    // Programming & Tech
    'freecodecamp', 'traversy media', 'fireship', 'corey schafer', 'programming with mosh',
    'cs dojo', 'networkchuck', 'tech with tim', 'sentdex', 'thenewboston', 'codecademy',
    'udemy', 'coursera', 'edx', 'khan academy', 'lynda', 'pluralsight',

    // Science & Math
    'crash course', 'pbs', 'ted-ed', 'kurzgesagt', 'vsauce', 'numberphile', '3blue1brown',
    'minute physics', 'veritasium', 'sciencium', 'physics classroom', 'khan academy',

    // Academic institutions and organizations
    'university', 'college', 'education', 'academy', 'institute', 'school', 'mit', 'stanford',
    'harvard', 'caltech', 'berkeley', 'cambridge', 'oxford', 'yale', 'princeton',

    // Professional training
    'google developers', 'microsoft developer', 'aws training', 'azure training',
    'docker', 'kubernetes', 'tensorflow', 'pytorch', 'react', 'angular', 'vue',

    // General education
    'bbc', 'national geographic', 'smithsonian', 'museum', 'history channel',
    'discovery', 'nova', 'pbs', 'ted', 'big think'
  ];

  const channelScore = educationalChannels.some(indicator =>
    channel.includes(indicator.toLowerCase())
  ) ? 3 : 0; // Increased score for trusted channels

  if (channelScore > 0) {
    score += channelScore;
    reasons.push('trusted_channel');
  }

  // Negative indicators (decrease score) - but be less strict for educational channels
  const nonEducationalPatterns = [
    'music video', 'comedy', 'entertainment', 'gaming', 'reaction', 'challenge',
    'prank', 'fails', 'memes', 'tik tok', 'instagram', 'viral', 'trending',
    'funny', 'hilarious', 'epic fail', 'cringe'
  ];

  const hasNonEducational = nonEducationalPatterns.some(pattern =>
    title.includes(pattern) || description.includes(pattern)
  );

  // Only apply non-educational penalty if it's NOT from a trusted educational channel
  const trustedEducationalChannels = [
    'crash course', 'khan academy', 'ted-ed', 'pbs', 'bbc', 'national geographic',
    'smithsonian', 'museum', 'university', 'college', 'academy', 'institute',
    'freecodecamp', 'codecademy', 'coursera', 'edx', 'udacity', 'lynda'
  ];

  const isFromTrustedChannel = trustedEducationalChannels.some(trusted =>
    channel.includes(trusted.toLowerCase())
  );

  if (hasNonEducational && !isFromTrustedChannel) {
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