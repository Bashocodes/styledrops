import { supabase } from './supabase';
import { AnalysisResult } from '../constants/modules';
import { captureError, addBreadcrumb } from './sentry';
import { saveAnalysisToDatabase } from './supabaseUtils';
import { uploadFileToR2, compressImage } from './r2';
import { extractGeminiJSON } from '../utils/geminiParser';
import { makeUUID } from '../utils/uuid';
import { R2_FOLDERS, MEDIA_TYPE_CATEGORIES } from '../constants';

export interface GeminiAnalysisRequest {
  mediaData: string; // base64 encoded media
  mimeType: string;
  mediaType: 'image' | 'video' | 'audio';
}

export const callGeminiAnalysisFunction = async (file: File, userId?: string): Promise<AnalysisResult> => {
  try {
    addBreadcrumb('Starting Gemini analysis with R2 upload', 'api', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type,
      hasUserId: !!userId
    });

    // Step 1: Convert file to base64 for Gemini analysis
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

    // Step 3: Call Supabase Edge Function for analysis
    const { data, error } = await supabase.functions.invoke('analyze-media', {
      body: requestPayload
    });

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

    // Step 4: Save to database if we have a userId (including 'anon')
    if (userId && file) {
      try {
        addBreadcrumb('Saving analysis to database', 'database', { userId });
        
        // Upload file to R2 for database storage
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        
        // Get presigned URL from Netlify Function
        const signResponse = await fetch(`/.netlify/functions/r2-sign?contentType=${file.type}&ext=${ext}&folder=${R2_FOLDERS.UPLOADS}`);
        const signResult = await signResponse.json();

        if (!signResponse.ok || signResult.error) {
          throw new Error(signResult.error || 'Failed to get presigned URL from Netlify Function');
        }

        // Compress image if needed
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(file, 2);
          } catch (compressionError) {
            console.warn('Image compression failed, using original file:', compressionError);
          }
        }

        await uploadFileToR2(fileToUpload, signResult.uploadUrl);
        
        // Save analysis to database with R2 URL
        const analysisId = await saveAnalysisToDatabase(
          signResult.publicUrl, // R2 CDN URL
          signResult.key, // R2 key
          userId,
          analysisResult,
          file.name,
          file.size,
          file.type
        );
        
        // Update analysis result with database ID
        analysisResult.id = analysisId;
        
        addBreadcrumb('Analysis saved to database successfully', 'database', { analysisId });
        console.log('CLIENT: Analysis saved to database with ID:', analysisId);
      } catch (saveError) {
        console.error('Failed to save analysis to database:', saveError);
        captureError(saveError as Error, { context: 'saveAnalysisToDatabase' });
        // Continue without database save - analysis still works
        addBreadcrumb('Analysis completed without database save due to error', 'database');
      }
    } else {
      addBreadcrumb('Analysis completed without database save (no userId)', 'database');
      console.log('CLIENT: Analysis completed successfully without database persistence');
    }
    
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
  
  if (mimeType.startsWith(`${MEDIA_TYPE_CATEGORIES.IMAGE}/`)) {
    return MEDIA_TYPE_CATEGORIES.IMAGE;
  } else if (mimeType.startsWith(`${MEDIA_TYPE_CATEGORIES.VIDEO}/`)) {
    return MEDIA_TYPE_CATEGORIES.VIDEO;
  } else if (mimeType.startsWith(`${MEDIA_TYPE_CATEGORIES.AUDIO}/`)) {
    return MEDIA_TYPE_CATEGORIES.AUDIO;
  }
  
  return MEDIA_TYPE_CATEGORIES.IMAGE;
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