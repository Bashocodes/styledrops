/*
  # Add thumbnail_url column to posts table

  1. Changes
    - Add `thumbnail_url` column to posts table for storing video thumbnail URLs
    - This enables video thumbnails in gallery views

  2. Security
    - Column is optional (nullable) to maintain compatibility with existing posts
    - No RLS changes needed as it follows existing post security model
*/

-- Add thumbnail_url column to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add index for thumbnail_url for potential future queries
CREATE INDEX IF NOT EXISTS posts_thumbnail_url_idx ON public.posts(thumbnail_url) WHERE thumbnail_url IS NOT NULL;