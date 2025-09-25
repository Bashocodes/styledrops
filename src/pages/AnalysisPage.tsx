import React, { useState, useEffect } from 'react';
import { ArrowLeft, Type, Play, Volume2, Copy } from 'lucide-react';
import { AnalysisResult, TOP_MODULES, BOTTOM_MODULES, ModuleDefinition } from '../constants/modules';
import { AnalysisContent } from '../components/AnalysisContent';
// import { useAuth } from '../hooks/useAuth';
import { addBreadcrumb, captureError } from '../lib/sentry';
// import { createPost, PostData, checkIfAnalysisIsPosted, deletePost } from '../lib/supabaseUtils';
// import { uploadFileToR2, extractKeyFromUrl } from '../lib/r2';

interface AnalysisPageProps {
  analysis?: AnalysisResult;
  mediaUrl: string; // This will now be an R2 CDN URL
  mediaType: 'image' | 'video' | 'audio';
  // artistUsername?: string;
  // artistId?: string;
  // postId?: string; // NEW: Post ID for deletion functionality
  onBack: () => void;
  onTextClick?: (text: string) => void;
  isTextOnlyAnalysis?: boolean;
  selectedMediaFile?: File;
  thumbnailFile?: File;
  // onViewArtistProfile?: (artistId: string) => void;
  isFromDecodePage?: boolean;
  onViewStyleGallery?: (style: string) => void;
  // onPostDeleted?: () => void; // NEW: Callback for when post is deleted
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  analysis,
  mediaUrl, // Now R2 CDN URL
  mediaType,
  // artistUsername,
  // artistId,
  // postId, // NEW: Post ID prop
  onBack,
  onTextClick,
  isTextOnlyAnalysis = false,
  selectedMediaFile,
  thumbnailFile,
  // onViewArtistProfile,
  isFromDecodePage = false,
  onViewStyleGallery,
  // onPostDeleted // NEW: Post deletion callback
}) => {
  // const { user, loading: authLoading } = useAuth();
  const [activeTopModule, setActiveTopModule] = useState<string>(TOP_MODULES[0].id);
  const [activeBottomModule, setActiveBottomModule] = useState<string>(BOTTOM_MODULES[0].id);
  // Removed posting and deletion states

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

  // Removed database and posting logic

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

  // Removed posting and deletion handlers

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
            loading="lazy"
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
            loading="lazy"
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
              loading="lazy"
              className="w-full max-w-md"
              onError={(e) => {
                console.error('Failed to load audio from R2:', displayMediaUrl);
              }}
            />
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
                className={`flex items-center space-x-2 font-mono text-lg cursor-pointer hover:underline transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded ${
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

  // Removed posting and deletion logic

  const shouldShowStyleCodes = isFromDecodePage;

  return (
    <main className="min-h-screen pt-16 bg-charcoal-matte font-inter">
      {/* Mobile Layout: Flex Column, Desktop Layout: Flex Row */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Media Display Section */}
        <section className="w-full lg:w-3/5 h-auto lg:h-full max-h-[400px] lg:max-h-none p-4 flex items-center justify-center relative overflow-hidden" aria-label="Media display">
          {renderMedia()}
        </section>

        {/* Control Deck Section */}
        <aside className="w-full lg:w-2/5 flex flex-col lg:max-h-full" aria-label="Analysis controls and information">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="bg-black/50 backdrop-blur-md shadow-inner relative p-6 rounded-2xl">
              {/* Header within Control Deck */}
              <header className="flex items-center justify-between mb-4">
                <button
                  onClick={onBack}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Go back to gallery"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
              </header>

              {/* Analysis Title */}
              <h1 className="text-4xl lg:text-5xl font-light text-[#8FB3A8] mb-3">
                {currentAnalysis.title}
              </h1>
              
              {/* Analysis Style - Clickable */}
              <p
                onClick={handleStyleClick}
                className="text-[#8FB3A8] font-mono text-lg leading-relaxed cursor-pointer hover:text-[#A3C4B8] mb-3 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                tabIndex={0}
                role="button"
                aria-label={`Explore ${currentAnalysis.style} style gallery`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStyleClick();
                  }
                }}
              >
                {currentAnalysis.style}
              </p>

              {/* Removed artist username display */}

              {/* Editable Prompt Textarea - Smaller on mobile */}
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full bg-white/5 rounded-xl p-4 text-improved-contrast text-lg font-mono leading-relaxed resize-none border-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/10 transition-colors mb-4"
                rows={4}
                placeholder="Edit your prompt here..."
                aria-label="Editable prompt text"
              />

              {/* NEW: Style Codes Input - Conditional visibility */}
              {shouldShowStyleCodes && (
                <div className="mb-4">
                  <label htmlFor="style-codes" className="block text-[#D4B896] text-sm font-medium mb-2">
                    Style Codes
                  </label>
                  <input
                    id="style-codes"
                    type="text"
                    value={styleCodes}
                    onChange={(e) => setStyleCodes(e.target.value)}
                    className="w-full bg-black/30 rounded-lg p-4 text-improved-contrast text-base font-mono leading-relaxed border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-black/40 transition-all duration-300 placeholder-gray-400"
                    placeholder="--sref --profile --moodboard"
                  />
                </div>
              )}

              {/* NEW: Parsed Style Codes - Only visible when codes are entered */}
              {styleCodes.trim().length > 0 && (
                <div className="mb-4">
                  <label className="block text-[#D4B896] text-sm font-medium mb-2">
                    Parsed Style Codes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {parseStyleCodes(styleCodes).map((code, index) => (
                      <button
                        key={index}
                        onClick={() => handleStyleCodeClick(code, index)}
                        className="group relative px-4 py-2 bg-gradient-to-r from-[#D4B896]/20 to-[#C4A886]/20 border border-[#D4B896]/30 rounded-lg hover:from-[#D4B896]/30 hover:to-[#C4A886]/30 hover:border-[#D4B896]/50 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                        aria-label={`Copy style code: ${code}`}
                        title={copiedCodeIndex === index ? 'Copied!' : 'Click to copy'}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[#D4B896] text-sm font-mono">
                            {code}
                          </span>
                          {copiedCodeIndex === index ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#D4B896]/60 group-hover:text-[#D4B896] transition-colors" />
                          )}
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {copiedCodeIndex === index ? 'Copied!' : 'Click to copy'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Tokens - Smaller spacing on mobile */}
              <div className="mb-4">
                <h2 className="sr-only">Key style tokens</h2>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.keyTokens.map((token, index) => (
                    <button
                      key={index}
                      onClick={() => handleKeyTokenClick(token)}
                      className="px-3 py-2 bg-black/30 text-[#A3C4B8] text-sm font-mono rounded-xl hover:opacity-80 transition-opacity cursor-pointer hover:bg-black/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                      aria-label={`Add token: ${token}`}
                      title={`Click to add "${token}" to prompt`}
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Sections - Smaller spacing on mobile */}
              <div className="space-y-4">
                <h2 className="sr-only">Creative modules</h2>
                {/* Top Modules */}
                <section className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/20 backdrop-blur-sm" aria-label="Primary creative modules">
                  {renderModuleTabs(TOP_MODULES, activeTopModule, setActiveTopModule)}
                  <div className="p-4 bg-black/10 backdrop-blur-xs">
                    <AnalysisContent
                      currentPrompt={currentAnalysis[getActiveModule(TOP_MODULES, activeTopModule).promptKey][currentPromptIndices[activeTopModule]] as string}
                      moduleColor={getActiveModule(TOP_MODULES, activeTopModule).color}
                      onTextClick={handleModulePromptClick}
                    />
                  </div>
                </section>

                {/* Bottom Modules */}
                <section className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/20 backdrop-blur-sm" aria-label="Secondary creative modules">
                  {renderModuleTabs(BOTTOM_MODULES, activeBottomModule, setActiveBottomModule)}
                  <div className="p-4 bg-black/10 backdrop-blur-xs">
                    <AnalysisContent
                      currentPrompt={currentAnalysis[getActiveModule(BOTTOM_MODULES, activeBottomModule).promptKey][currentPromptIndices[activeBottomModule]] as string}
                      moduleColor={getActiveModule(BOTTOM_MODULES, activeBottomModule).color}
                      onTextClick={handleModulePromptClick}
                    />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};