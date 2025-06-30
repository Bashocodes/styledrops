/*
  # Add r2_key column to posts table for R2 object management

  1. Changes
    - Add `r2_key` column to posts table for storing R2 object keys
    - This enables proper cleanup when deleting posts

  2. Security
    - Column is optional (nullable) to maintain compatibility with existing posts
    - No RLS changes needed as it follows existing post security model
*/

-- Add r2_key column to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS r2_key text;

-- Add index for r2_key for potential future queries
CREATE INDEX IF NOT EXISTS posts_r2_key_idx ON public.posts(r2_key) WHERE r2_key IS NOT NULL;