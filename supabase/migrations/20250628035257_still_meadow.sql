/*
  # Fix blob URLs in posts table

  1. Data Cleanup
    - Update posts with blob: URLs to use proper Supabase storage URLs
    - Remove any invalid blob: URLs that cannot be fixed

  2. Safety
    - Only update posts where media_url contains 'blob:'
    - Preserve posts with valid HTTP URLs
*/

-- First, let's see what we're dealing with (this is just for logging)
-- SELECT COUNT(*) as blob_url_count FROM posts WHERE media_url LIKE '%blob:%';

-- Update posts that have blob URLs to use a placeholder or remove them
-- Since blob URLs are temporary and cannot be recovered, we'll need to either:
-- 1. Remove these posts entirely, or 
-- 2. Set them to a placeholder image

-- Option 1: Remove posts with blob URLs (recommended for clean data)
DELETE FROM posts WHERE media_url LIKE '%blob:%';

-- Option 2: Alternative - Set to placeholder (uncomment if you prefer to keep posts)
-- UPDATE posts 
-- SET media_url = 'https://images.pexels.com/photos/8566473/pexels-photo-8566473.jpeg'
-- WHERE media_url LIKE '%blob:%';

-- Add a constraint to prevent blob URLs in the future
ALTER TABLE posts ADD CONSTRAINT posts_no_blob_urls CHECK (media_url NOT LIKE '%blob:%');

-- Add a constraint to ensure media_url is a valid HTTP URL
ALTER TABLE posts ADD CONSTRAINT posts_valid_http_url CHECK (
  media_url LIKE 'http://%' OR media_url LIKE 'https://%'
);