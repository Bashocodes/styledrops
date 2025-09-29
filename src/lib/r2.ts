import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { addBreadcrumb, captureError } from './sentry';
import { makeUUID } from '../utils/uuid';
import { R2_FOLDERS, FILE_SIZE_LIMITS, DEFAULTS } from '../constants';

// R2 client configuration
export const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY!,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_KEY!,
  },
});

export interface PresignedUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface UploadRequest {
  contentType: string;
  ext: string;
  folder?: string;
}

// Generate a presigned URL for uploading to R2
export const getPresignedUploadUrl = async (request: UploadRequest): Promise<PresignedUploadResponse> => {
  try {
    addBreadcrumb('Generating presigned upload URL', 'r2', { 
      contentType: request.contentType,
      ext: request.ext,
      folder: request.folder || R2_FOLDERS.UPLOADS
    });

    const key = `${request.folder || R2_FOLDERS.UPLOADS}/${makeUUID()}${request.ext}`;
    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;

    if (!bucketName) {
      throw new Error('VITE_R2_BUCKET_NAME not configured');
    }

    if (!publicBaseUrl) {
      throw new Error('VITE_R2_PUBLIC_URL not configured');
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: request.contentType,
      ACL: "public-read",
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: DEFAULTS.PRESIGNED_URL_EXPIRY_SECONDS });
    const publicUrl = `${publicBaseUrl}${key}`;

    addBreadcrumb('Presigned URL generated successfully', 'r2', { key, publicUrl });

    return {
      uploadUrl,
      publicUrl,
      key
    };
  } catch (error) {
    captureError(error as Error, { context: 'getPresignedUploadUrl', request });
    throw error;
  }
};

// Upload file directly to R2 using presigned URL
export const uploadFileToR2 = async (
  file: File, 
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  try {
    addBreadcrumb('Starting R2 file upload', 'r2', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: file.type 
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          addBreadcrumb('R2 file upload completed', 'r2');
          resolve();
        } else {
          const error = new Error(`Upload failed with status ${xhr.status}`);
          captureError(error, { context: 'uploadFileToR2', status: xhr.status });
          reject(error);
        }
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Upload failed due to network error');
        captureError(error, { context: 'uploadFileToR2' });
        reject(error);
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    captureError(error as Error, { context: 'uploadFileToR2' });
    throw error;
  }
};

// Delete file from R2
export const deleteFileFromR2 = async (key: string): Promise<void> => {
  try {
    addBreadcrumb('Deleting file from R2', 'r2', { key });

    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error('VITE_R2_BUCKET_NAME not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await r2Client.send(command);
    addBreadcrumb('File deleted from R2 successfully', 'r2', { key });
  } catch (error) {
    captureError(error as Error, { context: 'deleteFileFromR2', key });
    throw error;
  }
};

// Compress image client-side before upload
export const compressImage = (file: File, maxSizeMB: number = FILE_SIZE_LIMITS.MAX_COMPRESSION_SIZE_MB): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions to keep under size limit
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Check if compressed size is under limit
            const sizeMB = blob.size / (1024 * 1024);
            if (sizeMB <= maxSizeMB) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // If still too large, reduce quality further
              canvas.toBlob(
                (secondBlob) => {
                  if (!secondBlob) {
                    reject(new Error('Failed to compress image'));
                    return;
                  }
                  const finalFile = new File([secondBlob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  });
                  resolve(finalFile);
                },
                file.type,
                0.6 // Lower quality for further compression
              );
            }
          },
          file.type,
          0.8 // Initial quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Extract key from R2 public URL
export const extractKeyFromUrl = (publicUrl: string): string | null => {
  try {
    const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    if (!publicBaseUrl) return null;
    
    if (publicUrl.startsWith(publicBaseUrl)) {
      return publicUrl.substring(publicBaseUrl.length);
    }
    
    return null;
  } catch (error) {
    captureError(error as Error, { context: 'extractKeyFromUrl', publicUrl });
    return null;
  }
};