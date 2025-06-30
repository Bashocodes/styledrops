import { getPresignedUploadUrl, UploadRequest } from '../../lib/r2';
import { addBreadcrumb, captureError } from '../../lib/sentry';

export interface R2SignRequest {
  contentType: string;
  ext: string;
  folder?: string;
}

export interface R2SignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  error?: string;
}

// This would be used in a serverless function or API route
// For Vite, we'll call the R2 functions directly from the client
export const handleR2Sign = async (request: R2SignRequest): Promise<R2SignResponse> => {
  try {
    addBreadcrumb('R2 sign request received', 'api', request);

    // Validate request
    if (!request.contentType || !request.ext) {
      throw new Error('Missing required parameters: contentType and ext');
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/mpeg'
    ];

    if (!allowedTypes.includes(request.contentType)) {
      throw new Error(`Unsupported content type: ${request.contentType}`);
    }

    // Generate presigned URL
    const result = await getPresignedUploadUrl({
      contentType: request.contentType,
      ext: request.ext,
      folder: request.folder || 'uploads'
    });

    addBreadcrumb('R2 sign request completed', 'api', { key: result.key });

    return result;
  } catch (error) {
    console.error('R2 sign request failed:', error);
    captureError(error as Error, { context: 'handleR2Sign', request });
    
    return {
      uploadUrl: '',
      publicUrl: '',
      key: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};