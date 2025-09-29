import { getPosts, getPostsByUserId, Post, validateAndFixMediaUrl } from '../lib/supabaseUtils';
import { addBreadcrumb, captureError } from '../lib/sentry';
import { DEFAULTS } from '../constants';

interface GalleryViewProps {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPostClick: (post: Post) => void;
  sortOrder: 'newest' | 'oldest' | 'most_liked';
  onSortChange: (sort: 'newest' | 'oldest' | 'most_liked') => void;
  selectedMediaType: 'all' | 'image' | 'video';
  onMediaTypeChange: (type: 'all' | 'image' | 'video') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  artistId?: string;
}

export default function GalleryView({
  posts,
  loading,
  hasMore,
  onLoadMore,
  onPostClick,
  sortOrder,
  onSortChange,
  selectedMediaType,
  onMediaTypeChange,
  searchQuery,
  onSearchChange,
  artistId
}: GalleryViewProps) {
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [localLoading, setLocalLoading] = useState(false);
  const [localHasMore, setLocalHasMore] = useState(hasMore);

  // Update local state when props change
  useEffect(() => {
    setLocalPosts(posts);
    setLocalHasMore(hasMore);
  }, [posts, hasMore]);

  const fetchPosts = async (reset = false) => {
    if (localLoading || (!reset && !localHasMore)) return;

    try {
      setLocalLoading(true);
      addBreadcrumb('Fetching posts', { reset, artistId, sortOrder, selectedMediaType, searchQuery });
      
      const offset = reset ? 0 : posts.length;
      
      // NEW: Use different fetch function based on whether we're viewing an artist's profile
      let result;
      if (artistId) {
        result = await getPostsByUserId(artistId, sortOrder, DEFAULTS.GALLERY_PAGE_SIZE, offset, selectedMediaType, searchQuery);
      } else {
        result = await getPosts(sortOrder, DEFAULTS.GALLERY_PAGE_SIZE, offset, selectedMediaType, searchQuery);
      }
      
      const { posts: newPosts, hasMore: moreAvailable } = result;

      if (reset) {
        setLocalPosts(newPosts);
      } else {
        setLocalPosts(prev => [...prev, ...newPosts]);
      }
      
      setLocalHasMore(moreAvailable);
    } catch (error) {
      console.error('Error fetching posts:', error);
      captureError(error as Error, { context: 'GalleryView.fetchPosts' });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchPosts(false);
  };

  const renderMediaPreview = (post: Post) => {
    const validatedUrl = validateAndFixMediaUrl(post.media_url);
    
    if (post.media_type === 'image') {
      return (
        <div className="relative w-full aspect-square">
          <img
            src={validatedUrl}
            alt={post.title}
            className="w-full h-full object-cover shadow-double-border"
            loading="lazy"
            decoding="async"
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
              // Report media loading failure
              captureError(new Error('Image failed to load'), {
                context: 'GalleryView.renderMediaPreview',
                postId: post.id,
                mediaUrl: validatedUrl,
                originalUrl: post.media_url
              });
            }}
          />
          {/* Fallback div - hidden by default */}
          <div className="absolute inset-0 bg-[#2A2A2A] border-2 border-[#B8A082] shadow-double-border hidden items-center justify-center">
            <div className="text-center">
              <Type className="w-16 h-16 text-[#B8A082] mx-auto mb-2" />
              <p className="text-[#B8A082] text-sm">Image unavailable</p>
              <p className="text-[#B8A082]/60 text-xs mt-1">Loading failed</p>
            </div>
          </div>
        </div>
      );
    } else if (post.media_type === 'video') {
      return (
        <div className="relative w-full aspect-square">
          <video
            src={validatedUrl}
            className="w-full h-full object-cover shadow-double-border"
            muted
            preload="metadata"
            loading="lazy"
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
              // Report media loading failure
              captureError(new Error('Video failed to load'), {
                context: 'GalleryView.renderMediaPreview',
                postId: post.id,
                mediaUrl: validatedUrl,
                originalUrl: post.media_url
              });
            }}
          />
          {/* Video play indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-3">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
          {/* Fallback div for video - hidden by default */}
          <div className="absolute inset-0 bg-[#2A2A2A] border-2 border-[#4da0ff] shadow-double-border hidden items-center justify-center">
            <div className="text-center">
              <Play className="w-16 h-16 text-[#4da0ff] mx-auto mb-2" />
              <p className="text-[#4da0ff] text-sm">Video unavailable</p>
              <p className="text-[#4da0ff]/60 text-xs mt-1">Loading failed</p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest' | 'most_liked')}
            className="px-3 py-2 bg-[#2A2A2A] border border-[#B8A082] text-[#F5F5DC] rounded focus:outline-none focus:border-[#D4C4A0]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_liked">Most Liked</option>
          </select>
          
          <select
            value={selectedMediaType}
            onChange={(e) => onMediaTypeChange(e.target.value as 'all' | 'image' | 'video')}
            className="px-3 py-2 bg-[#2A2A2A] border border-[#B8A082] text-[#F5F5DC] rounded focus:outline-none focus:border-[#D4C4A0]"
          >
            <option value="all">All Media</option>
            <option value="image">Images Only</option>
            <option value="video">Videos Only</option>
          </select>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#B8A082]" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 bg-[#2A2A2A] border border-[#B8A082] text-[#F5F5DC] rounded focus:outline-none focus:border-[#D4C4A0] w-full sm:w-64"
          />
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {localPosts.map((post) => (
          <div
            key={post.id}
            className="bg-[#2A2A2A] border-2 border-[#B8A082] shadow-double-border cursor-pointer hover:border-[#D4C4A0] transition-colors"
            onClick={() => onPostClick(post)}
          >
            {renderMediaPreview(post)}
            
            <div className="p-4">
              <h3 className="text-[#F5F5DC] font-semibold mb-2 line-clamp-2">{post.title}</h3>
              <div className="flex items-center justify-between text-sm text-[#B8A082]">
                <span>By {post.artist_name}</span>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>{post.likes_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {localHasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={localLoading}
            className="px-6 py-3 bg-[#B8A082] text-[#2A2A2A] font-semibold rounded hover:bg-[#D4C4A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && localPosts.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="text-[#B8A082]">Loading posts...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && localPosts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[#B8A082] text-lg mb-2">No posts found</div>
          <div className="text-[#B8A082]/60">Try adjusting your search or filters</div>
        </div>
      )}
    </div>
  );
}