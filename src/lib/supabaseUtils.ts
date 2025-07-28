import { supabase } from './supabase';
import { captureError, addBreadcrumb } from './sentry';
import { AnalysisResult } from '../constants/modules';
import { deleteFileFromR2, extractKeyFromUrl } from './r2';

export interface BookmarkedAnalysis {
  id: string;
  analysis_id: string;
  created_at: string;
  analysis: {
    id: string;
    data: any;
    analysis_type: string;
    created_at: string;
    image: {
      id: string;
      storage_path: string;
      original_filename: string;
      mime_type: string;
      user_id: string;
    } | null;
  };
}

export interface PostData {
  user_id: string;
  username: string;
  media_url: string; // Now points to R2 CDN URL
  media_type: 'image' | 'video' | 'audio';
  title: string;
  style: string;
  analysis_data: any;
  thumbnail_url?: string;
  r2_key?: string; // NEW: Store R2 key for deletion
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  media_url: string; // R2 CDN URL
  media_type: 'image' | 'video' | 'audio';
  title: string;
  style: string;
  analysis_data: any;
  created_at: string;
  thumbnail_url?: string;
  likes_count?: number;
  r2_key?: string; // NEW: R2 key for deletion
}

// NEW: Profile update interface
export interface ProfileUpdateData {
  username?: string;
  full_name?: string;
  bio?: string;
}

// Save analysis with R2 media URL (no file upload to Supabase)
export const saveAnalysisToDatabase = async (
  mediaUrl: string, // R2 CDN URL
  r2Key: string, // R2 object key
  userId: string, 
  analysisResult: AnalysisResult,
  originalFilename: string,
  fileSize: number,
  mimeType: string
): Promise<string> => {
  try {
    addBreadcrumb('Starting analysis save with R2 URL', 'database', { userId, mediaUrl });

    // Step 1: Insert into images table (store R2 info instead of Supabase storage)
    const imageInsertData = {
      user_id: userId,
      storage_path: r2Key, // Store R2 key instead of Supabase path
      original_filename: originalFilename,
      file_size: fileSize,
      mime_type: mimeType
    };

    console.log('Inserting image metadata with R2 info:', imageInsertData);

    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .insert(imageInsertData)
      .select()
      .single();

    if (imageError) {
      console.error('Error inserting image metadata:', imageError);
      captureError(new Error(imageError.message), { 
        context: 'insertImageMetadata',
        errorCode: imageError.code,
        insertData: imageInsertData
      });
      throw new Error(`Failed to save image metadata: ${imageError.message}`);
    }

    addBreadcrumb('Image metadata saved', 'database', { imageId: imageData.id });

    // Step 2: Insert into analyses table
    const analysisInsertData = {
      image_id: imageData.id,
      data: analysisResult,
      analysis_type: getAnalysisTypeFromMimeType(mimeType)
    };

    console.log('Inserting analysis data:', { 
      imageId: imageData.id,
      analysisDataKeys: Object.keys(analysisResult)
    });

    const { data: analysisData, error: analysisError } = await supabase
      .from('analyses')
      .insert(analysisInsertData)
      .select()
      .single();

    if (analysisError) {
      console.error('Error inserting analysis:', analysisError);
      
      // Clean up image metadata on analysis failure
      try {
        await supabase.from('images').delete().eq('id', imageData.id);
        console.log('Cleaned up image data after analysis insert failure');
      } catch (cleanupError) {
        console.error('Failed to cleanup after analysis insert failure:', cleanupError);
      }
      
      captureError(new Error(analysisError.message), { 
        context: 'insertAnalysisData',
        errorCode: analysisError.code,
        imageId: imageData.id
      });
      throw new Error(`Failed to save analysis data: ${analysisError.message}`);
    }

    addBreadcrumb('Analysis saved successfully', 'database', { analysisId: analysisData.id });
    console.log('Analysis saved successfully with UUID:', analysisData.id);

    // Return the analysis UUID
    return analysisData.id;
  } catch (error) {
    captureError(error as Error, { context: 'saveAnalysisToDatabase' });
    throw error;
  }
};

const getAnalysisTypeFromMimeType = (mimeType: string): string => {
  const type = mimeType.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'image';
};

