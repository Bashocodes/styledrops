import React, { useState, useCallback } from 'react';
import { Upload, Loader2, AlertCircle, FileImage, FileVideo, FileAudio, X, ArrowLeft, ArrowRight, Copy, Check, ExternalLink, Settings } from 'lucide-react';
import { callGeminiAnalysisFunction } from '../lib/geminiApi';
import { AnalysisResult, TOP_MODULES, BOTTOM_MODULES, ModuleDefinition } from '../constants/modules';
import { AnalysisContent } from '../components/AnalysisContent';
import { addBreadcrumb, captureError } from '../lib/sentry';
// import { useAuth } from '../hooks/useAuth';
import { generateThumbnailFile } from '../utils/videoThumbnail';

interface DecodePageProps {
  onDecodeSuccess: (
    analysis: AnalysisResult, 
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'audio', 
    file: File,
    thumbnailFile?: File // NEW: Optional thumbnail file for videos
  ) => void;
  onBack: () => void;
}

// Static module descriptions for the decode page
const DECODE_MODULE_DESCRIPTIONS = {
  story: [
    "A crisp three-act outline that captures the heart of your upload.",
    "Narrative structure that transforms visual elements into compelling storytelling frameworks.",
    "Character-driven plot development extracted from aesthetic and compositional cues."
  ],
  motion: [
    "Dynamic camera moves and transitions that echo its visual pulse.",
    "Cinematic movement patterns that amplify the inherent energy of your content.",
    "Fluid animation sequences that bring static elements to life through motion."
  ],
  dialogue: [
    "Character lines forged from the tone and setting hidden in the frame.",
    "Conversational elements that emerge from the mood and atmosphere of your media.",
    "Voice and personality traits derived from visual and auditory characteristics."
  ],
  mix: [
    "Blend your original aesthetic with fresh genres for share-ready variations.",
    "Creative fusion techniques that merge your style with trending artistic movements.",
    "Cross-pollination of visual languages to create unique hybrid aesthetics."
  ],
  expand: [
    "Seamless edge extension that widens the scene without breaking style.",
    "Contextual environment building that extends beyond the original boundaries.",
    "Atmospheric expansion that maintains visual coherence while adding depth."
  ],
  sound: [
    "Scene-aware audio cues, layered to amplify atmosphere and emotion.",
    "Sonic landscapes that complement and enhance the visual narrative.",
    "Musical arrangements that translate visual rhythm into auditory experience."
  ]
};

