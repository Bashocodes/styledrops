import { supabase } from './supabase';
import { AnalysisResult } from '../constants/modules';
import { captureError, addBreadcrumb } from './sentry';
import { saveAnalysisToDatabase } from './supabaseUtils';
import { uploadFileToR2, compressImage } from './r2';
import { extractGeminiJSON } from '../utils/geminiParser';
import { makeUUID } from '../utils/uuid';

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

    // Step 1: Upload file to R2 first
    let r2PublicUrl = '';
    let r2Key = '';
    
    if (userId) {
      try {
        addBreadcrumb('Uploading file to R2 before analysis', 'upload');

        // Compress image if needed
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(file, 2);
            addBreadcrumb('Image compressed for R2 upload', 'upload', {
              originalSize: file.size,
              compressedSize: fileToUpload.size
            });
          } catch (compressionError) {
            console.warn('Image compression failed, using original file:', compressionError);
          }
        }

        // Get presigned URL from Netlify Function with proper error handling
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const signUrl = `/.netlify/functions/r2-sign?contentType=${encodeURIComponent(fileToUpload.type)}&ext=${encodeURIComponent(ext)}&folder=analyses`;
        
        console.log('Requesting presigned URL from:', signUrl);
        
        const signResponse = await fetch(signUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!signResponse.ok) {
          const errorText = await signResponse.text();
          console.error('Presigned URL request failed:', {
            status: signResponse.status,
            statusText: signResponse.statusText,
            errorText: errorText
          });
          throw new Error(`Failed to get presigned URL: ${signResponse.status} ${signResponse.statusText}`);
        }

        const signResult = await signResponse.json();

        if (signResult.error) {
          throw new Error(signResult.error);
        }

        // Upload to R2
        await uploadFileToR2(fileToUpload, signResult.uploadUrl);
        
        r2PublicUrl = signResult.publicUrl;
        r2Key = signResult.key;
        
        addBreadcrumb('File uploaded to R2 successfully', 'upload', {
          publicUrl: r2PublicUrl,
          key: r2Key
        });
      } catch (uploadError) {
        console.error('R2 upload failed, proceeding with analysis only:', uploadError);
        captureError(uploadError as Error, { context: 'r2UploadBeforeAnalysis' });
        // Continue with analysis even if R2 upload fails
      }
    }

    // Step 2: Convert file to base64 for Gemini analysis
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

    // Step 4: If user is authenticated and R2 upload succeeded, save to database
    if (userId && r2PublicUrl && r2Key) {
      try {
        addBreadcrumb('Starting database save with R2 URL', 'database', { userId, r2PublicUrl });

        const analysisId = await saveAnalysisToDatabase(
          r2PublicUrl, // R2 CDN URL
          r2Key, // R2 object key
          userId,
          analysisResult,
          file.name,
          file.size,
          file.type
        );
        
        // Update the analysis result with the database-generated UUID
        analysisResult.id = analysisId;
        
        addBreadcrumb('Analysis saved with database UUID and R2 URL', 'database', { analysisId, r2PublicUrl });
        console.log('CLIENT: Analysis saved successfully with UUID and R2 URL:', analysisId);
      } catch (dbError) {
        console.error('Database save failed:', dbError);
        captureError(dbError as Error, { 
          context: 'saveAnalysisToDatabase',
          userId,
          fileName: file.name,
          r2PublicUrl,
          r2Key
        });
        addBreadcrumb('Database save failed, analysis will not have database ID', 'database', {
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
        
        // Don't throw error here - continue with analysis without database save
        console.warn('Continuing without database save due to database operation failure');
        
        throw new Error(`Analysis completed but could not be saved to database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    } else {
      addBreadcrumb('User not authenticated or R2 upload failed, skipping database save', 'database');
      console.log('CLIENT: User not authenticated or R2 upload failed, analysis will not be saved to database');
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