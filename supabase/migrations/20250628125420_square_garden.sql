/*
  # Add last_username_change_at column to profiles table

  1. Changes
    - Add `last_username_change_at` column to track when username was last changed
    - This enables the "one change per 30 days" restriction
*/

-- Add last_username_change_at column to public.profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_username_change_at timestamp with time zone DEFAULT now();