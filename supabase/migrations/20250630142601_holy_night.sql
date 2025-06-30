/*
  # Simplify Username Generation Logic

  1. Changes
    - Drop the complex get_prefixes() and get_suffixes() functions
    - Update handle_new_user() function with simplified username generation
    - Generate usernames from Google info (full_name or email) with random numbers

  2. Username Generation Logic
    - Extract base username from full_name or email prefix
    - Sanitize to remove special characters
    - Limit to 15 characters for base
    - Append random numbers if username is taken
    - Fallback to generic username with UUID if all attempts fail

  3. Security
    - Maintains existing RLS policies
    - Preserves last_username_change_at tracking for 30-day restriction
*/

-- Drop the old functions if they exist (they are no longer needed)
DROP FUNCTION IF EXISTS public.get_prefixes();
DROP FUNCTION IF EXISTS public.get_suffixes();

-- Update the handle_new_user function with simplified username generation logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _generated_username text;
  _base_username text;
  _attempt_count int := 0;
  _max_attempts int := 10; -- Fewer attempts for simpler fallback
BEGIN
  -- Try to generate a base username from full_name or email
  _base_username := COALESCE(
    lower(regexp_replace(new.raw_user_meta_data->>'full_name', '[^a-zA-Z0-9]', '', 'g')), -- Sanitize full_name
    split_part(new.email, '@', 1),
    'user'
  );

  -- Ensure base username is not empty
  IF _base_username = '' THEN
    _base_username := 'user';
  END IF;

  -- Trim and limit length for base username
  _base_username := left(_base_username, 15); -- Limit to 15 chars for base

  LOOP
    _attempt_count := _attempt_count + 1;
    IF _attempt_count > _max_attempts THEN
      -- Fallback to a generic username with part of UUID if too many attempts fail
      _generated_username := 'user_' || substr(new.id::text, 1, 8);
      EXIT;
    END IF;

    IF _attempt_count = 1 THEN
      _generated_username := _base_username;
    ELSE
      -- Append a random number for subsequent attempts
      _generated_username := _base_username || floor(random() * 10000)::text;
    END IF;

    -- Check if the generated username is unique
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = _generated_username) THEN
      EXIT; -- Found a unique username
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url, created_at, updated_at, last_username_change_at)
  VALUES (
    new.id,
    _generated_username,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now(),
    now() -- Set last_username_change_at on initial creation
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;