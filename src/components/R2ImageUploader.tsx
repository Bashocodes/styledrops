import React, { useState, useCallback } from 'react';
import { Upload, Loader2, AlertCircle, FileImage, FileVideo, FileAudio, X, Check } from 'lucide-react';
import { uploadFileToR2, compressImage } from '../lib/r2';
import { addBreadcrumb, captureError } from '../lib/sentry';

interface R2ImageUploaderProps {
  onUploadSuccess: (publicUrl: string, key: string) => void;
  onUploadError?: (error: string) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  folder?: string;
  className?: string;
}

export const R2ImageUploader: React.FC<R2ImageUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxSizeMB = 10,
  folder = 'uploads',
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    try {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        setError(`Please select a valid file type: ${acceptedTypes.join(', ')}`);
        return;
      }

      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File size must be less than ${maxSizeMB}MB.`);
        return;
      }

      setSelectedFile(file);
      setError(null);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      addBreadcrumb('File selected for R2 upload', 'ui', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select file';
      setError(errorMessage);
      captureError(error as Error, { context: 'handleFileSelection' });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      addBreadcrumb('Starting R2 upload process', 'upload');

      // Compress image if it's an image file
      let fileToUpload = selectedFile;
      if (selectedFile.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(selectedFile, 2);
          addBreadcrumb('Image compressed successfully', 'upload', {
            originalSize: selectedFile.size,
            compressedSize: fileToUpload.size
          });
        } catch (compressionError) {
          console.warn('Image compression failed, using original file:', compressionError);
          // Continue with original file if compression fails
        }
      }

      // Get file extension
      const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

      // Get presigned URL from Netlify Function
      const signResponse = await fetch(`/.netlify/functions/r2-sign?contentType=${fileToUpload.type}&ext=${ext}&folder=${folder}`);
      const signResult = await signResponse.json();

      if (!signResponse.ok || signResult.error) {
        throw new Error(signResult.error || 'Failed to get presigned URL from Netlify Function');
      }

      // Upload file to R2
      await uploadFileToR2(
        fileToUpload,
        signResult.uploadUrl,
        (progress) => setUploadProgress(progress)
      );

      addBreadcrumb('R2 upload completed successfully', 'upload', {
        publicUrl: signResult.publicUrl,
        key: signResult.key
      });

      // Call success callback
      onUploadSuccess(signResult.publicUrl, signResult.key);

      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);

    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
      captureError(error as Error, { context: 'handleUpload' });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const getFileIcon = (file: File) => {
    const mediaType = file.type.toLowerCase();
    if (mediaType.startsWith('image/')) return FileImage;
    if (mediaType.startsWith('video/')) return FileVideo;
    if (mediaType.startsWith('audio/')) return FileAudio;
    return FileImage;
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
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
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              {React.createElement(getFileIcon(selectedFile), { 
                className: "w-8 h-8 text-green-400" 
              })}
              <span className="text-white font-medium">{selectedFile.name}</span>
              <button
                onClick={clearFile}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                disabled={isUploading}
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
            </p>
            
            {/* Preview */}
            {previewUrl && selectedFile.type.startsWith('image/') && (
              <div className="mt-4 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-xs max-h-32 rounded-lg shadow-lg object-cover"
                />
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-white font-medium text-lg mb-2">
                Drop your file here or click to browse
              </p>
              <p className="text-gray-400 text-sm">
                Supports {acceptedTypes.join(', ')} (max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-200 text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !isUploading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleUpload}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload to R2</span>
          </button>
        </div>
      )}

      {/* Upload Status */}
      {isUploading && (
        <div className="mt-4 flex items-center justify-center space-x-3">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-white">Uploading... {Math.round(uploadProgress)}%</span>
        </div>
      )}
    </div>
  );
};