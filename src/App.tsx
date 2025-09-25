import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { captureError, addBreadcrumb } from './lib/sentry';
import { AnalysisPage } from './pages/AnalysisPage';
import { DecodePage } from './pages/DecodePage';
import { StyleGalleryPage } from './pages/StyleGalleryPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { LandingPage } from './pages/LandingPage';
import { GalleryView } from './components/GalleryView';
import { mockAnalysisResult, AnalysisResult } from './constants/modules';
import { Post } from './lib/supabaseUtils';
import { GlassmorphicHeader } from './components/GlassmorphicHeader';

type ViewState = 'analysis' | 'decodeUpload' | 'gallery' | 'styleGallery' | 'artistProfile' | 'profileSettings';

function App() {
  const { user, loading } = useAuth();
  const [signInError, setSignInError] = React.useState<string | null>(null);
  const [currentView, setCurrentView] = React.useState<ViewState>('gallery');
  
  // Analysis state
  const [currentAnalysis, setCurrentAnalysis] = React.useState<AnalysisResult>(mockAnalysisResult);
  const [currentMediaUrl, setCurrentMediaUrl] = React.useState<string>("https://images.pexels.com/photos/8566473/pexels-photo-8566473.jpeg");
  const [currentMediaType, setCurrentMediaType] = React.useState<'image' | 'video' | 'audio'>('image');
  const [currentMediaFile, setCurrentMediaFile] = React.useState<File | null>(null);
  const [currentThumbnailFile, setCurrentThumbnailFile] = React.useState<File | null>(null);
  
  const [isAnalysisFromDecode, setIsAnalysisFromDecode] = React.useState(false);
  const [selectedStyle, setSelectedStyle] = React.useState<string>('');
  const [currentArtistId, setCurrentArtistId] = React.useState<string | undefined>(undefined);
  const [currentArtistUsername, setCurrentArtistUsername] = React.useState<string | undefined>(undefined);
  const [viewingArtistId, setViewingArtistId] = React.useState<string | undefined>(undefined);
  const [currentPostId, setCurrentPostId] = React.useState<string | undefined>(undefined);

  const handleSentryTest = () => {
    addBreadcrumb('User clicked Sentry test button', 'ui');
    throw new Error("This is your first error!");
  };

  const handleDecodeClick = () => {
    addBreadcrumb('Decode button clicked', 'ui');
    setCurrentView('decodeUpload');
  };

  const handleLogoClick = () => {
    addBreadcrumb('Logo clicked - navigating to gallery', 'ui');
    setCurrentView('gallery');
  };

  const handleGalleryPostClick = (post: Post) => {
    addBreadcrumb('Gallery post clicked', 'ui', { postId: post.id });
    
    // Convert Post to AnalysisResult format - ensure we use the proper analysis ID
    const analysisResult: AnalysisResult = {
      id: post.analysis_data.id,
      ...post.analysis_data
    };
    
    setCurrentArtistId(post.user_id);
    setCurrentArtistUsername(post.username);
    
    setCurrentAnalysis(analysisResult);
    setCurrentMediaUrl(post.media_url);
    setCurrentMediaType(post.media_type);
    setCurrentMediaFile(null);
    setCurrentThumbnailFile(null);
    setIsAnalysisFromDecode(false);
    setCurrentPostId(post.id);
    setCurrentView('analysis');
    
    console.log('Gallery post clicked:', {
      postId: post.id,
      mediaUrl: post.media_url,
      mediaType: post.media_type,
      analysisId: post.analysis_data.id,
      isFromDecode: false,
      artistId: post.user_id,
      artistUsername: post.username,
      hasThumbnailUrl: !!post.thumbnail_url
    });
  };

  const handleDecodeSuccess = (
    analysis: AnalysisResult, 
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'audio',
    file: File,
    thumbnailFile?: File
  ) => {
    addBreadcrumb('Decode analysis successful', 'ui', { 
      analysisId: analysis.id,
      hasThumbnail: !!thumbnailFile 
    });
    
    setCurrentArtistId(undefined);
    setCurrentArtistUsername(undefined);
    
    setCurrentAnalysis(analysis);
    setCurrentMediaUrl(mediaUrl);
    setCurrentMediaType(mediaType);
    setCurrentMediaFile(file);
    setCurrentThumbnailFile(thumbnailFile || null);
    setIsAnalysisFromDecode(true);
    setCurrentPostId(undefined);
    setCurrentView('analysis');
    
    console.log('Decode success - setting analysis from decode:', {
      analysisId: analysis.id,
      isFromDecode: true,
      hasThumbnailFile: !!thumbnailFile
    });
  };

  const handleBackFromDecode = () => {
    addBreadcrumb('Back from decode page', 'ui');
    setCurrentView('gallery');
  };

  const handleBackFromGallery = () => {
    addBreadcrumb('Back from gallery page', 'ui');
    setCurrentView('gallery');
  };

  const handleBackFromAnalysis = () => {
    addBreadcrumb('Back from analysis page', 'ui');
    setIsAnalysisFromDecode(false);
    setCurrentArtistId(undefined);
    setCurrentArtistUsername(undefined);
    setCurrentPostId(undefined);
    setCurrentView('gallery');
  };

  const handleViewStyleGallery = (style: string) => {
    addBreadcrumb('View style gallery clicked', 'ui', { style });
    setSelectedStyle(style);
    setCurrentView('styleGallery');
  };

  const handleBackFromStyleGallery = () => {
    addBreadcrumb('Back from style gallery', 'ui');
    setCurrentView('analysis');
  };

  const handleViewArtistProfileFromApp = (artistId: string) => {
    addBreadcrumb('View artist profile clicked', 'ui', { artistId });
    setViewingArtistId(artistId);
    setCurrentView('artistProfile');
  };

  const handleBackFromArtistProfile = () => {
    addBreadcrumb('Back from artist profile', 'ui');
    setViewingArtistId(undefined);
    setCurrentView('analysis');
  };

  const handleProfileSettingsClick = () => {
    addBreadcrumb('Profile settings clicked', 'ui');
    setCurrentView('profileSettings');
  };

  const handleBackFromProfileSettings = () => {
    addBreadcrumb('Back from profile settings', 'ui');
    setCurrentView('gallery');
  };

  const handlePostDeleted = () => {
    addBreadcrumb('Post deleted successfully', 'ui', { postId: currentPostId });
    setCurrentView('gallery');
    setCurrentPostId(undefined);
  };

  // Log component mount
  React.useEffect(() => {
    addBreadcrumb('App component mounted', 'navigation');
    
    // Check for auth errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (error) {
      const errorMsg = errorDescription || error;
      setSignInError(`Authentication failed: ${errorMsg}`);
      captureError(new Error(errorMsg), { 
        context: 'urlAuthError',
        error,
        errorDescription 
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          <span className="text-white text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <GlassmorphicHeader
          onDecodeClick={handleDecodeClick}
          onLogoClick={handleLogoClick}
          onProfileClick={handleProfileSettingsClick}
          signInError={signInError}
          onDismissSignInError={() => setSignInError(null)}
        />
        <LandingPage
          onSignInWithGoogle={signInWithGoogle}
          signInError={signInError}
        />
      </div>
    );
  }

  // Render Profile Settings Page
  if (currentView === 'profileSettings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <GlassmorphicHeader
          onDecodeClick={handleDecodeClick}
          onLogoClick={handleLogoClick}
          onProfileClick={handleProfileSettingsClick}
          signInError={signInError}
          onDismissSignInError={() => setSignInError(null)}
        />
        <ProfileSettingsPage onBack={handleBackFromProfileSettings} />
      </div>
    );
  }

  // Render Style Gallery Page
  if (currentView === 'styleGallery') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <GlassmorphicHeader
          onDecodeClick={handleDecodeClick}
          onLogoClick={handleLogoClick}
          onProfileClick={handleProfileSettingsClick}
          signInError={signInError}
          onDismissSignInError={() => setSignInError(null)}
        />
        <StyleGalleryPage
          styleName={selectedStyle}
          onBack={handleBackFromStyleGallery}
          onPostClick={handleGalleryPostClick}
        />
      </div>
    );
  }

  // Render Artist Profile Page
  if (currentView === 'artistProfile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <GlassmorphicHeader
          onDecodeClick={handleDecodeClick}
          onLogoClick={handleLogoClick}
          onProfileClick={handleProfileSettingsClick}
          signInError={signInError}
          onDismissSignInError={() => setSignInError(null)}
        />
        <GalleryView
          onBack={handleBackFromArtistProfile}
          onPostClick={handleGalleryPostClick}
          artistId={viewingArtistId}
          artistUsername={currentArtistUsername}
        />
      </div>
    );
  }

  // Render Gallery View (now the default home page)
  if (currentView === 'gallery') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <GlassmorphicHeader
          onDecodeClick={handleDecodeClick}
          onLogoClick={handleLogoClick}
          onProfileClick={handleProfileSettingsClick}
          signInError={signInError}
          onDismissSignInError={() => setSignInError(null)}
        />
        <GalleryView
          onBack={handleBackFromGallery}
          onPostClick={handleGalleryPostClick}
        />
      </div>
    );
  }

  // Render Decode Upload Page
  if (currentView === 'decodeUpload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <GlassmorphicHeader
          onDecodeClick={handleDecodeClick}
          onLogoClick={handleLogoClick}
          onProfileClick={handleProfileSettingsClick}
          signInError={signInError}
          onDismissSignInError={() => setSignInError(null)}
        />
        <DecodePage
          onDecodeSuccess={handleDecodeSuccess}
          onBack={handleBackFromDecode}
        />
      </div>
    );
  }

  // Render Analysis Page
  if (currentView === 'analysis') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
        <GlassmorphicHeader
          onDecodeClick={handleDecodeClick}
          onLogoClick={handleLogoClick}
          onProfileClick={handleProfileSettingsClick}
          signInError={signInError}
          onDismissSignInError={() => setSignInError(null)}
        />
        <AnalysisPage
          analysis={currentAnalysis}
          mediaUrl={currentMediaUrl}
          mediaType={currentMediaType}
          selectedMediaFile={currentMediaFile}
          thumbnailFile={currentThumbnailFile}
          artistUsername={currentArtistUsername}
          artistId={currentArtistId}
          postId={currentPostId}
          isFromDecodePage={isAnalysisFromDecode}
          onBack={handleBackFromAnalysis}
          onViewStyleGallery={handleViewStyleGallery}
          onViewArtistProfile={handleViewArtistProfileFromApp}
          onPostDeleted={handlePostDeleted}
        />
      </div>
    );
  }

  // Default fallback - should not reach here for authenticated users
  return null;
}

export default App;