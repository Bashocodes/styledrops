/**
 * Video thumbnail generation utility
 * Generates a thumbnail image from a video file at a specific time
 */

export interface ThumbnailOptions {
  time?: number; // Time in seconds to capture the thumbnail (default: 1)
  width?: number; // Thumbnail width (default: 320)
  height?: number; // Thumbnail height (default: 240)
  quality?: number; // JPEG quality 0-1 (default: 0.8)
}

export const generateVideoThumbnail = (
  file: File,
  options: ThumbnailOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const {
      time = 1,
      width = 320,
      height = 240,
      quality = 0.8
    } = options;

    // Create video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    // Create canvas for thumbnail generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Handle video load
    video.addEventListener('loadedmetadata', () => {
      // Calculate aspect ratio and adjust canvas if needed
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const canvasAspectRatio = width / height;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspectRatio > canvasAspectRatio) {
        // Video is wider than canvas
        drawHeight = width / videoAspectRatio;
        offsetY = (height - drawHeight) / 2;
      } else {
        // Video is taller than canvas
        drawWidth = height * videoAspectRatio;
        offsetX = (width - drawWidth) / 2;
      }

      // Set time to capture thumbnail
      video.currentTime = Math.min(time, video.duration);
    });

    // Handle seeking to the specific time
    video.addEventListener('seeked', () => {
      try {
        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/jpeg', quality);
        
        // Clean up
        video.remove();
        canvas.remove();
        URL.revokeObjectURL(video.src);

        resolve(dataURL);
      } catch (error) {
        reject(new Error(`Failed to generate thumbnail: ${error}`));
      }
    });

    // Handle errors
    video.addEventListener('error', (e) => {
      video.remove();
      canvas.remove();
      URL.revokeObjectURL(video.src);
      reject(new Error(`Video loading failed: ${e}`));
    });

    // Start loading the video
    video.src = URL.createObjectURL(file);
    video.load();
  });
};

/**
 * Convert data URL to File object
 */
export const dataURLToFile = (dataURL: string, filename: string): File => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

/**
 * Generate thumbnail and convert to File for upload
 */
export const generateThumbnailFile = async (
  videoFile: File,
  options: ThumbnailOptions = {}
): Promise<File> => {
  const thumbnailDataURL = await generateVideoThumbnail(videoFile, options);
  const thumbnailFilename = `thumbnail_${videoFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
  return dataURLToFile(thumbnailDataURL, thumbnailFilename);
};