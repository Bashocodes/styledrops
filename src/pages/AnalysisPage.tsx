import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Type, Play, Volume2, Check, X, AlertTriangle, RefreshCw, Trash2, Loader2, Copy } from 'lucide-react';
import { AnalysisResult, TOP_MODULES, BOTTOM_MODULES, ModuleDefinition } from '../constants/modules';
import { AnalysisContent } from '../components/AnalysisContent';
import { useAuth } from '../hooks/useAuth';
import { addBreadcrumb, captureError } from '../lib/sentry';
import { createPost, PostData, checkIfAnalysisIsPosted, deletePost } from '../lib/supabaseUtils';
import { uploadFileToR2, extractKeyFromUrl } from '../lib/r2';

interface AnalysisPageProps {
  analysis?: AnalysisResult;
  mediaUrl: string; // This will now be an R2 CDN URL
  mediaType: 'image' | 'video' | 'audio';
  artistUsername?: string;
  artistId?: string;
  postId?: string; // NEW: Post ID for deletion functionality
  onBack: () => void;
  onTextClick?: (text: string) => void;
  isTextOnlyAnalysis?: boolean;
  selectedMediaFile?: File;
  thumbnailFile?: File;
  onViewArtistProfile?: (artistId: string) => void;
  isFromDecodePage?: boolean;
  onViewStyleGallery?: (style: string) => void;
  onPostDeleted?: () => void; // NEW: Callback for when post is deleted
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  analysis,
  mediaUrl, // Now R2 CDN URL
  mediaType,
  artistUsername,
  artistId,
  postId, // NEW: Post ID prop
  onBack,
  onTextClick,
  isTextOnlyAnalysis = false,
  selectedMediaFile,
  thumbnailFile,
  onViewArtistProfile,
  isFromDecodePage = false,
  onViewStyleGallery,
  onPostDeleted // NEW: Post deletion callback
}) => {
  const { user, loading: authLoading } = useAuth();
  const [activeTopModule, setActiveTopModule] = useState<string>(TOP_MODULES[0].id);
  const [activeBottomModule, setActiveBottomModule] = useState<string>(BOTTOM_MODULES[0].id);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isAlreadyPosted, setIsAlreadyPosted] = useState(false);
  const [checkingPostStatus, setCheckingPostStatus] = useState(false);

  // NEW: Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPromptIndices, setCurrentPromptIndices] = useState<Record<string, number>>({
    story: 0,
    motion: 0,
    dialogue: 0,
    mix: 0,
    expand: 0,
    sound: 0
  });

  const [animatingModuleId, setAnimatingModuleId] = useState<string | null>(null);

  // NEW: Editable prompt state
  const [editablePrompt, setEditablePrompt] = useState<string>('');

  // NEW: Style Codes state
  const [styleCodes, setStyleCodes] = useState<string>('');

  // NEW: Copy feedback state for style codes
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const currentAnalysis = analysis;

  if (!currentAnalysis) {
    throw new Error('Analysis data is required');
  }

  // Initialize editable prompt when analysis changes
  useEffect(() => {
    setEditablePrompt(currentAnalysis.prompt);
  }, [currentAnalysis.prompt]);

  const hasValidDatabaseId = currentAnalysis.id && typeof currentAnalysis.id === 'string' && currentAnalysis.id.length === 36;

  console.log('AnalysisPage rendered with R2 URL:', {
    isFromDecodePage,
    hasValidDatabaseId,
    analysisId: currentAnalysis.id,
    mediaUrl: mediaUrl,
    isR2Url: mediaUrl.includes('r2.cloudflarestorage.com') || mediaUrl.includes('cdn.'),
    hasThumbnailFile: !!thumbnailFile,
    postId: postId, // NEW: Log post ID
    canDelete: !!(user && postId && artistId && user.id === artistId) // NEW: Log delete capability
  });

  // Check if analysis is already posted
  useEffect(() => {
    const checkPostStatus = async () => {
      console.log('DEBUG: AnalysisPage - checkPostStatus called', {
        analysisId: currentAnalysis.id,
        hasValidDatabaseId: hasValidDatabaseId,
        analysisIdType: typeof currentAnalysis.id,
        analysisIdLength: currentAnalysis.id ? currentAnalysis.id.length : 0,
        isFromDecodePage: isFromDecodePage
      });

      if (hasValidDatabaseId && !isFromDecodePage) {
        try {
          setCheckingPostStatus(true);
          const alreadyPosted = await checkIfAnalysisIsPosted(currentAnalysis.id!);
          
          console.log('DEBUG: AnalysisPage - checkIfAnalysisIsPosted result', {
            analysisId: currentAnalysis.id,
            alreadyPosted: alreadyPosted,
            resultType: typeof alreadyPosted
          });
          
          setIsAlreadyPosted(alreadyPosted);
          addBreadcrumb('Post status checked', 'ui', { 
            analysisId: currentAnalysis.id,
            alreadyPosted 
          });
        } catch (error) {
          console.error('Failed to check post status:', error);
          captureError(error as Error, { context: 'checkPostStatus' });
          setIsAlreadyPosted(false);
        } finally {
          setCheckingPostStatus(false);
        }
      } else {
        console.log('DEBUG: AnalysisPage - No valid database ID or is from decode page, setting isAlreadyPosted to false', {
          hasValidDatabaseId,
          isFromDecodePage
        });
        setIsAlreadyPosted(false);
      }
    };

    checkPostStatus();
  }, [currentAnalysis.id, hasValidDatabaseId, isFromDecodePage]);

  const getMediaTypeLabel = () => {
    switch (mediaType) {
      case 'image': return 'Image Analysis';
      case 'video': return 'Video Analysis';
      case 'audio': return 'Audio Analysis';
      default: return 'Media Analysis';
    }
  };

  const getMediaTypeIcon = () => {
    switch (mediaType) {
      case 'image': return Type;
      case 'video': return Play;
      case 'audio': return Volume2;
      default: return Type;
    }
  };

  const handlePost = async () => {
    if (!user) {
      addBreadcrumb('User attempted to post without authentication', 'ui');
      alert('Please sign in to post to the gallery');
      return;
    }

    if (!hasValidDatabaseId) {
      addBreadcrumb('User attempted to post analysis without database ID', 'ui');
      alert('This analysis could not be saved to the database and cannot be posted to the gallery. Please try analyzing the media again.');
      return;
    }

    if (isAlreadyPosted) {
      addBreadcrumb('User attempted to post already posted analysis', 'ui');
      alert('This analysis has already been posted to the gallery.');
      return;
    }

    if (!user.username) {
      addBreadcrumb('User attempted to post without username', 'ui');
      alert('Please set a username in your profile to post to the gallery');
      return;
    }

    try {
      setIsPosting(true);
      setPostStatus('idle');
      addBreadcrumb('User initiated post to gallery with R2 URL', 'ui');

      let finalMediaUrl = mediaUrl; // Should already be R2 CDN URL
      let r2Key = extractKeyFromUrl(mediaUrl); // Extract R2 key from URL
      let thumbnailUrl: string | undefined;

      // If we have a selected media file, upload it to R2 (for decode page)
      if (selectedMediaFile) {
        console.log('Uploading media file for post to R2:', {
          fileName: selectedMediaFile.name,
          fileSize: selectedMediaFile.size,
          fileType: selectedMediaFile.type
        });
        
        addBreadcrumb('Uploading media file to R2 for post', 'ui');
        
        const ext = '.' + selectedMediaFile.name.split('.').pop()?.toLowerCase();
        
        // Get presigned URL from Netlify Function
        const signResponse = await fetch(`/.netlify/functions/r2-sign?contentType=${selectedMediaFile.type}&ext=${ext}&folder=posts`);
        const signResult = await signResponse.json();

        if (!signResponse.ok || signResult.error) {
          throw new Error(signResult.error || 'Failed to get presigned URL from Netlify Function');
        }

        await uploadFileToR2(selectedMediaFile, signResult.uploadUrl);
        finalMediaUrl = signResult.publicUrl;
        r2Key = signResult.key;
        
        console.log('Media file uploaded for post to R2:', {
          originalUrl: mediaUrl,
          newUrl: finalMediaUrl,
          r2Key: r2Key
        });
        
        addBreadcrumb('Media file uploaded successfully for post to R2', 'ui', { url: finalMediaUrl, key: r2Key });
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        try {
          console.log('Uploading thumbnail to R2:', {
            fileName: thumbnailFile.name,
            fileSize: thumbnailFile.size
          });

          const thumbnailExt = '.jpg'; // Thumbnails are always JPEG
          
          // Get presigned URL from Netlify Function for thumbnail
          const thumbnailSignResponse = await fetch(`/.netlify/functions/r2-sign?contentType=image/jpeg&ext=${thumbnailExt}&folder=thumbnails`);
          const thumbnailSignResult = await thumbnailSignResponse.json();

          if (!thumbnailSignResponse.ok || thumbnailSignResult.error) {
            throw new Error(thumbnailSignResult.error || 'Failed to get presigned URL for thumbnail');
          }

          await uploadFileToR2(thumbnailFile, thumbnailSignResult.uploadUrl);
          thumbnailUrl = thumbnailSignResult.publicUrl;
          
          console.log('Thumbnail uploaded to R2:', thumbnailUrl);
          addBreadcrumb('Thumbnail uploaded successfully to R2', 'ui', { url: thumbnailUrl });
        } catch (thumbnailError) {
          console.error('Failed to upload thumbnail to R2, proceeding without it:', thumbnailError);
          captureError(thumbnailError as Error, { context: 'uploadThumbnailToR2' });
        }
      }

      // Validate final URL
      if (!finalMediaUrl.startsWith('http')) {
        throw new Error('Invalid media URL - cannot post without a valid HTTP URL');
      }

      // Create the post data with R2 URLs
      const postData: PostData = {
        user_id: user.id,
        username: user.username,
        media_url: finalMediaUrl, // R2 CDN URL
        media_type: mediaType,
        title: currentAnalysis.title,
        style: currentAnalysis.style,
        analysis_data: currentAnalysis,
        thumbnail_url: thumbnailUrl, // R2 CDN URL for thumbnail
        r2_key: r2Key || undefined // Store R2 key for deletion
      };

      console.log('Creating post with R2 data:', {
        mediaUrl: postData.media_url,
        mediaType: postData.media_type,
        title: postData.title,
        username: postData.username,
        hasValidUrl: postData.media_url.startsWith('http'),
        hasThumbnailUrl: !!postData.thumbnail_url,
        hasR2Key: !!postData.r2_key,
        isR2Url: postData.media_url.includes('r2.cloudflarestorage.com') || postData.media_url.includes('cdn.')
      });

      // Create the post in the database
      const newPost = await createPost(postData);
      
      setPostStatus('success');
      setIsAlreadyPosted(true);
      addBreadcrumb('Post to gallery successful with R2 URLs', 'ui', { 
        postId: newPost.id,
        hasThumbnail: !!newPost.thumbnail_url,
        hasR2Key: !!newPost.r2_key
      });
      
      setTimeout(() => setPostStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to post:', error);
      setPostStatus('error');
      captureError(error as Error, { context: 'handlePost' });
      
      setTimeout(() => setPostStatus('idle'), 3000);
    } finally {
      setIsPosting(false);
    }
  };

  // NEW: Handle delete post
  const handleDeletePost = async () => {
    if (!user || !postId) {
      addBreadcrumb('Delete attempted without valid user or post ID', 'ui');
      alert('Unable to delete post. Please try again.');
      return;
    }

    try {
      setIsDeleting(true);
      addBreadcrumb('Starting post deletion', 'ui', { postId });

      await deletePost(postId, user.id);
      
      addBreadcrumb('Post deleted successfully', 'ui', { postId });
      setShowDeleteConfirm(false);
      
      // Call the callback to navigate back to gallery
      if (onPostDeleted) {
        onPostDeleted();
      } else {
        onBack();
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      captureError(error as Error, { context: 'handleDeletePost', postId });
      alert('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // UPDATED: Handle key token click to append to editable prompt
  const handleKeyTokenClick = (token: string) => {
    addBreadcrumb('User clicked key token', 'ui', { token });
    setEditablePrompt(prev => prev + ' ' + token);
    onTextClick?.(token);
  };

  const handleStyleClick = () => {
    addBreadcrumb('User clicked style description', 'ui', { style: currentAnalysis.style });
    
    if (onViewStyleGallery) {
      onViewStyleGallery(currentAnalysis.style);
    } else {
      onTextClick?.(currentAnalysis.style);
    }
  };

  const handleViewArtistProfile = () => {
    if (artistId && onViewArtistProfile) {
      addBreadcrumb('User clicked artist profile', 'ui', { artistId });
      onViewArtistProfile(artistId);
    }
  };

  const handleRetryAnalysis = () => {
    addBreadcrumb('User clicked retry analysis', 'ui');
    onBack();
  };

  const handleTabClick = (moduleId: string, setActiveModule: (id: string) => void) => {
    setAnimatingModuleId(moduleId);
    setTimeout(() => setAnimatingModuleId(null), 300);

    setCurrentPromptIndices(prev => ({
      ...prev,
      [moduleId]: (prev[moduleId] + 1) % 3
    }));

    setActiveModule(moduleId);
  };

  // NEW: Handle module prompt click to append to editable prompt
  const handleModulePromptClick = (text: string) => {
    setEditablePrompt(prev => prev + '\n\n' + text);
    onTextClick?.(text);
  };

  // NEW: Handle style code click to copy to clipboard
  const handleStyleCodeClick = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeIndex(index);
      addBreadcrumb('Style code copied to clipboard', 'ui', { code });
      
      // Clear the copied state after 2 seconds
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy style code:', error);
      captureError(error as Error, { context: 'copyStyleCode' });
    }
  };

  // NEW: Parse style codes into individual clickable codes
  const parseStyleCodes = (codes: string): string[] => {
    return codes
      .split(' ')
      .filter(code => code.trim() !== '')
      .map(code => code.trim());
  };

  const renderMedia = () => {
    // Use the mediaUrl directly - it should be an R2 CDN URL
    const displayMediaUrl = mediaUrl;
    
    console.log('Rendering media with R2 URL:', {
      mediaUrl: displayMediaUrl,
      mediaType: mediaType,
      isR2Url: displayMediaUrl.includes('r2.cloudflarestorage.com') || displayMediaUrl.includes('cdn.')
    });
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {mediaType === 'image' && (
          <img
            src={displayMediaUrl}
            alt={currentAnalysis.title}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onError={(e) => {
              console.error('Failed to load image from R2:', displayMediaUrl);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
        )}
        
        {/* Fallback for broken images */}
        {mediaType === 'image' && (
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#B8A082]/20 to-[#7C9A92]/20 rounded-2xl flex items-center justify-center"
            style={{ display: 'none' }}
          >
            <div className="text-center">
              <Type className="w-16 h-16 text-[#B8A082] mx-auto mb-4" />
              <p className="text-[#B8A082] text-lg">Image unavailable</p>
              <p className="text-[#B8A082]/60 text-sm mt-2">The media file could not be loaded from R2</p>
            </div>
          </div>
        )}
        
        {mediaType === 'video' && (
          <video
            src={displayMediaUrl}
            controls
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            style={{ maxHeight: '80vh' }}
            poster={thumbnailFile ? URL.createObjectURL(thumbnailFile) : undefined}
            onError={(e) => {
              console.error('Failed to load video from R2:', displayMediaUrl);
            }}
          />
        )}
        
        {mediaType === 'audio' && (
          <div className="flex flex-col items-center justify-center space-y-6 p-8 bg-gradient-to-br from-accent-gold/20 to-muted-teal/20 rounded-2xl">
            <div className="w-32 h-32 bg-gradient-to-br from-accent-gold/20 to-muted-teal/20 rounded-full flex items-center justify-center">
              <Volume2 className="w-16 h-16 text-accent-gold" />
            </div>
            <audio
              src={displayMediaUrl}
              controls
              className="w-full max-w-md"
              onError={(e) => {
                console.error('Failed to load audio from R2:', displayMediaUrl);
              }}
            />
          </div>
        )}

        {/* Database Status Indicator */}
        {!hasValidDatabaseId && (
          <div className="absolute top-3 right-3 bg-orange-500/20 backdrop-blur-sm rounded-xl px-2 py-1 border border-orange-500/30">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 text-sm font-medium">Not Saved</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderModuleTabs = (modules: ModuleDefinition[], activeModule: string, setActiveModule: (id: string) => void) => {
    return (
      <div className="flex border-b border-white/10 bg-black/30 backdrop-blur-md rounded-t-xl overflow-hidden">
        {modules.map((module, index) => {
          const isActive = activeModule === module.id;
          const isAnimating = animatingModuleId === module.id;
          
          return (
            <React.Fragment key={module.id}>
              <button
                onClick={() => handleTabClick(module.id, setActiveModule)}
                className={`flex-1 p-3 text-xs font-medium transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-300'
                } ${
                  isAnimating 
                    ? 'transform scale-98 shadow-rebound' 
                    : 'transform scale-100'
                }`}
                style={{
                  background: isActive 
                    ? `linear-gradient(135deg, ${module.color}40, ${module.color}20)` 
                    : 'transparent',
                }}
              >
                {isActive && (
                  <div 
                    className="absolute inset-0 backdrop-blur-sm border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${module.color}15, ${module.color}05)`,
                      boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 3px ${module.color}30`
                    }}
                  />
                )}
                
                {isActive && (
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `radial-gradient(circle at center, ${module.color}40, transparent 70%)`,
                    }}
                  />
                )}
                
                <span className="relative z-10">{module.name}</span>
              </button>
              {index < modules.length - 1 && (
                <div className="w-px bg-white/10" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const getActiveModule = (modules: ModuleDefinition[], activeId: string) => {
    return modules.find(m => m.id === activeId) || modules[0];
  };

  const getPostButtonContent = () => {
    if (authLoading || checkingPostStatus) return { text: 'Loading...', disabled: true };
    if (!user) return { text: 'Sign In to Post', disabled: true };
    if (!hasValidDatabaseId) return { text: 'Cannot Post', disabled: true };
    if (isAlreadyPosted) return { text: 'Already Posted', disabled: true };
    if (!user.username) return { text: 'Set Username', disabled: true };
    if (isPosting) return { text: 'Posting...', disabled: true };
    if (postStatus === 'success') return { text: 'Posted!', disabled: false };
    if (postStatus === 'error') return { text: 'Failed', disabled: false };
    return { text: 'POST', disabled: false };
  };

  const getPostButtonStyle = () => {
    if (authLoading || checkingPostStatus || !user) return 'bg-white/10 text-white/50';
    if (!hasValidDatabaseId) return 'bg-red-500/20 text-red-400';
    if (isAlreadyPosted) return 'bg-gray-500/20 text-gray-400';
    if (!user.username) return 'bg-orange-500/20 text-orange-400';
    if (postStatus === 'success') return 'bg-green-500/20 text-green-400';
    if (postStatus === 'error') return 'bg-red-500/20 text-red-400';
    return 'bg-[#B8A082]/20 text-[#B8A082]';
  };

  // NEW: Check if user can delete this post
  const canDeletePost = user && postId && artistId && user.id === artistId;

  // NEW: Check if style codes input should be visible
  const shouldShowStyleCodes = user && !isAlreadyPosted && (isFromDecodePage || (artistId && user.id === artistId));

  const postButtonContent = getPostButtonContent();
  const postButtonStyle = getPostButtonStyle();

  const shouldShowPostButton = isFromDecodePage && !isAlreadyPosted;

  console.log('POST button visibility logic:', {
    isFromDecodePage,
    isAlreadyPosted,
    shouldShowPostButton,
    hasValidDatabaseId
  });

  return (
    <div className="min-h-screen pt-16 h-screen overflow-hidden bg-charcoal-matte font-inter">
      {/* Mobile Layout: Flex Column, Desktop Layout: Flex Row */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Media Display Section */}
        <div className="w-full lg:w-2/3 h-auto lg:h-full p-4 flex items-center justify-center relative">
          {renderMedia()}
        </div>

        {/* Control Deck Section */}
        <div className="w-full lg:w-1/3 flex flex-col max-h-[60vh] lg:max-h-full">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="bg-black/50 backdrop-blur-md shadow-inner relative p-4 rounded-2xl">
              {/* Header within Control Deck */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={onBack}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                
                <div className="flex items-center space-x-2">
                  {/* POST Button */}
                  {shouldShowPostButton && (
                    <button
                      onClick={handlePost}
                      disabled={postButtonContent.disabled}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all text-xs ${postButtonStyle} ${
                        postButtonContent.disabled ? 'cursor-not-allowed' : 'hover:opacity-80'
                      }`}
                      title={
                        !hasValidDatabaseId 
                          ? 'Analysis not saved to database - cannot post' 
                          : ''
                      }
                    >
                      {postStatus === 'success' ? (
                        <Check className="w-3 h-3" />
                      ) : postStatus === 'error' ? (
                        <X className="w-3 h-3" />
                      ) : !hasValidDatabaseId ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      <span>{postButtonContent.text}</span>
                    </button>
                  )}

                  {/* Delete Button - NEW */}
                  {canDeletePost && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-all duration-300 text-red-400 hover:text-red-300"
                      title="Delete this post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Database Status Warning */}
              {!hasValidDatabaseId && (
                <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-orange-200 text-xs mb-2">
                        This analysis could not be saved to the database. Posting is disabled.
                      </p>
                      <button
                        onClick={handleRetryAnalysis}
                        className="flex items-center space-x-1 text-orange-300 hover:text-orange-200 text-xs underline"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Try analyzing again</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Title */}
              <h1 className="text-2xl lg:text-3xl font-light text-[#7C9A92] mb-2">
                {currentAnalysis.title}
              </h1>
              
              {/* Analysis Style - Clickable */}
              <p
                onClick={handleStyleClick}
                className="text-[#7C9A92] font-mono text-sm leading-relaxed cursor-pointer hover:text-[#8FAAA3] mb-2 hover:underline transition-colors"
              >
                {currentAnalysis.style}
              </p>

              {/* Artist Username Display - Removed User Icon */}
              {artistUsername && artistId && (
                <button
                  onClick={handleViewArtistProfile}
                  className="flex items-center space-x-2 font-mono text-sm cursor-pointer hover:underline transition-colors mb-4"
                  style={{ color: '#5F6BBB' }}
                >
                  <span>{artistUsername}</span>
                </button>
              )}

              {/* Editable Prompt Textarea - Smaller on mobile */}
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full bg-white/5 rounded-xl p-3 text-[#E0E0E0] text-sm font-mono leading-relaxed resize-none border-none outline-none mb-4 focus:bg-white/10 transition-colors"
                rows={3}
                placeholder="Edit your prompt here..."
              />

              {/* NEW: Style Codes Input - Conditional visibility */}
              {shouldShowStyleCodes && (
                <div className="mb-4">
                  <label htmlFor="style-codes" className="block text-[#B8A082] text-xs font-medium mb-2">
                    Style Codes
                  </label>
                  <input
                    id="style-codes"
                    type="text"
                    value={styleCodes}
                    onChange={(e) => setStyleCodes(e.target.value)}
                    className="w-full bg-black/30 rounded-lg p-3 text-[#E0E0E0] text-sm font-mono leading-relaxed border border-white/10 outline-none focus:border-[#B8A082]/50 focus:bg-black/40 transition-all duration-300 placeholder-[#E0E0E0]/60"
                    placeholder="--sref --profile --moodboard"
                  />
                </div>
              )}

              {/* NEW: Parsed Style Codes - Only visible when codes are entered */}
              {styleCodes.trim().length > 0 && (
                <div className="mb-4">
                  <label className="block text-[#B8A082] text-xs font-medium mb-2">
                    Parsed Style Codes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {parseStyleCodes(styleCodes).map((code, index) => (
                      <button
                        key={index}
                        onClick={() => handleStyleCodeClick(code, index)}
                        className="group relative px-3 py-2 bg-gradient-to-r from-[#B8A082]/20 to-[#A69072]/20 border border-[#B8A082]/30 rounded-lg hover:from-[#B8A082]/30 hover:to-[#A69072]/30 hover:border-[#B8A082]/50 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[#B8A082] text-xs font-mono">
                            {code}
                          </span>
                          {copiedCodeIndex === index ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-[#B8A082]/60 group-hover:text-[#B8A082] transition-colors" />
                          )}
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {copiedCodeIndex === index ? 'Copied!' : 'Click to copy'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Tokens - Smaller spacing on mobile */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {currentAnalysis.keyTokens.map((token, index) => (
                    <button
                      key={index}
                      onClick={() => handleKeyTokenClick(token)}
                      className="px-2 py-1 bg-black/30 text-[#94AFA7] text-xs font-mono rounded-xl hover:opacity-80 transition-opacity cursor-pointer hover:bg-black/40"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Sections - Smaller spacing on mobile */}
              <div className="space-y-4">
                {/* Top Modules */}
                <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/20 backdrop-blur-sm">
                  {renderModuleTabs(TOP_MODULES, activeTopModule, setActiveTopModule)}
                  <div className="p-3 bg-black/10 backdrop-blur-xs">
                    <AnalysisContent
                      currentPrompt={currentAnalysis[getActiveModule(TOP_MODULES, activeTopModule).promptKey][currentPromptIndices[activeTopModule]] as string}
                      moduleColor={getActiveModule(TOP_MODULES, activeTopModule).color}
                      onTextClick={handleModulePromptClick}
                    />
                  </div>
                </div>

                {/* Bottom Modules */}
                <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/20 backdrop-blur-sm">
                  {renderModuleTabs(BOTTOM_MODULES, activeBottomModule, setActiveBottomModule)}
                  <div className="p-3 bg-black/10 backdrop-blur-xs">
                    <AnalysisContent
                      currentPrompt={currentAnalysis[getActiveModule(BOTTOM_MODULES, activeBottomModule).promptKey][currentPromptIndices[activeBottomModule]] as string}
                      moduleColor={getActiveModule(BOTTOM_MODULES, activeBottomModule).color}
                      onTextClick={handleModulePromptClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal - NEW */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Delete Post
              </h3>
              
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete this post? This action cannot be undone and will remove the post from the gallery permanently.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-gray-300 hover:text-white transition-all duration-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/30 text-red-400 hover:text-red-300 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};