export const createPost = async (postData: PostData): Promise<Post> => {
  try {
    addBreadcrumb('Creating new post with R2 URL', 'database', { 
      userId: postData.user_id,
      mediaType: postData.media_type,
      title: postData.title,
      mediaUrl: postData.media_url,
      hasThumbnail: !!postData.thumbnail_url,
      hasR2Key: !!postData.r2_key
    });

    console.log('Creating post with R2 data:', {
      userId: postData.user_id,
      mediaUrl: postData.media_url,
      mediaType: postData.media_type,
      title: postData.title,
      isValidUrl: postData.media_url.startsWith('http'),
      hasThumbnail: !!postData.thumbnail_url,
      r2Key: postData.r2_key
    });

    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      captureError(new Error(error.message), { 
        context: 'createPost',
        postData: postData,
        errorCode: error.code
      });
      throw error;
    }

    console.log('Post created successfully with R2 URL:', {
      postId: data.id,
      mediaUrl: data.media_url,
      thumbnailUrl: data.thumbnail_url,
      r2Key: data.r2_key
    });

    addBreadcrumb('Post created successfully', 'database', { 
      postId: data.id,
      hasThumbnail: !!data.thumbnail_url,
      hasR2Key: !!data.r2_key
    });
    return data;
  } catch (error) {
    captureError(error as Error, { context: 'createPost' });
    throw error;
  }
};

// Delete post and associated R2 objects
export const deletePost = async (postId: string, userId: string): Promise<void> => {
  try {
    addBreadcrumb('Deleting post and R2 objects', 'database', { postId, userId });

    // First, get the post to extract R2 keys
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('r2_key, thumbnail_url, media_url')
      .eq('id', postId)
      .eq('user_id', userId) // Ensure user owns the post
      .single();

    if (fetchError) {
      console.error('Error fetching post for deletion:', fetchError);
      throw new Error(`Failed to fetch post: ${fetchError.message}`);
    }

    if (!post) {
      throw new Error('Post not found or access denied');
    }

    // Delete from R2 if we have keys
    const deletePromises: Promise<void>[] = [];

    if (post.r2_key) {
      deletePromises.push(deleteFileFromR2(post.r2_key));
    }

    // Extract thumbnail key from URL if present
    if (post.thumbnail_url) {
      const thumbnailKey = extractKeyFromUrl(post.thumbnail_url);
      if (thumbnailKey) {
        deletePromises.push(deleteFileFromR2(thumbnailKey));
      }
    }

    // Extract main media key from URL if no r2_key stored
    if (!post.r2_key && post.media_url) {
      const mediaKey = extractKeyFromUrl(post.media_url);
      if (mediaKey) {
        deletePromises.push(deleteFileFromR2(mediaKey));
      }
    }

    // Delete from R2 (don't fail if R2 deletion fails)
    try {
      await Promise.all(deletePromises);
      addBreadcrumb('R2 objects deleted successfully', 'database', { postId });
    } catch (r2Error) {
      console.warn('Failed to delete some R2 objects:', r2Error);
      captureError(r2Error as Error, { context: 'deletePostR2Objects', postId });
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting post from database:', deleteError);
      throw new Error(`Failed to delete post: ${deleteError.message}`);
    }

    addBreadcrumb('Post deleted successfully', 'database', { postId });
  } catch (error) {
    captureError(error as Error, { context: 'deletePost', postId, userId });
    throw error;
  }
};