export const DecodePage: React.FC<DecodePageProps> = ({ onDecodeSuccess, onBack }) => {
  // const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null); // NEW: Store generated thumbnail
  
  // Active module states
  const [activeTopModule, setActiveTopModule] = useState<string>(TOP_MODULES[0].id);
  const [activeBottomModule, setActiveBottomModule] = useState<string>(BOTTOM_MODULES[0].id);
  
  // State for cycling through prompts
  const [currentPromptIndices, setCurrentPromptIndices] = useState({
    story: 0,
    motion: 0,
    dialogue: 0,
    mix: 0,
    expand: 0,
    sound: 0
  });

  // State for animating module for click feedback
  const [animatingModuleId, setAnimatingModuleId] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (file: File) => {
    // Validate file type
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'
    ];

    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image, video, or audio file.');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // NEW: Generate thumbnail for video files
    if (getMediaTypeFromFile(file) === 'video') {
      try {
        addBreadcrumb('Generating video thumbnail', 'ui', { fileName: file.name });
        const thumbnail = await generateThumbnailFile(file, {
          time: 1, // Capture at 1 second
          width: 320,
          height: 240,
          quality: 0.8
        });
        setThumbnailFile(thumbnail);
        addBreadcrumb('Video thumbnail generated successfully', 'ui', { 
          thumbnailSize: thumbnail.size 
        });
      } catch (thumbnailError) {
        console.error('Failed to generate video thumbnail:', thumbnailError);
        captureError(thumbnailError as Error, { context: 'generateVideoThumbnail' });
        // Continue without thumbnail - not a critical error
        setThumbnailFile(null);
      }
    } else {
      setThumbnailFile(null);
    }

    addBreadcrumb('File selected for analysis', 'ui', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      hasThumbnail: getMediaTypeFromFile(file) === 'video'
    });
  };

  const handleDecode = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      addBreadcrumb('Starting decode analysis', 'ui');
      
      // Call analysis function without user ID
      const analysis = await callGeminiAnalysisFunction(selectedFile);
      const mediaUrl = previewUrl || URL.createObjectURL(selectedFile);
      const mediaType = getMediaTypeFromFile(selectedFile);
      
      addBreadcrumb('Decode analysis completed', 'ui');
      
      // NEW: Pass thumbnail file to onDecodeSuccess
      onDecodeSuccess(analysis, mediaUrl, mediaType, selectedFile, thumbnailFile || undefined);
    } catch (error) {
      console.error('Decode failed:', error);
      let errorMessage = error instanceof Error ? error.message : 'Failed to analyze media';
      
      // Enhanced error handling for common issues
      if (errorMessage.includes('Edge Function returned a non-2xx status code')) {
        setError(
          'Analysis service is not properly configured. Please check that your Gemini API key is set in the environment variables and redeploy the site.'
        );
      } else if (errorMessage.includes('Failed to get response from Gemini API')) {
        setError(
          'AI analysis service is unavailable. Please check your Gemini API key configuration and try again.'
        );
      } else {
        setError(errorMessage);
      }
      
      captureError(error as Error, { context: 'handleDecode' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMediaTypeFromFile = (file: File): 'image' | 'video' | 'audio' => {
    const mimeType = file.type.toLowerCase();
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'image';
  };

  const getFileIcon = (file: File) => {
    const mediaType = getMediaTypeFromFile(file);
    switch (mediaType) {
      case 'image': return FileImage;
      case 'video': return FileVideo;
      case 'audio': return FileAudio;
      default: return FileImage;
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setThumbnailFile(null); // NEW: Clear thumbnail
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  // Handle tab click with animation and prompt cycling
  const handleTabClick = (moduleId: string, setActiveModule: (id: string) => void) => {
    // Trigger animation
    setAnimatingModuleId(moduleId);
    setTimeout(() => setAnimatingModuleId(null), 300);

    // Cycle to next prompt for this module
    setCurrentPromptIndices(prev => ({
      ...prev,
      [moduleId]: (prev[moduleId as keyof typeof prev] + 1) % 3
    }));

    // Set as active module
    setActiveModule(moduleId);
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
                {/* Glassmorphic overlay for active state */}
                {isActive && (
                  <div 
                    className="absolute inset-0 backdrop-blur-sm border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${module.color}15, ${module.color}05)`,
                      boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 3px ${module.color}30`
                    }}
                  />
                )}
                
                {/* Subtle glow effect */}
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

  const renderSingleModuleContent = (modules: ModuleDefinition[], activeModuleId: string) => {
    const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];
    const prompts = DECODE_MODULE_DESCRIPTIONS[activeModule.id as keyof typeof DECODE_MODULE_DESCRIPTIONS];
    const currentIndex = currentPromptIndices[activeModule.id as keyof typeof currentPromptIndices];
    const currentPrompt = prompts[currentIndex];
    
    return (
      <div className="p-3 bg-black/10 backdrop-blur-xs">
        <AnalysisContent
          currentPrompt={currentPrompt}
          moduleColor={activeModule.color}
        />
      </div>
    );
  };

  const getActiveModule = (modules: ModuleDefinition[], activeId: string) => {
    return modules.find(m => m.id === activeId) || modules[0];
  };

  // Check if error is about environment configuration
  const isEnvironmentError = error && (
    error.includes('Environment not configured') ||
    error.includes('Analysis service is not properly configured')
  );

  return (
    <div className="min-h-screen pt-16 h-screen overflow-hidden bg-charcoal-matte font-inter">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Section - Upload Area (70%) */}
        <div className="flex-1 w-2/3 p-4 flex items-center justify-center relative">
          <div className="w-full max-w-2xl">
            {/* Upload Section */}
            <div className="w-full p-8 text-center transition-all duration-300">
              {/* Drag and Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-purple-400 bg-purple-400/10'
                    : selectedFile
                    ? 'border-green-400 bg-green-400/5'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isAnalyzing}
                />
                
                {selectedFile ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center space-x-3">
                      {React.createElement(getFileIcon(selectedFile), { 
                        className: "w-12 h-12 text-green-400" 
                      })}
                      <span className="text-white font-medium text-lg">{selectedFile.name}</span>
                      <button
                        onClick={clearFile}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        disabled={isAnalyzing}
                      >
                        <X className="w-6 h-6 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-gray-400 text-base">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                      {/* NEW: Show thumbnail status for videos */}
                      {getMediaTypeFromFile(selectedFile) === 'video' && (
                        <span className="block mt-1 text-sm">
                          {thumbnailFile ? '✓ Thumbnail generated' : '⏳ Generating thumbnail...'}
                        </span>
                      )}
                    </p>
                    
                    {/* Preview */}
                    {previewUrl && (
                      <div className="mt-6 flex justify-center">
                        {getMediaTypeFromFile(selectedFile) === 'image' && (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-md max-h-64 rounded-lg shadow-lg"
                          />
                        )}
                        {getMediaTypeFromFile(selectedFile) === 'video' && (
                          <video
                            src={previewUrl}
                            controls
                            className="max-w-md max-h-64 rounded-lg shadow-lg"
                            poster={thumbnailFile ? URL.createObjectURL(thumbnailFile) : undefined}
                          />
                        )}
                        {getMediaTypeFromFile(selectedFile) === 'audio' && (
                          <div className="bg-white/10 rounded-lg p-6 w-full max-w-md">
                            <audio src={previewUrl} controls className="w-full" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center space-x-4 mb-6">
                      <FileImage className="w-16 h-16 text-gray-400" />
                      <FileVideo className="w-16 h-16 text-gray-400" />
                      <FileAudio className="w-16 h-16 text-gray-400" />
                    </div>
                    <Upload className="w-20 h-20 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-white font-medium text-2xl mb-4">
                        DeStyle
                      </h3>
                      <p className="text-white font-medium text-lg mb-2">
                        Drop your media here or click to browse
                      </p>
                      <p className="text-gray-400 text-base">
                        Supports images, videos, and audio files (max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className={`mt-6 p-4 rounded-lg flex items-start space-x-3 ${
                  isEnvironmentError 
                    ? 'bg-orange-500/10 border border-orange-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isEnvironmentError ? 'text-orange-400' : 'text-red-400'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm ${
                      isEnvironmentError ? 'text-orange-200' : 'text-red-200'
                    }`}>
                      {error}
                    </p>
                    {isEnvironmentError && (
                      <div className="mt-2">
                        <a
                          href="https://app.netlify.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-orange-300 hover:text-orange-200 text-sm underline"
                        >
                          <span>Open Netlify Dashboard</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-orange-300 text-xs mt-1">
                          Go to Site Settings → Environment Variables → Add required variables
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-8">
                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-gray-300 hover:text-white transition-all duration-300"
                  disabled={isAnalyzing}
                >
                  Back
                </button>
                
                {/* Decode Button */}
                <button
                  onClick={handleDecode}
                  disabled={!selectedFile || isAnalyzing}
                  className={`px-8 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-3 ${
                    !selectedFile || isAnalyzing
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Decode</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Descriptive Content (30%) */}
        <div className="w-1/3 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="bg-black/50 backdrop-blur-md shadow-inner relative p-4 rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={onBack}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-light text-[#7C9A92] mb-2">
                StyleDrop
              </h1>
              
              {/* Subtitle */}
              <p className="text-[#7C9A92] font-mono text-sm leading-relaxed mb-4">
                Multimodal Style Decoder
              </p>

              {/* Main Description */}
              <textarea
                value="A single drop-zone for any image, video clip, or audio loop. StyleDrop studies color, form, rhythm, and mood, then hands you ready-to-use prompts that glide across six creative lanes."
                readOnly
                className="w-full bg-white/5 rounded-xl p-3 text-[#E0E0E0] text-sm font-mono leading-relaxed resize-none border-none outline-none mb-6"
                rows={3}
              />

              {/* Module Sections */}
              <div className="space-y-6">
                {/* Top Modules */}
                <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/20 backdrop-blur-sm">
                  {renderModuleTabs(TOP_MODULES, activeTopModule, setActiveTopModule)}
                  {renderSingleModuleContent(TOP_MODULES, activeTopModule)}
                </div>

                {/* Bottom Modules */}
                <div className="border border-white/10 rounded-xl overflow-hidden shadow-lg bg-black/20 backdrop-blur-sm">
                  {renderModuleTabs(BOTTOM_MODULES, activeBottomModule, setActiveBottomModule)}
                  {renderSingleModuleContent(BOTTOM_MODULES, activeBottomModule)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};