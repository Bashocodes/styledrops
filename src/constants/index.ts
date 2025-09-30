/**
 * Centralized constants for the StyleDrop application
 * This file contains all magic strings and configuration values used across the app
 */

// R2 Storage Folder Names
export const R2_FOLDERS = {
  UPLOADS: 'uploads',
  POSTS: 'posts', 
  THUMBNAILS: 'thumbnails'
} as const;

// Allowed Media Types for Upload and Analysis
export const ALLOWED_MEDIA_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  // Videos
  'video/mp4',
  'video/webm',
  'video/ogg',
  // Audio
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mpeg'
] as const;

// Media Type Categories
export const MEDIA_TYPE_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio'
} as const;

// File Size Limits (in MB)
export const FILE_SIZE_LIMITS = {
  MAX_UPLOAD_SIZE_MB: 10,
  MAX_COMPRESSION_SIZE_MB: 2
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  NETLIFY_R2_SIGN: '/.netlify/functions/r2-sign'
} as const;

// Default Values
export const DEFAULTS = {
  GALLERY_PAGE_SIZE: 12,
  PRESIGNED_URL_EXPIRY_SECONDS: 300, // 5 minutes
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  USERNAME_CHANGE_COOLDOWN_DAYS: 30
} as const;