// NEW: Update user profile username
export const updateUserProfileUsername = async (userId: string, newUsername: string): Promise<void> => {
  try {
    addBreadcrumb('Updating user profile username', 'database', { userId, newUsername });

    // First check if username is already taken
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', newUsername)
      .neq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      console.error('Error checking username availability:', checkError);
      throw new Error(`Failed to check username availability: ${checkError.message}`);
    }

    if (existingUser) {
      throw new Error('Username is already taken');
    }

    // Check if user can change username (30-day restriction)
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('last_username_change_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching current profile:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (currentProfile.last_username_change_at) {
      const lastChange = new Date(currentProfile.last_username_change_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (lastChange > thirtyDaysAgo) {
        const daysRemaining = Math.ceil((lastChange.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
        throw new Error(`You can only change your username once every 30 days. Please wait ${daysRemaining} more days.`);
      }
    }

    // Update the username and last_username_change_at
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: newUsername,
        last_username_change_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating username:', updateError);
      throw new Error(`Failed to update username: ${updateError.message}`);
    }

    addBreadcrumb('Username updated successfully', 'database', { userId, newUsername });
  } catch (error) {
    captureError(error as Error, { context: 'updateUserProfileUsername', userId, newUsername });
    throw error;
  }
};

// NEW: Get user profile data
export const getUserProfile = async (userId: string) => {
  try {
    addBreadcrumb('Fetching user profile', 'database', { userId });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    addBreadcrumb('User profile fetched successfully', 'database', { userId });
    return data;
  } catch (error) {
    captureError(error as Error, { context: 'getUserProfile', userId });
    throw error;
  }
};

export const getPosts = async (
  sortOrder: 'new' | 'top' | 'hot' = 'new',
  limit: number = 12,
  offset: number = 0,
  mediaType: 'image' | 'video' | 'audio' = 'image',
  searchQuery?: string
): Promise<{ posts: Post[]; hasMore: boolean }> => {
  try {
    addBreadcrumb('Fetching posts', 'database', { sortOrder, limit, offset, mediaType, searchQuery });

    let query = supabase
      .from('posts')
      .select('*')
      .eq('media_type', mediaType)
      .range(offset, offset + limit);

    // Add search filter if query is provided
    if (searchQuery && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      query = query.or(`title.ilike.%${trimmedQuery}%,style.ilike.%${trimmedQuery}%,analysis_data->>prompt.ilike.%${trimmedQuery}%`);
    }

    // Apply sorting based on the selected order
    switch (sortOrder) {
      case 'top':
        // Sort by likes_count in descending order, then by created_at for ties
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'hot':
        // For 'hot', we can use a combination of likes and recency
        // For now, we'll use likes_count as primary sort, but this could be enhanced
        // with a more complex algorithm that considers both likes and time
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'new':
      default:
        // Sort by creation date in descending order (newest first)
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      captureError(new Error(error.message), { 
        context: 'getPosts',
        sortOrder,
        limit,
        offset,
        mediaType,
        searchQuery,
        errorCode: error.code
      });
      throw error;
    }

    const posts = data || [];
    const hasMore = posts.length > limit;
    const actualPosts = hasMore ? posts.slice(0, limit) : posts;

    // Log post details for debugging
    console.log('Posts fetched with sorting and filtering:', {
      sortOrder,
      mediaType,
      searchQuery,
      count: actualPosts.length,
      samplePosts: actualPosts.slice(0, 3).map(p => ({
        id: p.id.substring(0, 8),
        title: p.title,
        media_type: p.media_type,
        likes_count: p.likes_count || 0,
        created_at: p.created_at,
        isR2Url: p.media_url.includes('r2.cloudflarestorage.com') || p.media_url.includes('cdn.'),
        hasThumbnail: !!p.thumbnail_url,
        hasR2Key: !!p.r2_key
      }))
    });

    addBreadcrumb('Posts fetched successfully', 'database', { 
      sortOrder,
      mediaType,
      searchQuery,
      count: actualPosts.length,
      hasMore 
    });

    return { posts: actualPosts, hasMore };
  } catch (error) {
    captureError(error as Error, { context: 'getPosts' });
    return { posts: [], hasMore: false };
  }
};

export const getPostsByUserId = async (
  userId: string,
  sortOrder: 'new' | 'top' | 'hot' = 'new',
  limit: number = 12,
  offset: number = 0,
  mediaType: 'image' | 'video' | 'audio' = 'image',
  searchQuery?: string
): Promise<{ posts: Post[]; hasMore: boolean }> => {
  try {
    addBreadcrumb('Fetching posts by user ID', 'database', { userId, sortOrder, limit, offset, mediaType, searchQuery });

    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('media_type', mediaType)
      .range(offset, offset + limit);

    // Add search filter if query is provided
    if (searchQuery && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      query = query.or(`title.ilike.%${trimmedQuery}%,style.ilike.%${trimmedQuery}%,analysis_data->>prompt.ilike.%${trimmedQuery}%`);
    }

    // Apply sorting based on the selected order
    switch (sortOrder) {
      case 'top':
        // Sort by likes_count in descending order, then by created_at for ties
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'hot':
        // For 'hot', use likes_count as primary sort with recency as secondary
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'new':
      default:
        // Sort by creation date in descending order (newest first)
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts by user ID:', error);
      captureError(new Error(error.message), { 
        context: 'getPostsByUserId',
        userId,
        sortOrder,
        limit,
        offset,
        mediaType,
        searchQuery,
        errorCode: error.code
      });
      throw error;
    }

    const posts = data || [];
    const hasMore = posts.length > limit;
    const actualPosts = hasMore ? posts.slice(0, limit) : posts;

    addBreadcrumb('Posts by user ID fetched successfully', 'database', { 
      userId,
      sortOrder,
      mediaType,
      searchQuery,
      count: actualPosts.length,
      hasMore 
    });

    return { posts: actualPosts, hasMore };
  } catch (error) {
    captureError(error as Error, { context: 'getPostsByUserId' });
    return { posts: [], hasMore: false };
  }
};

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

    let query = supabase
      .from('posts')
      .select('*')
      .eq('style', style)
      .eq('media_type', mediaType)
      .range(offset, offset + limit);

    // Add search filter if query is provided
    if (searchQuery && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      query = query.or(`title.ilike.%${trimmedQuery}%,analysis_data->>prompt.ilike.%${trimmedQuery}%`);
    }

    // Apply sorting based on the selected order
    switch (sortOrder) {
      case 'top':
        // Sort by likes_count in descending order, then by created_at for ties
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'hot':
        // For 'hot', use likes_count as primary sort with recency as secondary
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'new':
      default:
        // Sort by creation date in descending order (newest first)
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts by style:', error);
      captureError(new Error(error.message), { 
        context: 'getPostsByStyle',
        style,
        sortOrder,
        limit,
        offset,
        mediaType,
        searchQuery,
        errorCode: error.code
      });
      throw error;
    }

    const posts = data || [];
    const hasMore = posts.length > limit;
    const actualPosts = hasMore ? posts.slice(0, limit) : posts;

    addBreadcrumb('Posts by style fetched successfully', 'database', { 
      style,
      sortOrder,
      mediaType,
      searchQuery,
      count: actualPosts.length,
      hasMore 
    });

    return { posts: actualPosts, hasMore };
  } catch (error) {
    captureError(error as Error, { context: 'getPostsByStyle' });
    return { posts: [], hasMore: false };
  }
};

// NEW: Get a single post by its ID
export const getPostById = async (postId: string): Promise<Post | null> => {
  try {
    addBreadcrumb('Fetching single post by ID', 'database', { postId });

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        console.warn('Post not found:', postId);
        return null;
      }
      console.error('Error fetching single post:', error);
      captureError(new Error(error.message), {
        context: 'getPostById',
        postId,
        errorCode: error.code
      });
      throw error;
    }

    addBreadcrumb('Single post fetched successfully', 'database', { postId });
    return data;
  } catch (error) {
    captureError(error as Error, { context: 'getPostById' });
    return null;
  }
};

export const checkIfAnalysisIsPosted = async (analysisId: string): Promise<boolean> => {
  try {
    console.log('DEBUG: checkIfAnalysisIsPosted called', {
      analysisId: analysisId,
      analysisIdType: typeof analysisId,
      analysisIdLength: analysisId ? analysisId.length : 0
    });

    addBreadcrumb('Checking if analysis is already posted', 'database', { analysisId });
    
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('analysis_data->>id', analysisId)
      .limit(1);

    console.log('DEBUG: checkIfAnalysisIsPosted database response', {
      analysisId: analysisId,
      hasData: !!data,
      dataLength: data?.length || 0,
      dataValue: data,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message
    });

    if (error) {
      console.error('Error checking if analysis is posted:', error);
      captureError(new Error(error.message), { 
        context: 'checkIfAnalysisIsPosted',
        analysisId,
        errorCode: error.code
      });
      throw error;
    }

    const isPosted = data && data.length > 0;
    
    console.log('DEBUG: checkIfAnalysisIsPosted final result', {
      analysisId: analysisId,
      isPosted: isPosted,
      isPostedType: typeof isPosted
    });

    addBreadcrumb('Analysis post status checked', 'database', { analysisId, isPosted });
    return isPosted;
  } catch (error) {
    console.log('DEBUG: checkIfAnalysisIsPosted error caught', {
      analysisId: analysisId,
      error: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    captureError(error as Error, { context: 'checkIfAnalysisIsPosted' });
    return false;
  }
};

export const addBookmark = async (userId: string, analysisId: string): Promise<void> => {
  try {
    addBreadcrumb('Adding bookmark', 'database', { userId, analysisId });
    
    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        analysis_id: analysisId
      });

    if (error) {
      console.error('Error adding bookmark:', error);
      captureError(new Error(error.message), { 
        context: 'addBookmark',
        userId,
        analysisId,
        errorCode: error.code
      });
      throw error;
    }

    addBreadcrumb('Bookmark added successfully', 'database');
  } catch (error) {
    captureError(error as Error, { context: 'addBookmark' });
    throw error;
  }
};

