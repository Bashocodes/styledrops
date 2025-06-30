import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertTriangle, ChevronDown, Play, Volume2, Type, Palette, Image, Video, Music } from 'lucide-react';
import { getPostsByStyle, Post, validateAndFixMediaUrl } from '../lib/supabaseUtils';
import { addBreadcrumb, captureError } from '../lib/sentry';

interface StyleGalleryPageProps {
  styleName: string;
  onBack: () => void;
  onPostClick: (post: Post) => void;
}

export const StyleGalleryPage: React.FC<StyleGalleryPageProps> = ({ styleName, onBack, onPostClick }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'new' | 'top' | 'hot'>('new');
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const offset = reset ? 0 : posts.length;
      const { posts: newPosts, hasMore: moreAvailable } = await getPostsByStyle(styleName, sortOrder, 12, offset, selectedMediaType);

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMore(moreAvailable);
      addBreadcrumb('Style posts loaded', 'ui', { 
        style: styleName, 
        count: newPosts.length, 
        hasMore: moreAvailable,
        mediaType: selectedMediaType
      });
    } catch (error) {
      console.error('Failed to load style posts:', error);
      setError('Failed to load posts for this style. Please try again.');
      captureError(error as Error, { context: 'loadStylePosts', style: styleName, mediaType: selectedMediaType });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [styleName, sortOrder, selectedMediaType, posts.length]);

  // Load posts on mount and when sort order or media type changes
  useEffect(() => {
    loadPosts(true);
  }, [styleName, sortOrder, selectedMediaType]);

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
    addBreadcrumb('Style gallery sort order changed', 'ui', { 
      style: styleName, 
      from: sortOrder, 
      to: newSort,
      mediaType: selectedMediaType
    });
    setSortOrder(newSort);
  };

  const handleMediaTypeChange = (newMediaType: 'image' | 'video' | 'audio') => {
    addBreadcrumb('Style gallery media type filter changed', 'ui', { 
      style: styleName,
      from: selectedMediaType, 
      to: newMediaType
    });
    setSelectedMediaType(newMediaType);
  };

  const handlePostClick = (post: Post) => {
    addBreadcrumb('Style gallery post clicked', 'ui', { 
      postId: post.id, 
      style: styleName,
      mediaType: post.media_type
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
    
    console.log('Rendering style gallery media preview:', {
      postId: post.id.substring(0, 8),
      originalUrl: post.media_url,
      validatedUrl: validatedUrl,
      mediaType: post.media_type
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
                console.error('Failed to load image in style gallery:', {
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
              onError={(e) => {
                console.error('Failed to load video in style gallery:', {
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

  return (
    <div className="pt-20 min-h-screen bg-[#1a1a1a]">
      <div className="overflow-y-auto">
        {/* Top Section */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-4">
            {/* Media Type Filter Tabs */}
            <div className="flex items-center bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
              {(['image', 'video', 'audio'] as const).map((mediaType) => {
                const isActive = selectedMediaType === mediaType;
                const Icon = getMediaTypeIcon(mediaType);
                
                return (
                  <button
                    key={mediaType}
                    onClick={() => handleMediaTypeChange(mediaType)}
                    className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium transition-all duration-300 ${
                      isActive
                        ? 'text-[#7C9A92] bg-black/80'
                        : 'text-[#E0E0E0] hover:bg-black/80'
                    }`}
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
                className="appearance-none bg-black/60 backdrop-blur-sm hover:bg-black/80 text-[#E0E0E0] rounded-lg px-4 py-2 pr-8 font-medium transition-colors text-sm cursor-pointer border border-white/10 outline-none"
              >
                <option value="new" className="bg-black text-[#E0E0E0]">New</option>
                <option value="top" className="bg-black text-[#E0E0E0]">Top</option>
                <option value="hot" className="bg-black text-[#E0E0E0]">Hot</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#E0E0E0] pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && posts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#B8A082] animate-spin mx-auto mb-4" />
                <p className="text-white/70 text-lg">Loading {styleName} creations...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 text-lg mb-2">Failed to load creations</p>
                <p className="text-white/50 text-sm mb-4">{error}</p>
                <button
                  onClick={() => loadPosts(true)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#B8A082]/20 rounded-full flex items-center justify-center">
                  <Palette className="w-8 h-8 text-[#B8A082]" />
                </div>
                <p className="text-white/50 text-lg mb-2">No creations in "{styleName}" yet</p>
                <p className="text-white/30 text-sm mb-4">Be the first to create something in this style!</p>
                <button
                  onClick={onBack}
                  className="px-6 py-2 bg-[#B8A082] hover:bg-[#A69072] text-[#1a1a1a] rounded-xl font-medium transition-colors"
                >
                  Explore Other Styles
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Gallery Grid */}
              <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="bg-white/5 rounded-2xl overflow-hidden hover:bg-white/10 transition-all group border border-white/10 hover:border-white/20 hover:scale-[1.02] transform duration-300 cursor-pointer relative break-inside-avoid"
                  >
                    {/* Media Preview */}
                    {renderMediaPreview(post)}
                    
                    {/* Title Overlay */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black px-3 py-2 rounded-t-lg">
                      <p className="text-muted-teal font-mono text-xs font-medium text-center whitespace-nowrap">
                        {post.title}
                      </p>
                    </div>

                    {/* Username Badge */}
                    {post.username && (
                      <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        @{post.username}
                      </div>
                    )}

                    {/* Debug info overlay (only in development) */}
                    {import.meta.env.DEV && (
                      <div className="absolute top-2 right-2 bg-black/80 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <div>ID: {post.id.substring(0, 8)}...</div>
                        <div>URL: {post.media_url.substring(0, 30)}...</div>
                        <div>Type: {post.media_type}</div>
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
                    <span className="text-white/50 text-sm">Loading more...</span>
                  </div>
                ) : !hasMore ? (
                  <span className="text-white/30 text-sm">You've seen all "{styleName}" creations</span>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};