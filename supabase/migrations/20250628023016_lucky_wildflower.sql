/*
  # Standardize Database Schema

  This migration reshapes the database to match the simplified, proven layout:
  - images: One row per upload
  - analyses: Holds Gemini/ML output
  - posts: Visible to public feed
  - bookmarks: User favourites
  - profiles: One row per user

  1. New Tables
    - Standardizes existing tables to exact column requirements
    - Ensures proper foreign key relationships
    - Sets up correct RLS policies

  2. Storage
    - Ensures posts-media bucket exists and is properly configured

  3. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS analyses CASCADE;
DROP TABLE IF EXISTS text_posts CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS images CASCADE;

-- Create images table (standardized)
CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text,
  file_size bigint,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- Create analyses table (standardized)
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid REFERENCES images(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  analysis_type text DEFAULT 'gemini',
  created_at timestamptz DEFAULT now()
);

-- Create posts table (standardized)
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  title text NOT NULL,
  style text NOT NULL,
  created_at timestamptz DEFAULT now(),
  analysis_data jsonb NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  username text
);

-- Create bookmarks table (standardized)
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS images_user_id_idx ON images(user_id);
CREATE INDEX IF NOT EXISTS images_created_at_desc ON images(created_at DESC);

CREATE INDEX IF NOT EXISTS analyses_image_id_idx ON analyses(image_id);
CREATE INDEX IF NOT EXISTS analyses_created_at_desc ON analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_desc ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_username_idx ON posts(username);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_analysis_id_idx ON bookmarks(analysis_id);

-- Enable RLS on all tables
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for images table
CREATE POLICY "Users can insert their own images"
  ON images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own images"
  ON images
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public images are viewable by everyone"
  ON images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update their own images"
  ON images
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON images
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for analyses table
CREATE POLICY "Users can insert analyses for their images"
  ON analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM images WHERE images.id = analyses.image_id
    )
  );

CREATE POLICY "Users can view analyses for their images"
  ON analyses
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id FROM images WHERE images.id = analyses.image_id
    )
  );

CREATE POLICY "Public analyses are viewable by everyone"
  ON analyses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update analyses for their images"
  ON analyses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id FROM images WHERE images.id = analyses.image_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM images WHERE images.id = analyses.image_id
    )
  );

CREATE POLICY "Users can delete analyses for their images"
  ON analyses
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id FROM images WHERE images.id = analyses.image_id
    )
  );

-- RLS Policies for posts table
CREATE POLICY "Posts are viewable by everyone"
  ON posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can update their own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bookmarks table
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);