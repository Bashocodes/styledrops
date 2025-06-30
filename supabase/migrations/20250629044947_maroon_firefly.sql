/*
  # Fix RLS Policies to Resolve 406 Not Acceptable Error

  1. Problem
    - Users getting 406 errors when fetching bookmarked analyses
    - Current RLS policies are too restrictive for analyses and images tables
    - Users can't access analyses/images data even for their own bookmarks

  2. Solution
    - Allow authenticated users to read all analyses (since they're meant to be shareable)
    - Allow authenticated users to read all images (since they're used in public posts)
    - Keep write permissions restricted to owners only

  3. Security
    - Maintains data integrity by keeping INSERT/UPDATE/DELETE restricted
    - Allows broader READ access which is appropriate for a social platform
    - Users can still only bookmark/unbookmark their own items
*/

-- Drop existing restrictive SELECT policies for analyses
DROP POLICY IF EXISTS "Users can view analyses for their images" ON public.analyses;

-- Drop existing restrictive SELECT policies for images  
DROP POLICY IF EXISTS "Users can view their own images" ON public.images;

-- Create new broader SELECT policies for analyses
-- Allow authenticated users to read all analyses (they're meant to be shareable content)
CREATE POLICY "Authenticated users can read all analyses"
  ON public.analyses
  FOR SELECT
  TO authenticated
  USING (true);

-- Create new broader SELECT policies for images
-- Allow authenticated users to read all images (they're used in public posts and galleries)
CREATE POLICY "Authenticated users can read all images"
  ON public.images
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure public can still read analyses and images (for gallery view)
-- These policies should already exist, but let's make sure they're in place

-- Public read access for analyses (already exists, but ensuring it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analyses' 
    AND policyname = 'Public analyses are viewable by everyone'
  ) THEN
    CREATE POLICY "Public analyses are viewable by everyone"
      ON public.analyses
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Public read access for images (already exists, but ensuring it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'images' 
    AND policyname = 'Public images are viewable by everyone'
  ) THEN
    CREATE POLICY "Public images are viewable by everyone"
      ON public.images
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;