export const removeBookmark = async (userId: string, analysisId: string): Promise<void> => {
  try {
    addBreadcrumb('Removing bookmark', 'database', { userId, analysisId });
    
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('analysis_id', analysisId);

    if (error) {
      console.error('Error removing bookmark:', error);
      captureError(new Error(error.message), { 
        context: 'removeBookmark',
        userId,
        analysisId,
        errorCode: error.code
      });
      throw error;
    }

    addBreadcrumb('Bookmark removed successfully', 'database');
  } catch (error) {
    captureError(error as Error, { context: 'removeBookmark' });
    throw error;
  }
};

export const isBookmarked = async (userId: string, analysisId: string): Promise<boolean> => {
  try {
    addBreadcrumb('Checking bookmark status', 'database', { userId, analysisId });
    
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('analysis_id', analysisId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking bookmark:', error);
      captureError(new Error(error.message), { 
        context: 'isBookmarked',
        userId,
        analysisId,
        errorCode: error.code
      });
      throw error;
    }

    return !!data;
  } catch (error) {
    captureError(error as Error, { context: 'isBookmarked' });
    return false;
  }
};

export const fetchBookmarkedAnalyses = async (userId: string): Promise<BookmarkedAnalysis[]> => {
  try {
    addBreadcrumb('Fetching bookmarked analyses', 'database', { userId });
    
    console.log('ENHANCED QUERY: Starting fetchBookmarkedAnalyses with improved error handling', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Step 1: Get bookmarks for the user
    const { data: bookmarksData, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('id, analysis_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('ENHANCED QUERY: Bookmarks query result', {
      hasData: !!bookmarksData,
      dataLength: bookmarksData?.length || 0,
      hasError: !!bookmarksError,
      errorDetails: bookmarksError ? {
        message: bookmarksError.message,
        code: bookmarksError.code,
        details: bookmarksError.details,
        hint: bookmarksError.hint
      } : null
    });

    if (bookmarksError) {
      console.error('ENHANCED ERROR: Bookmarks query failed', {
        error: bookmarksError,
        userId,
        context: 'fetchBookmarkedAnalyses_bookmarks'
      });
      
      captureError(new Error(bookmarksError.message), { 
        context: 'fetchBookmarkedAnalyses_bookmarks',
        userId,
        errorCode: bookmarksError.code,
        errorDetails: bookmarksError.details
      });
      throw bookmarksError;
    }

    if (!bookmarksData || bookmarksData.length === 0) {
      console.log('ENHANCED QUERY: No bookmarks found for user', { userId });
      addBreadcrumb('No bookmarks found', 'database', { userId });
      return [];
    }

    console.log('ENHANCED QUERY: Found bookmarks, fetching analyses', {
      bookmarkCount: bookmarksData.length,
      analysisIds: bookmarksData.map(b => b.analysis_id)
    });

    // Step 2: Get analyses data
    const analysisIds = bookmarksData.map(b => b.analysis_id);
    const { data: analysesData, error: analysesError } = await supabase
      .from('analyses')
      .select('id, data, analysis_type, created_at, image_id')
      .in('id', analysisIds);

    if (analysesError) {
      console.error('ENHANCED ERROR: Analyses query failed', {
        error: analysesError,
        analysisIds,
        context: 'fetchBookmarkedAnalyses_analyses'
      });
      
      captureError(new Error(analysesError.message), { 
        context: 'fetchBookmarkedAnalyses_analyses',
        analysisIds,
        errorCode: analysesError.code
      });
      throw analysesError;
    }

    // Step 3: Get images data if we have image IDs
    const imageIds = analysesData?.map(a => a.image_id).filter(Boolean) || [];
    let imagesData: any[] = [];
    
    if (imageIds.length > 0) {
      const { data: fetchedImages, error: imagesError } = await supabase
        .from('images')
        .select('id, storage_path, original_filename, mime_type, user_id')
        .in('id', imageIds);

      if (imagesError) {
        console.error('ENHANCED ERROR: Images query failed', {
          error: imagesError,
          imageIds,
          context: 'fetchBookmarkedAnalyses_images'
        });
        
        captureError(new Error(imagesError.message), { 
          context: 'fetchBookmarkedAnalyses_images',
          imageIds,
          errorCode: imagesError.code
        });
        // Continue without image data - don't fail the entire operation
        console.warn('Continuing without image data due to images query failure');
      } else {
        imagesData = fetchedImages || [];
      }
    }

    // Step 4: Combine all data with enhanced error handling
    const result: BookmarkedAnalysis[] = bookmarksData.map(bookmark => {
      const analysis = analysesData?.find(a => a.id === bookmark.analysis_id);
      const image = analysis ? imagesData.find(i => i.id === analysis.image_id) : null;

      // Enhanced validation of analysis data
      let validatedAnalysisData = {};
      if (analysis?.data) {
        try {
          // Ensure analysis data has required fields
          validatedAnalysisData = {
            title: analysis.data.title || 'Untitled',
            style: analysis.data.style || 'Unknown Style',
            prompt: analysis.data.prompt || 'No description available',
            keyTokens: Array.isArray(analysis.data.keyTokens) ? analysis.data.keyTokens : [],
            creativeRemixes: Array.isArray(analysis.data.creativeRemixes) ? analysis.data.creativeRemixes : [],
            outpaintingPrompts: Array.isArray(analysis.data.outpaintingPrompts) ? analysis.data.outpaintingPrompts : [],
            animationPrompts: Array.isArray(analysis.data.animationPrompts) ? analysis.data.animationPrompts : [],
            musicPrompts: Array.isArray(analysis.data.musicPrompts) ? analysis.data.musicPrompts : [],
            dialoguePrompts: Array.isArray(analysis.data.dialoguePrompts) ? analysis.data.dialoguePrompts : [],
            storyPrompts: Array.isArray(analysis.data.storyPrompts) ? analysis.data.storyPrompts : [],
            ...analysis.data // Include any additional fields
          };
        } catch (dataError) {
          console.error('Error validating analysis data:', dataError, analysis.data);
          captureError(dataError as Error, { 
            context: 'validateAnalysisData',
            analysisId: analysis.id,
            bookmarkId: bookmark.id
          });
          // Use fallback data
          validatedAnalysisData = {
            title: 'Data Error',
            style: 'Unknown Style',
            prompt: 'Analysis data could not be loaded',
            keyTokens: [],
            creativeRemixes: [],
            outpaintingPrompts: [],
            animationPrompts: [],
            musicPrompts: [],
            dialoguePrompts: [],
            storyPrompts: []
          };
        }
      }

      return {
        id: bookmark.id,
        analysis_id: bookmark.analysis_id,
        created_at: bookmark.created_at,
        analysis: {
          id: analysis?.id || bookmark.analysis_id,
          data: validatedAnalysisData,
          analysis_type: analysis?.analysis_type || 'unknown',
          created_at: analysis?.created_at || bookmark.created_at,
          image: image || null
        }
      };
    });

    console.log('ENHANCED QUERY: Successfully processed bookmark data', {
      resultCount: result.length,
      hasAnalysisData: result.filter(r => r.analysis.data && Object.keys(r.analysis.data).length > 0).length,
      hasImageData: result.filter(r => r.analysis.image).length,
      validAnalyses: result.filter(r => r.analysis.data.title !== 'Data Error').length
    });

    addBreadcrumb('Bookmarked analyses fetched successfully', 'database', { 
      count: result.length,
      method: 'enhanced_error_handling'
    });
    
    return result;
  } catch (error) {
    console.error('ENHANCED ERROR: fetchBookmarkedAnalyses failed', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      userId,
      context: 'fetchBookmarkedAnalyses_catch'
    });
    
    captureError(error as Error, { 
      context: 'fetchBookmarkedAnalyses_catch',
      userId,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name
    });
    
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Helper function to get R2 URL from storage path (for backward compatibility)
export const getImageUrl = (storagePath: string): string => {
  try {
    // If it's already a full URL (R2 CDN), return as is
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath;
    }
    
    // If it's an R2 key, construct the full URL
    const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
    if (publicBaseUrl && !storagePath.startsWith('http')) {
      return `${publicBaseUrl}${storagePath}`;
    }
    
    // Fallback to Supabase storage for legacy data
    const { data: imagesData } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath);
    
    console.log('Image URL generated from legacy Supabase storage:', imagesData?.publicUrl);
    return imagesData?.publicUrl || '';
  } catch (error) {
    console.error('Error generating image URL:', error);
    captureError(error as Error, { context: 'getImageUrl', storagePath });
    return '';
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
    
    // If it looks like a storage path, try to generate the public URL
    if (url.includes('/') && !url.startsWith('http')) {
      console.log('Attempting to fix storage path URL:', url);
      return getImageUrl(url);
    }
    
    return url;
  } catch (error) {
    console.error('Error validating/fixing media URL:', error);
    return url;
  }
};