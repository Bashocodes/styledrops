import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertTriangle, ChevronDown, Play, Volume2, Type, Image, Video, Music, Search, X } from 'lucide-react';
import { getPosts, getPostsByUserId, Post, validateAndFixMediaUrl } from '../lib/supabaseUtils';
import { addBreadcrumb, captureError } from '../lib/sentry';

interface GalleryViewProps {
  onBack: () => void;
  onPostClick: (post: Post) => void;
  artistId?: string; // NEW: Optional artist ID to filter posts
  artistUsername?: string; // NEW: Optional artist username for display
}

export const GalleryView: React.FC<GalleryViewProps> = ({ 
  onBack, 
  onPostClick, 
  artistId, 
  artistUsername 
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'new' | 'top' | 'hot'>('new');
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInputValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInputValue]);
  
  const loadPosts = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const offset = reset ? 0 : posts.length;
      
      // NEW: Use different fetch function based on whether we're viewing an artist's profile
      let result;
      if (artistId) {
        result = await getPostsByUserId(artistId, sortOrder, 12, offset, selectedMediaType, searchQuery);
      } else {
        result = await getPosts(sortOrder, 12, offset, selectedMediaType, searchQuery);
      }
      
      const { posts: newPosts, hasMore: moreAvailable } = result;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMore(moreAvailable);
      addBreadcrumb('Posts loaded', 'ui', { 
        count: newPosts.length, 
        hasMore: moreAvailable,
        isArtistProfile: !!artistId,
        artistId,
        mediaType: selectedMediaType,
        searchQuery
      });
    } catch (error) {
      console.error('Failed to load posts:', error);
      setError('Failed to load posts. Please try again.');
      captureError(error as Error, { 
        context: 'loadPosts',
        isArtistProfile: !!artistId,
        artistId,
        mediaType: selectedMediaType,
        searchQuery
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sortOrder, selectedMediaType, posts.length, artistId, searchQuery]);

  // Load posts on mount and when sort order, media type, or artist changes
  useEffect(() => {
    loadPosts(true);
  }, [sortOrder, selectedMediaType, artistId, searchQuery]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadPosts(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadPosts]);

  const handleSortChange = (newSort: 'new' | 'top' | 'hot') => {
    addBreadcrumb('Sort order changed', 'ui', { 
      from: sortOrder, 
      to: newSort,
      isArtistProfile: !!artistId,
      artistId,
      mediaType: selectedMediaType,
      searchQuery
    });
    setSortOrder(newSort);
  };

  const handleMediaTypeChange = (newMediaType: 'image' | 'video' | 'audio') => {
    addBreadcrumb('Media type filter changed', 'ui', { 
      from: selectedMediaType, 
      to: newMediaType,
      isArtistProfile: !!artistId,
      artistId,
      searchQuery
    });
    setSelectedMediaType(newMediaType);
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    addBreadcrumb('Search cleared', 'ui', { 
      previousQuery: searchInputValue,
      isArtistProfile: !!artistId,
      artistId
    });
  };
  
  const handlePostClick = (post: Post) => {
    addBreadcrumb('Gallery post clicked', 'ui', { 
      postId: post.id,
      isArtistProfile: !!artistId,
      artistId,
      mediaType: post.media_type,
      searchQuery
    });
    onPostClick(post);
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video': return Play;
      case 'audio': return Volume2;
      default: return Type;
    }
  };

  const getMediaTypeIcon = (mediaType: 'image' | 'video' | 'audio') => {
    switch (mediaType) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      default: return Type;
    }
  };

  const renderMediaPreview = (post: Post) => {
    const MediaIcon = getMediaIcon(post.media_type);
    
    // Validate and fix the media URL
    const validatedUrl = validateAndFixMediaUrl(post.media_url);
    
    console.log('Rendering media preview:', {
      postId: post.id.substring(0, 8),
      originalUrl: post.media_url,
      validatedUrl: validatedUrl,
      mediaType: post.media_type,
      isArtistProfile: !!artistId
    });

    switch (post.media_type) {
      case 'image':
        return (
          <div className="relative w-full">
            <img
              src={validatedUrl}
              alt={post.title}
              className="w-full h-auto object-cover shadow-double-border"
              loading="lazy"
              onError={(e) => {
                console.warn('Image failed to load, showing fallback:', {
                  postId: post.id,
                  originalUrl: post.media_url,
                  validatedUrl: validatedUrl
                });
                // Set a fallback image or hide the image
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Show the fallback div
                const fallbackDiv = target.nextElementSibling as HTMLElement;
                if (fallbackDiv) {
                  fallbackDiv.style.display = 'flex';
                }
              }}
            />
            {/* Fallback div for broken images */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-[#B8A082]/20 to-[#7C9A92]/20 flex items-center justify-center shadow-double-border"
              style={{ display: 'none' }}
            >
              <div className="text-center">
                <Type className="w-16 h-16 text-[#B8A082] mx-auto mb-2" />
                <p className="text-[#B8A082] text-sm">Image unavailable</p>
                <p className="text-[#B8A082]/60 text-xs mt-1">Media file could not be loaded</p>
              </div>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="relative w-full">
            <video
              src={validatedUrl}
              className="w-full h-auto object-cover shadow-double-border"
              muted
              preload="none"
              poster={post.thumbnail_url} // NEW: Use thumbnail as poster if available
              onError={(e) => {
                console.warn('Video failed to load, showing fallback:', {
                  postId: post.id,
                  originalUrl: post.media_url,
                  validatedUrl: validatedUrl
                });
                // Show fallback for video
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
                const fallbackDiv = target.nextElementSibling as HTMLElement;
                if (fallbackDiv) {
                  fallbackDiv.style.display = 'flex';
                }
              }}
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="w-12 h-12 text-white/80" />
            </div>
            {/* Fallback div for broken videos */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-[#4da0ff]/20 to-[#7C9A92]/20 flex items-center justify-center shadow-double-border"
              style={{ display: 'none' }}
            >
              <div className="text-center">
                <Play className="w-16 h-16 text-[#4da0ff] mx-auto mb-2" />
                <p className="text-[#4da0ff] text-sm">Video unavailable</p>
                <p className="text-[#4da0ff]/60 text-xs mt-1">Media file could not be loaded</p>
              </div>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="w-full h-auto bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg py-12">
            <div className="text-center">
              <Volume2 className="w-16 h-16 text-white/60 mx-auto mb-2" />
              <p className="text-white/50 text-sm">Audio Content</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full h-auto bg-white/5 flex items-center justify-center shadow-double-border py-16">
            <div className="text-center">
              <MediaIcon className="w-16 h-16 text-white/30 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Unknown media type</p>
            </div>
          </div>
        );
    }
  };

  // NEW: Get the appropriate title for the gallery
  const getGalleryTitle = () => {
    if (artistUsername) {
      return `${artistUsername}'s Gallery`;
    }
    return 'Gallery';
  };

  // NEW: Get the appropriate empty state message
  const getEmptyStateMessage = () => {
    if (artistUsername) {
      return {
        title: `No creations yet`,
        subtitle: `${artistUsername} hasn't shared any creations yet.`,
        buttonText: 'Explore Other Artists'
      };
    }
    return {
      title: 'No styles yet',
      subtitle: 'Be the first to share your creative analysis!',
      buttonText: 'Start Creating'
    };
  };

  return (
    <main id="main-content" className="pt-20 min-h-screen bg-[#1a1a1a]" tabIndex={-1}>
      <div className="overflow-y-auto">
        {/* Top Section */}
        <header className="px-4 py-4 flex items-center justify-between border-b border-white/10">
          <h1 className="sr-only">{getGalleryTitle()}</h1>
          <div className="flex items-center space-x-4">
            {/* Media Type Filter Tabs */}
            <div className="flex items-center bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden" role="tablist" aria-label="Media type filter">
              {(['image', 'video', 'audio'] as const).map((mediaType) => {
                const isActive = selectedMediaType === mediaType;
                const Icon = getMediaTypeIcon(mediaType);
                
                return (
                  <button
                    key={mediaType}
                    onClick={() => handleMediaTypeChange(mediaType)}
                    className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset ${
                      isActive
                        ? 'text-[#8FB3A8] bg-black/80'
                        : 'text-improved-contrast hover:bg-black/80'
                    }`}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Filter by ${mediaType} content`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:block capitalize">{mediaType}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value as 'new' | 'top' | 'hot')}
                className="appearance-none bg-black/60 backdrop-blur-sm hover:bg-black/80 text-improved-contrast rounded-lg px-4 py-2 pr-8 font-medium transition-colors text-sm cursor-pointer border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                aria-label="Sort gallery content"
              >
                <option value="new" className="bg-black text-[#E0E0E0]">New</option>
                <option value="top" className="bg-black text-[#E0E0E0]">Top</option>
                <option value="hot" className="bg-black text-[#E0E0E0]">Hot</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-improved-contrast pointer-events-none" size={16} />
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  placeholder="Search styles, titles, or prompts..."
                  className="w-full bg-black/60 backdrop-blur-sm hover:bg-black/80 focus:bg-black/80 text-improved-contrast rounded-lg pl-10 pr-10 py-2 text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300"
                  aria-label="Search gallery content"
                />
                {searchInputValue && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Powered by Bolt Tag - Moved to the right of the dropdown */}
            <div className="flex items-center space-x-2">
              <img 
                src="/logotext_poweredby_360w (1) copy.png" 
                alt="Powered by Bolt" 
                className="h-4 w-auto object-contain opacity-60"
                onError={(e) => {
                  // Hide the image if it fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  console.warn('Powered by Bolt image failed to load');
                }}
                onLoad={() => {
                  console.log('Powered by Bolt image loaded successfully');
                }}
              />
            </div>
          </div>
        </header>
          {/* Right Section - Sort and Powered by Bolt */}
          <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
        {/* Content */}
        <section className="p-4" aria-label="Gallery content">
          {loading && posts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#B8A082] animate-spin mx-auto mb-4" />
                <p className="text-improved-contrast text-lg">
                  {artistUsername ? `Loading ${artistUsername}'s creations...` : 'Loading styles...'}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 text-lg mb-2">Failed to load creations</p>
                <p className="text-improved-muted text-sm mb-4">{error}</p>
                <button
                  onClick={() => loadPosts(true)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <Type className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-improved-muted text-lg mb-2">{getEmptyStateMessage().title}</p>
                <p className="text-gray-400 text-sm mb-4">{getEmptyStateMessage().subtitle}</p>
                <button
                  onClick={searchQuery.trim() ? handleClearSearch : onBack}
                  className="px-6 py-2 bg-[#D4B896] hover:bg-[#C4A886] text-[#1a1a1a] rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  {getEmptyStateMessage().buttonText}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Gallery Grid */}
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6" role="grid" aria-label="Style gallery">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="bg-white/5 rounded-2xl overflow-hidden hover:bg-white/10 transition-all group border border-white/10 hover:border-white/20 hover:scale-[1.02] transform duration-300 cursor-pointer relative break-inside-avoid focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`View ${post.title} in ${post.style} style`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePostClick(post);
                      }
                    }}
                  >
                    {/* Media Preview */}
                    {renderMediaPreview(post)}
                    
                    {/* Style Name Overlay - Updated with hover effect */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black px-3 py-2 rounded-t-lg opacity-0 group-hover:opacity-70 translate-y-full group-hover:translate-y-0 transition-all duration-300">
                      <p className="text-[#8FB3A8] font-mono text-xs font-medium text-center whitespace-nowrap">
                        {post.style}
                      </p>
                    </div>

                    {/* Debug info overlay (only in development) */}
                    {import.meta.env.DEV && (
                      <div className="absolute top-2 right-2 bg-black/80 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <div>ID: {post.id.substring(0, 8)}...</div>
                        <div>URL: {post.media_url.substring(0, 30)}...</div>
                        <div>Type: {post.media_type}</div>
                        {post.thumbnail_url && <div>Has thumbnail</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                {loadingMore ? (
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 text-[#B8A082] animate-spin" />
                    <span className="text-improved-muted text-sm">Loading more...</span>
                  </div>
                ) : !hasMore ? (
                  <span className="text-gray-400 text-sm">
                    {artistUsername 
                      ? `You've seen all of ${artistUsername}'s creations` 
                      : "You've reached the end"
                    }
                  </span>
                ) : null}
              </div>
            </>
          )}
        </section>
          </div>
      </div>
    </main>
  );
};