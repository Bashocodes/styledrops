import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { captureError, addBreadcrumb } from './lib/sentry';
import { AnalysisPage } from './pages/AnalysisPage';
import { DecodePage } from './pages/DecodePage';
import { StyleGalleryPage } from './pages/StyleGalleryPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { GalleryView } from './components/GalleryView';
import { mockAnalysisResult, AnalysisResult } from './constants/modules';
import { GlassmorphicHeader } from './components/GlassmorphicHeader';


function App() {
  const { user, loading } = useAuth();
  const [signInError, setSignInError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  
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
    navigate('/decode');
  };

  const handleLogoClick = () => {
    addBreadcrumb('Logo clicked - navigating to gallery', 'ui');
    navigate('/');
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
    navigate('/analysis/new'); // Use a temporary ID for new analysis
    
    console.log('Decode success - setting analysis from decode:', {
      analysisId: analysis.id,
      isFromDecode: true,
      hasThumbnailFile: !!thumbnailFile
    });
  };

  const handleBackFromDecode = () => {
    addBreadcrumb('Back from decode page', 'ui');
    navigate('/');
  };

  const handleBackFromGallery = () => {
    addBreadcrumb('Back from gallery page', 'ui');
    navigate('/');
  };

  const handleBackFromAnalysis = () => {
    addBreadcrumb('Back from analysis page', 'ui');
    setIsAnalysisFromDecode(false);
    setCurrentArtistId(undefined);
    setCurrentArtistUsername(undefined);
    setCurrentPostId(undefined);
    navigate('/');
  };

  const handleViewStyleGallery = (style: string) => {
    addBreadcrumb('View style gallery clicked', 'ui', { style });
    setSelectedStyle(style);
    navigate(`/style/${encodeURIComponent(style)}`);
  };

  const handleBackFromStyleGallery = () => {
    addBreadcrumb('Back from style gallery', 'ui');
    navigate(-1); // Go back to previous page (analysis or gallery)
  };

  const handleViewArtistProfileFromApp = (artistId: string) => {
    addBreadcrumb('View artist profile clicked', 'ui', { artistId });
    setViewingArtistId(artistId);
    navigate(`/artist/${artistId}`);
  };

  const handleBackFromArtistProfile = () => {
    addBreadcrumb('Back from artist profile', 'ui');
    setViewingArtistId(undefined);
    navigate(-1); // Go back to previous page (analysis or gallery)
  };

  const handleProfileSettingsClick = () => {
    addBreadcrumb('Profile settings clicked', 'ui');
    navigate('/profile-settings');
  };

  const handleBackFromProfileSettings = () => {
    addBreadcrumb('Back from profile settings', 'ui');
    navigate('/');
  };

  const handlePostDeleted = () => {
    addBreadcrumb('Post deleted successfully', 'ui', { postId: currentPostId });
    navigate('/');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter">
      <GlassmorphicHeader
        onDecodeClick={handleDecodeClick}
        onLogoClick={handleLogoClick}
        onProfileClick={handleProfileSettingsClick}
        signInError={signInError}
        onDismissSignInError={() => setSignInError(null)}
      />
      <Routes>
        <Route path="/" element={
          <GalleryView
            onBack={handleBackFromGallery}
            onPostClick={(post) => navigate(`/analysis/${post.id}`)} // Navigate to analysis page with post ID
          />
        } />
        <Route path="/decode" element={
          <DecodePage
            onDecodeSuccess={handleDecodeSuccess}
            onBack={handleBackFromDecode}
          />
        } />
        <Route path="/analysis/:postId" element={
          <AnalysisPage
            // Pass state for new analysis from decode page
            analysis={isAnalysisFromDecode ? currentAnalysis : undefined}
            mediaUrl={isAnalysisFromDecode ? currentMediaUrl : undefined}
            mediaType={isAnalysisFromDecode ? currentMediaType : undefined}
            selectedMediaFile={isAnalysisFromDecode ? currentMediaFile : undefined}
            thumbnailFile={isAnalysisFromDecode ? currentThumbnailFile : undefined}
            isFromDecodePage={isAnalysisFromDecode}
            onBack={handleBackFromAnalysis}
            onViewStyleGallery={handleViewStyleGallery}
            onViewArtistProfile={handleViewArtistProfileFromApp}
            onPostDeleted={handlePostDeleted}
          />
        } />
        <Route path="/analysis/new" element={ // Temporary route for new analysis from decode
          <AnalysisPage
            analysis={currentAnalysis}
            mediaUrl={currentMediaUrl}
            mediaType={currentMediaType}
            selectedMediaFile={currentMediaFile}
            thumbnailFile={currentThumbnailFile}
            isFromDecodePage={true}
            onBack={handleBackFromAnalysis}
            onViewStyleGallery={handleViewStyleGallery}
            onViewArtistProfile={handleViewArtistProfileFromApp}
            onPostDeleted={handlePostDeleted}
          />
        } />
        <Route path="/style/:styleName" element={
          <StyleGalleryPage
            onBack={handleBackFromStyleGallery}
            onPostClick={(post) => navigate(`/analysis/${post.id}`)}
          />
        } />
        <Route path="/artist/:artistId" element={
          <GalleryView
            onBack={handleBackFromArtistProfile}
            onPostClick={(post) => navigate(`/analysis/${post.id}`)}
          />
        } />
        <Route path="/profile-settings" element={
          <ProfileSettingsPage onBack={handleBackFromProfileSettings} />
        } />
        {/* Default fallback for unknown routes */}
        <Route path="*" element={
          <main className="max-w-7xl mx-auto px-6 py-12 pt-32">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-white bg-gradient-to-r from-purple-400 via-white to-blue-400 bg-clip-text text-transparent mb-6">
                StyleDrop
              </h1>
              <h2 className="text-xl md:text-2xl font-medium text-gray-200 mb-4">
                Discover, Mix, and Analyze AI Art Styles
              </h2>
              <p className="text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
                Explore a curated library of AI-generated art styles, decode visual aesthetics, and generate creative prompts for MidJourney, Stable Diffusion, and other AI art tools.
              </p>
            </div>

            {/* Features Overview */}
            <section className="mb-16">
              <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-12">
                How StyleDrop Works
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Discover Styles</h3>
                  <p className="text-gray-400 text-sm">
                    Browse our curated gallery of AI art styles and visual aesthetics from various artistic movements and genres.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Decode Media</h3>
                  <p className="text-gray-400 text-sm">
                    Upload your own images, videos, or audio to analyze their style and generate detailed creative prompts.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Create & Mix</h3>
                  <p className="text-gray-400 text-sm">
                    Get inspired with story prompts, animation ideas, music suggestions, and creative remixes for your projects.
                  </p>
                </div>
              </div>
            </section>

            {/* Call to Action */}
            <section className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Ready to Get Started?
              </h2>
              <p className="text-gray-300 max-w-md mx-auto mb-6">
                {user 
                  ? 'Use the decode button above to analyze your first media file, or explore the gallery to discover new styles.'
                  : 'Sign in with Google to start creating, analyzing, and saving your favorite AI art styles.'
                }
              </p>
              
              {/* Sentry Test Button */}
              <div className="mt-8">
                <button 
                  onClick={handleSentryTest}
                  className="group flex items-center space-x-2 px-6 py-3 bg-red-500/10 backdrop-blur-sm rounded-lg border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-300 mx-auto"
                >
                  <span className="text-sm font-medium text-red-300 group-hover:text-red-200 transition-colors">
                    Test Sentry Error Reporting
                  </span>
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Development: Click to test error tracking
                </p>
              </div>
            </section>
          </main>
        } />
      </Routes>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded opacity-80"></div>
              <span className="text-sm text-gray-500">StyleDrop © 2025</span>
            </div>
            <div className="text-sm text-gray-600">
              Powered by creativity
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;