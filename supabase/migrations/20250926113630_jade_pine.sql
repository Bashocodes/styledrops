/*
  # Enable Anonymous Posting to Gallery

  1. Changes
    - Allow anonymous users to insert posts to the gallery
    - Allow null user_id in posts table for anonymous posts
    - Update RLS policies to permit anonymous posting

  2. Security
    - Anonymous posts will have user_id = null and username = 'Anonymous'
    - Maintains existing security for authenticated users
    - Anonymous users cannot delete posts (no user_id to match)
*/

-- Allow anonymous users to insert posts
CREATE POLICY "Allow anonymous users to create posts"
  ON public.posts
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL AND 
    username = 'Anonymous'
  );

-- Update the existing authenticated user policy to be more explicit
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;

CREATE POLICY "Authenticated users can create posts"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND 
    user_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid())
  );