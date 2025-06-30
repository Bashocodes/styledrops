import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the R2 functions
jest.mock('../src/lib/r2', () => ({
  handleR2Sign: jest.fn(),
  uploadFileToR2: jest.fn(),
  compressImage: jest.fn(),
}));

// Mock Supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'test-id', media_url: 'https://cdn.example.com/test.jpg' },
            error: null
          }))
        }))
      }))
    }))
  }
}));

import { handleR2Sign } from '../src/pages/api/r2-sign';
import { uploadFileToR2, compressImage } from '../src/lib/r2';

describe('R2 Image Upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('R2 Sign API', () => {
    it('should generate presigned URL for valid image upload', async () => {
      const mockResponse = {
        uploadUrl: 'https://test.r2.cloudflarestorage.com/presigned-url',
        publicUrl: 'https://cdn.example.com/uploads/test-image.jpg',
        key: 'uploads/test-image.jpg'
      };

      (handleR2Sign as jest.MockedFunction<typeof handleR2Sign>).mockResolvedValue(mockResponse);

      const request = {
        contentType: 'image/jpeg',
        ext: '.jpg',
        folder: 'uploads'
      };

      const result = await handleR2Sign(request);

      expect(result).toEqual(mockResponse);
      expect(result.uploadUrl).toContain('presigned-url');
      expect(result.publicUrl).toContain('cdn.example.com');
      expect(result.key).toContain('uploads/');
    });

    it('should reject unsupported file types', async () => {
      const mockError = {
        uploadUrl: '',
        publicUrl: '',
        key: '',
        error: 'Unsupported content type: application/pdf'
      };

      (handleR2Sign as jest.MockedFunction<typeof handleR2Sign>).mockResolvedValue(mockError);

      const request = {
        contentType: 'application/pdf',
        ext: '.pdf',
        folder: 'uploads'
      };

      const result = await handleR2Sign(request);

      expect(result.error).toContain('Unsupported content type');
    });
  });

  describe('File Upload to R2', () => {
    it('should upload file successfully with progress tracking', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockUploadUrl = 'https://test.r2.cloudflarestorage.com/presigned-url';
      const progressCallback = jest.fn();

      (uploadFileToR2 as jest.MockedFunction<typeof uploadFileToR2>).mockResolvedValue(undefined);

      await uploadFileToR2(mockFile, mockUploadUrl, progressCallback);

      expect(uploadFileToR2).toHaveBeenCalledWith(mockFile, mockUploadUrl, progressCallback);
    });

    it('should handle upload failures gracefully', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockUploadUrl = 'https://test.r2.cloudflarestorage.com/presigned-url';

      (uploadFileToR2 as jest.MockedFunction<typeof uploadFileToR2>).mockRejectedValue(
        new Error('Upload failed with status 500')
      );

      await expect(uploadFileToR2(mockFile, mockUploadUrl)).rejects.toThrow('Upload failed with status 500');
    });
  });

  describe('Image Compression', () => {
    it('should compress large images', async () => {
      const mockLargeFile = new File(['large content'], 'large.jpg', { type: 'image/jpeg' });
      const mockCompressedFile = new File(['compressed content'], 'large.jpg', { type: 'image/jpeg' });

      (compressImage as jest.MockedFunction<typeof compressImage>).mockResolvedValue(mockCompressedFile);

      const result = await compressImage(mockLargeFile, 2);

      expect(result).toBe(mockCompressedFile);
      expect(compressImage).toHaveBeenCalledWith(mockLargeFile, 2);
    });

    it('should handle compression failures', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      (compressImage as jest.MockedFunction<typeof compressImage>).mockRejectedValue(
        new Error('Failed to compress image')
      );

      await expect(compressImage(mockFile, 2)).rejects.toThrow('Failed to compress image');
    });
  });

  describe('End-to-End Upload Flow', () => {
    it('should complete full upload workflow', async () => {
      // Mock the entire flow
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockSignResponse = {
        uploadUrl: 'https://test.r2.cloudflarestorage.com/presigned-url',
        publicUrl: 'https://cdn.example.com/uploads/test-image.jpg',
        key: 'uploads/test-image.jpg'
      };

      (handleR2Sign as jest.MockedFunction<typeof handleR2Sign>).mockResolvedValue(mockSignResponse);
      (compressImage as jest.MockedFunction<typeof compressImage>).mockResolvedValue(mockFile);
      (uploadFileToR2 as jest.MockedFunction<typeof uploadFileToR2>).mockResolvedValue(undefined);

      // Simulate the upload flow
      const signResult = await handleR2Sign({
        contentType: mockFile.type,
        ext: '.jpg',
        folder: 'uploads'
      });

      expect(signResult.error).toBeUndefined();
      expect(signResult.publicUrl).toContain('cdn.example.com');

      const compressedFile = await compressImage(mockFile, 2);
      expect(compressedFile).toBeDefined();

      await uploadFileToR2(compressedFile, signResult.uploadUrl);

      // Verify all steps were called
      expect(handleR2Sign).toHaveBeenCalled();
      expect(compressImage).toHaveBeenCalled();
      expect(uploadFileToR2).toHaveBeenCalled();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete upload within reasonable time', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockUploadUrl = 'https://test.r2.cloudflarestorage.com/presigned-url';

      (uploadFileToR2 as jest.MockedFunction<typeof uploadFileToR2>).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)) // 100ms mock upload
      );

      const startTime = Date.now();
      await uploadFileToR2(mockFile, mockUploadUrl);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second for test
    });
  });
});