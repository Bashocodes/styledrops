// import { supabase } from './supabase';
import { captureError, addBreadcrumb } from './sentry';
import { AnalysisResult } from '../constants/modules';
// import { deleteFileFromR2, extractKeyFromUrl } from './r2';
import { mockPosts, getPostsByStyleMock } from '../mockData';

// Commented out interfaces that depend on Supabase
// export interface BookmarkedAnalysis { ... }

// export interface PostData { ... }

export interface Post {
  id: string;
  user_id?: string;
  username?: string;
  media_url: string; // R2 CDN URL
  media_type: 'image' | 'video' | 'audio';
  title: string;
  style: string;
  analysis_data: any;
  created_at: string;
  thumbnail_url?: string;
  likes_count?: number;
  r2_key?: string;
}

// Commented out Supabase-dependent functions
// export const saveAnalysisToDatabase = async (...) => { ... }
// export const createPost = async (...) => { ... }
// export const deletePost = async (...) => { ... }
// export const updateUserProfileUsername = async (...) => { ... }
// export const getUserProfile = async (...) => { ... }
// export const checkIfAnalysisIsPosted = async (...) => { ... }
// export const addBookmark = async (...) => { ... }
// export const removeBookmark = async (...) => { ... }
// export const isBookmarked = async (...) => { ... }
// export const fetchBookmarkedAnalyses = async (...) => { ... }

// Mock implementation of getPosts using mock data

export const getPosts = async (
  sortOrder: 'new' | 'top' | 'hot' = 'new',
  limit: number = 12,
  offset: number = 0,
  mediaType: 'image' | 'video' | 'audio' = 'image',
  searchQuery?: string
): Promise<{ posts: Post[]; hasMore: boolean }> => {
  try {
    addBreadcrumb('Fetching posts', 'database', { sortOrder, limit, offset, mediaType, searchQuery });

    // Filter mock posts by media type
    let filteredPosts = mockPosts.filter(post => post.media_type === mediaType);

    // Apply search filter if query is provided
    if (searchQuery && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim().toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        post.title.toLowerCase().includes(trimmedQuery) ||
        post.style.toLowerCase().includes(trimmedQuery) ||
        post.analysis_data.prompt.toLowerCase().includes(trimmedQuery)
      );
    }

    // Apply sorting
    filteredPosts.sort((a, b) => {
      switch (sortOrder) {
        case 'top':
          return (b.likes_count || 0) - (a.likes_count || 0);
        case 'hot':
          return (b.likes_count || 0) - (a.likes_count || 0);
        case 'new':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // Apply pagination
    const paginatedPosts = filteredPosts.slice(offset, offset + limit);
    const hasMore = filteredPosts.length > offset + limit;

    console.log('Mock posts fetched with sorting and filtering:', {
      sortOrder,
      mediaType,
      searchQuery,
      count: paginatedPosts.length,
      hasMore
    });

    addBreadcrumb('Posts fetched successfully', 'database', { 
      sortOrder,
      mediaType,
      searchQuery,
      count: paginatedPosts.length,
      hasMore 
    });

    return { posts: paginatedPosts, hasMore };
  } catch (error) {
    captureError(error as Error, { context: 'getPosts' });
    return { posts: [], hasMore: false };
  }
};

// Mock implementation of getPostsByStyle using mock data

export const getPostsByStyle = async (
  style: string,
  sortOrder: 'new' | 'top' | 'hot' = 'new',
  limit: number = 12,
  offset: number = 0,
  mediaType: 'image' | 'video' | 'audio' = 'image',
  searchQuery?: string
): Promise<{ posts: Post[]; hasMore: boolean }> => {
  try {
    addBreadcrumb('Fetching posts by style', 'database', { style, sortOrder, limit, offset, mediaType, searchQuery });

    // Filter mock posts by style and media type
    let filteredPosts = getPostsByStyleMock(style).filter(post => post.media_type === mediaType);

    // Apply search filter if query is provided
    if (searchQuery && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim().toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        post.title.toLowerCase().includes(trimmedQuery) ||
        post.analysis_data.prompt.toLowerCase().includes(trimmedQuery)
      );
    }

    // Apply sorting
    filteredPosts.sort((a, b) => {
      switch (sortOrder) {
        case 'top':
          return (b.likes_count || 0) - (a.likes_count || 0);
        case 'hot':
          return (b.likes_count || 0) - (a.likes_count || 0);
        case 'new':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // Apply pagination
    const paginatedPosts = filteredPosts.slice(offset, offset + limit);
    const hasMore = filteredPosts.length > offset + limit;

    addBreadcrumb('Posts by style fetched successfully', 'database', { 
      style,
      sortOrder,
      mediaType,
      searchQuery,
      count: paginatedPosts.length,
      hasMore 
    });

    return { posts: paginatedPosts, hasMore };
  } catch (error) {
    captureError(error as Error, { context: 'getPostsByStyle' });
    return { posts: [], hasMore: false };
  }
};

// Helper function to validate and fix media URLs
export const validateAndFixMediaUrl = (url: string): string => {
  try {
    console.log('validateAndFixMediaUrl input:', url);
    
    // If it's already a valid HTTP URL, check if it needs fixing
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Check for malformed R2 URLs that are missing a slash
      // Pattern: https://domain.r2.devposts/file.ext (missing slash after .dev)
      const malformedR2Pattern = /^(https?:\/\/[^\/]+\.r2\.dev)([^\/])/;
      const match = url.match(malformedR2Pattern);
      
      if (match) {
        const fixedUrl = `${match[1]}/${match[2]}`;
        console.log('Fixed malformed R2 URL:', { original: url, fixed: fixedUrl });
        return fixedUrl;
      }
      
      return url;
    }
    
    return url;
  } catch (error) {
    console.error('Error validating/fixing media URL:', error);
    return url;
  }
};