import { useState, useEffect } from 'react'
import { searchEducationalVideos } from '../utils/youtubeApi'
import { processPdfForVideoRecommendations } from '../utils/videoRecommendations'

function VideoRecommendations({ uploadedFiles, selectedFile, isVisible = true }) {
  const [recommendations, setRecommendations] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedPdf, setSelectedPdf] = useState(null)

  // Process selected PDF for video recommendations
  useEffect(() => {
    if (selectedFile && isVisible) {
      generateRecommendations(selectedFile)
    }
  }, [selectedFile, isVisible])

  const generateRecommendations = async (file) => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      console.log(`Generating video recommendations for ${file.name}`)

      // Use standard PDF processing for video recommendations
      const pdfAnalysis = await processPdfForVideoRecommendations(file.url, file.name)

      if (!pdfAnalysis || !pdfAnalysis.topics) {
        setError('Could not extract meaningful content from this PDF for video recommendations.')
        return
      }

      // Use standard YouTube API recommendations
      const { searchEducationalVideos } = await import('../utils/youtubeApi')

      // Generate search queries from PDF analysis
      const searchQueries = [
        ...pdfAnalysis.topics.map(t => t.word),
        ...pdfAnalysis.concepts.map(c => c.name)
      ].slice(0, 3) // Limit to top 3 topics

      const allVideos = []

      // Search for each topic
      for (const query of searchQueries) {
        try {
          const videos = await searchEducationalVideos(query, 2) // Get 2 videos per topic
          allVideos.push(...videos.map(video => ({
            ...video,
            reason: `Related to "${query}" topic`,
            searchQuery: query
          })))
        } catch (error) {
          console.error(`Error searching for "${query}":`, error)
        }
      }

      if (allVideos.length === 0) {
        setError('No suitable educational videos found for this content.')
        return
      }

      // Format response similar to the expected structure
      const videoRecs = {
        pdfName: file.name,
        totalRecommendations: allVideos.length,
        recommendations: allVideos.slice(0, 6), // Limit to 6 videos
        generatedAt: new Date().toISOString(),
        aiPowered: false
      }

      setRecommendations(videoRecs)
      setSelectedPdf(file)

    } catch (error) {
      console.error('Error generating video recommendations:', error)
      setError('Failed to generate video recommendations. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatViewCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!isVisible) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Video Recommendations</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a PDF to get video suggestions</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Analyzing PDF and finding videos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center max-w-sm mx-auto px-4">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">No Videos Found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          {selectedPdf && (
            <button
              onClick={() => generateRecommendations(selectedPdf)}
              className="mt-3 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!recommendations) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Video Recommendations</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload and select a PDF to get video suggestions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Video Recommendations</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Based on "{truncateText(recommendations.pdfName, 30)}"
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {recommendations.totalRecommendations} videos
            </span>
            <button
              onClick={() => generateRecommendations(selectedPdf)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
              title="Refresh recommendations"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="p-3 overflow-y-auto h-[calc(100%-4rem)]">
        <div className="grid gap-3">
          {recommendations.recommendations.map((video, index) => (
            <div
              key={`${video.id?.videoId || 'demo'}-${index}`}
              className="flex gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Try multiple ways to get video ID
                let videoId = null;

                // Method 1: Standard YouTube API format
                if (video.id?.videoId) {
                  videoId = video.id.videoId;
                }
                // Method 2: Alternative format
                else if (video.id) {
                  videoId = video.id;
                }
                // Method 3: Check if it's already a video ID string
                else if (typeof video.id === 'string') {
                  videoId = video.id;
                }

                console.log('Video clicked:', {
                  title: video.snippet?.title || 'Unknown',
                  videoId: videoId,
                  fullVideoObject: video
                });

                if (videoId && videoId !== 'undefined' && videoId !== 'null') {
                  const url = `https://www.youtube.com/watch?v=${videoId}`;
                  console.log('Opening video URL:', url);
                  window.open(url, '_blank');
                } else {
                  console.warn('No valid video ID found for:', video.snippet?.title || 'Unknown video');
                  // For demo videos, you could show an alert or handle differently
                  alert('Demo video - no link available');
                }
              }}
              style={{ pointerEvents: 'auto' }}
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={video.snippet.thumbnails.medium.url}
                  alt={video.snippet.title}
                  className="w-24 h-18 object-cover rounded-md"
                  onError={(e) => {
                    e.target.src = `https://picsum.photos/160/120?random=${index}`
                  }}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  {video.id?.videoId ? 'YouTube' : ''}
                </div>
              </div>

              {/* Video Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {truncateText(video.snippet.title, 60)}
                </h4>

                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {truncateText(video.snippet.description, 100)}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>{video.snippet.channelTitle}</span>
                  <span>{formatDate(video.snippet.publishedAt)}</span>
                </div>

                {/* Video Metadata */}
                {video.metadata && (
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {formatViewCount(video.metadata.viewCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {video.metadata.formattedDuration}
                    </span>
                    {video.metadata.likeCount > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {formatViewCount(video.metadata.likeCount)}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                    {video.reason}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                    Score: {Math.round(video.overallScore * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {recommendations.recommendations.length === 0 && (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">No video recommendations available</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoRecommendations
