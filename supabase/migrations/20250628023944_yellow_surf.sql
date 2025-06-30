/*
  # Fix analyses table RLS policy for INSERT operations

  1. Problem
    - Current RLS policy for analyses INSERT is causing "new row violates row-level security policy" error
    - The policy needs to use EXISTS clause to properly check image ownership

  2. Solution
    - Drop the existing INSERT policy for analyses table
    - Create a new policy using EXISTS clause to verify the image belongs to the authenticated user
    - This ensures the policy can properly validate the relationship during INSERT operations

  3. Security
    - Maintains the same security level - users can only insert analyses for images they own
    - Uses proper SQL pattern for checking foreign key relationships in RLS policies
*/

-- Drop the existing RLS policy for analyses insert
DROP POLICY IF EXISTS "Users can insert analyses for their images" ON public.analyses;

-- Recreate the RLS policy using EXISTS clause for proper INSERT validation
CREATE POLICY "Users can insert analyses for their images"
  ON public.analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.images
      WHERE images.id = analyses.image_id AND images.user_id = auth.uid()
    )
  );