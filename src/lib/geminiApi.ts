// import { supabase } from './supabase';
import { AnalysisResult } from '../constants/modules';
import { captureError, addBreadcrumb } from './sentry';
// import { saveAnalysisToDatabase } from './supabaseUtils';
// import { uploadFileToR2, compressImage } from './r2';
import { extractGeminiJSON } from '../utils/geminiParser';
import { makeUUID } from '../utils/uuid';

export interface GeminiAnalysisRequest {
  mediaData: string; // base64 encoded media
  mimeType: string;
  mediaType: 'image' | 'video' | 'audio';
}

export const callGeminiAnalysisFunction = async (file: File): Promise<AnalysisResult> => {
  try {
    addBreadcrumb('Starting Gemini analysis', 'api', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type
    });

    // Convert file to base64 for Gemini analysis
    const base64Data = await fileToBase64(file);
    
    console.log('CLIENT: Base64 conversion completed', {
      base64Length: base64Data.length,
      base64Preview: base64Data.substring(0, 50) + '...',
      originalFileSize: file.size,
      originalFileName: file.name,
      originalFileType: file.type
    });
    
    // Determine media type
    const mediaType = getMediaTypeFromFile(file);
    
    // Prepare request payload
    const requestPayload: GeminiAnalysisRequest = {
      mediaData: base64Data,
      mimeType: file.type,
      mediaType
    };

    console.log('CLIENT: Request payload prepared', {
      mediaDataLength: requestPayload.mediaData.length,
      mimeType: requestPayload.mimeType,
      mediaType: requestPayload.mediaType,
      payloadSize: JSON.stringify(requestPayload).length
    });

    addBreadcrumb('Calling Supabase Edge Function for analysis', 'api');

    // Call Supabase Edge Function for analysis (mock for now)
    // const { data, error } = await supabase.functions.invoke('analyze-media', {
    //   body: requestPayload
    // });
    
    // Mock response for now - in a real implementation, you'd call the actual API
    const data = {
      analysis: {
        title: 'AI Analysis',
        style: 'Generated Style',
        prompt: 'This is a mock analysis result generated from the uploaded media file for demonstration purposes.',
        keyTokens: [
          'mock analysis',
          'demo result',
          'ai generated',
          'style detection',
          'creative prompt',
          'media analysis',
          'test output'
        ],
        creativeRemixes: [
          'Transform this concept into a vibrant digital art piece with neon colors and futuristic elements.',
          'Reimagine as a vintage photograph with sepia tones and classic composition techniques.',
          'Convert to minimalist line art with clean geometric shapes and monochromatic palette.'
        ],
        outpaintingPrompts: [
          'Expand the scene to reveal surrounding environment with additional contextual details and background elements.',
          'Extend the composition to include complementary objects and atmospheric effects in the periphery.',
          'Broaden the view to show the complete setting with enhanced depth and spatial relationships.'
        ],
        animationPrompts: [
          'Create gentle motion with subtle movements and smooth transitions lasting approximately five seconds.',
          'Add dynamic elements with flowing particles and rhythmic changes in lighting and atmosphere.',
          'Implement cinematic camera movement revealing different perspectives and hidden details gradually.'
        ],
        musicPrompts: [
          'Ambient electronic soundscape with layered synthesizers, soft percussion, and atmospheric textures creating an immersive auditory experience.',
          'Orchestral composition featuring strings, woodwinds, and brass instruments with dynamic crescendos and melodic development.',
          'Minimalist piano piece with sparse notes, reverb effects, and subtle harmonic progressions evoking contemplative mood.'
        ],
        dialoguePrompts: [
          'The essence of creativity unfolds',
          'Where imagination meets reality',
          'Beyond the visible spectrum'
        ],
        storyPrompts: [
          'A mysterious discovery leads to an unexpected journey of self-discovery and creative awakening.',
          'An artist finds inspiration in the most unlikely place, transforming ordinary into extraordinary.',
          'The boundary between dreams and reality blurs as creative vision becomes tangible experience.'
        ]
      }
    };
    const error = null;

    console.log('CLIENT: Supabase function response', {
      hasData: !!data,
      hasError: !!error,
      errorDetails: error,
      dataKeys: data ? Object.keys(data) : null
    });

    if (error) {
      console.error('Supabase function error:', error);
      captureError(new Error(error.message), { 
        context: 'callGeminiAnalysisFunction',
        functionName: 'analyze-media',
        errorDetails: error
      });
      throw new Error(`Analysis failed: ${error.message}`);
    }

    if (!data || !data.analysis) {
      throw new Error('Invalid response from analysis service');
    }

    addBreadcrumb('Gemini analysis completed successfully', 'api');
    
    // Parse and validate the analysis result using our robust parser
    let analysisResult = parseAnalysisResponse(data.analysis);

    // No database save in mock implementation
    addBreadcrumb('Analysis completed (mock implementation)', 'api');
    
    return analysisResult;
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    captureError(error as Error, { context: 'callGeminiAnalysisFunction' });
    throw error;
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      
      console.log('CLIENT: FileReader completed', {
        originalResultLength: result.length,
        base64Length: base64.length,
        hasDataPrefix: result.includes('data:'),
        resultPrefix: result.substring(0, 50)
      });
      
      resolve(base64);
    };
    reader.onerror = () => {
      console.error('CLIENT: FileReader error');
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

const getMediaTypeFromFile = (file: File): 'image' | 'video' | 'audio' => {
  const mimeType = file.type.toLowerCase();
  
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  
  return 'image';
};

const parseAnalysisResponse = (response: any): AnalysisResult => {
  try {
    let analysisData = response;
    
    // If response is a string, try to parse it using our robust parser
    if (typeof response === 'string') {
      analysisData = extractGeminiJSON(response);
    } else {
      // If it's already an object, validate it
      const requiredFields = [
        'title', 'style', 'prompt', 'keyTokens', 
        'creativeRemixes', 'outpaintingPrompts', 'animationPrompts',
        'musicPrompts', 'dialoguePrompts', 'storyPrompts'
      ];

      for (const field of requiredFields) {
        if (!analysisData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    const analysisResult: AnalysisResult = {
      id: makeUUID(), // Generate a temporary UUID that will be replaced if saved to database
      title: analysisData.title,
      style: analysisData.style,
      prompt: analysisData.prompt,
      keyTokens: Array.isArray(analysisData.keyTokens) ? analysisData.keyTokens : [],
      creativeRemixes: Array.isArray(analysisData.creativeRemixes) ? analysisData.creativeRemixes : [],
      outpaintingPrompts: Array.isArray(analysisData.outpaintingPrompts) ? analysisData.outpaintingPrompts : [],
      animationPrompts: Array.isArray(analysisData.animationPrompts) ? analysisData.animationPrompts : [],
      musicPrompts: Array.isArray(analysisData.musicPrompts) ? analysisData.musicPrompts : [],
      dialoguePrompts: Array.isArray(analysisData.dialoguePrompts) ? analysisData.dialoguePrompts : [],
      storyPrompts: Array.isArray(analysisData.storyPrompts) ? analysisData.storyPrompts : []
    };

    return analysisResult;
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
    captureError(error as Error, { 
      context: 'parseAnalysisResponse',
      response: typeof response === 'string' ? response.substring(0, 500) : response
    });
    throw new Error('Failed to parse analysis response');
  }
};