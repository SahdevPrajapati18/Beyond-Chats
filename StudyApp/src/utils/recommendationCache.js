/**
 * Simple caching system for YouTube video recommendations
 */

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries

class RecommendationCache {
  constructor() {
    this.cache = new Map();
    this.accessOrder = []; // For LRU eviction
  }

  // Generate cache key from search parameters
  generateKey(searchQuery, pdfName, maxResults) {
    return `${searchQuery}_${pdfName}_${maxResults}`;
  }

  // Get cached result
  get(searchQuery, pdfName, maxResults) {
    const key = this.generateKey(searchQuery, pdfName, maxResults);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.delete(key);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    console.log(`Cache hit for query: "${searchQuery}"`);
    return cached.data;
  }

  // Set cache entry
  set(searchQuery, pdfName, maxResults, data) {
    const key = this.generateKey(searchQuery, pdfName, maxResults);

    // Check cache size limit
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    this.updateAccessOrder(key);

    console.log(`Cached result for query: "${searchQuery}"`);
  }

  // Delete cache entry
  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  // Update access order for LRU
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  // Evict least recently used entry
  evictLRU() {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift();
    this.cache.delete(lruKey);
    console.log(`Evicted LRU cache entry: ${lruKey}`);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    console.log('Recommendation cache cleared');
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }
}

// Singleton cache instance
const recommendationCache = new RecommendationCache();

// Enhanced search function with caching
export async function searchEducationalVideosCached(searchQuery, maxResults = 5, pdfName = '') {
  // Check cache first
  const cachedResult = recommendationCache.get(searchQuery, pdfName, maxResults);
  if (cachedResult) {
    return cachedResult;
  }

  // If not cached, make API call
  const { searchEducationalVideos } = await import('./youtubeApi');
  const result = await searchEducationalVideos(searchQuery, maxResults);

  // Cache the result
  recommendationCache.set(searchQuery, pdfName, maxResults, result);

  return result;
}

// Enhanced getVideoRecommendations with caching
export async function getVideoRecommendationsCached(pdfAnalysis, maxVideosPerTopic = 2) {
  try {
    console.log('Getting cached video recommendations for PDF:', pdfAnalysis.pdfName);

    const allRecommendations = [];
    const searchAttempts = new Map();

    // Process search queries in order of importance
    for (const searchQuery of pdfAnalysis.searchQueries) {
      if (searchAttempts.has(searchQuery)) continue;

      try {
        const videos = await searchEducationalVideosCached(
          searchQuery,
          maxVideosPerTopic + 2,
          pdfAnalysis.pdfName
        );

        // Enhanced scoring and ranking for each video
        const scoredVideos = videos.map(video => {
          const eduScore = isEducationalContent(video);
          const relevanceScore = calculateRelevanceScore(video, searchQuery, pdfAnalysis);

          return {
            ...video,
            educationalScore: eduScore.score,
            relevanceScore: relevanceScore,
            overallScore: (eduScore.score * 0.4) + (relevanceScore * 0.6),
            reasons: eduScore.reasons,
            searchQuery: searchQuery
          };
        });

        // Sort by overall score and take top videos
        scoredVideos.sort((a, b) => b.overallScore - a.overallScore);

        scoredVideos.slice(0, maxVideosPerTopic).forEach(video => {
          allRecommendations.push(video);
        });

        searchAttempts.set(searchQuery, true);

      } catch (error) {
        console.error(`Error searching for "${searchQuery}":`, error);
      }
    }

    // Remove duplicates based on video ID
    const uniqueVideos = allRecommendations
      .filter((video, index, self) =>
        index === self.findIndex(v => v.id.videoId === video.id.videoId)
      )
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 12); // Limit to top 12 recommendations

    console.log(`Generated ${uniqueVideos.length} unique cached video recommendations`);

    return {
      pdfName: pdfAnalysis.pdfName,
      totalRecommendations: uniqueVideos.length,
      recommendations: uniqueVideos,
      searchQueries: pdfAnalysis.searchQueries,
      generatedAt: new Date().toISOString(),
      cached: true
    };

  } catch (error) {
    console.error('Error getting cached video recommendations:', error);
    throw error;
  }
}

// Export cache management functions
export { recommendationCache };
