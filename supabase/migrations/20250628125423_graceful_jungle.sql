/*
  # Update handle_new_user function with username generation logic

  1. Functions
    - `get_prefixes()` - Returns array of 40 short prefix words
    - `get_suffixes()` - Returns array of 40 short suffix words
    - Updated `handle_new_user()` - Generates unique usernames automatically

  2. Username Generation Logic
    - Pick random prefix + suffix (TitleCase + lowercase)
    - Check for duplicates in profiles.username
    - If taken, append single digit 0-9
    - If still taken, try new prefix-suffix combo
    - Max 100 attempts before fallback
    - All usernames ≤ 8 characters
*/

-- Define prefixes function for reusability
CREATE OR REPLACE FUNCTION get_prefixes() RETURNS text[] LANGUAGE plpgsql AS $$ 
BEGIN 
  RETURN ARRAY[
    'Lumi', 'Zeno', 'Vibe', 'Mira', 'Nova', 'Riko', 'Neko', 'Kaia', 'Orba', 'Flux',
    'Pixa', 'Kiro', 'Aero', 'Aria', 'Sora', 'Yumi', 'Lyra', 'Echo', 'Juno', 'Luno',
    'Elio', 'Onda', 'Vega', 'Isla', 'Kira', 'Mino', 'Toki', 'Wavi', 'Holo', 'Cyan',
    'Aiko', 'Lira', 'Alta', 'Nira', 'Fira', 'Nami', 'Zenx', 'Quix', 'Soli', 'Axio'
  ]; 
END; 
$$;

-- Define suffixes function for reusability
CREATE OR REPLACE FUNCTION get_suffixes() RETURNS text[] LANGUAGE plpgsql AS $$ 
BEGIN 
  RETURN ARRAY[
    'glow', 'wave', 'flux', 'byte', 'pix', 'loop', 'beam', 'drop', 'dust', 'nova',
    'echo', 'zing', 'spar', 'core', 'drif', 'puls', 'sync', 'node', 'dash', 'snap',
    'ping', 'grit', 'shot', 'warp', 'fizz', 'cub', 'flik', 'haze', 'mist', 'burn',
    'rise', 'froz', 'zoom', 'soar', 'tide', 'vibe', 'flow', 'edge', 'wing', 'star'
  ]; 
END; 
$$;

-- Update the handle_new_user function with username generation logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _generated_username text;
  _prefix text;
  _suffix text;
  _prefixes text[] := get_prefixes();
  _suffixes text[] := get_suffixes();
  _attempt_count int := 0;
  _max_attempts int := 100; -- Max attempts to find a unique username
  _digit text;
  _base_username text;
BEGIN
  LOOP
    _attempt_count := _attempt_count + 1;
    IF _attempt_count > _max_attempts THEN
      -- Fallback if too many attempts fail, use a generic username
      _generated_username := 'user_' || substr(new.id::text, 1, 8);
      EXIT;
    END IF;

    -- Pick random prefix and suffix
    _prefix := _prefixes[floor(random() * array_length(_prefixes, 1)) + 1];
    _suffix := _suffixes[floor(random() * array_length(_suffixes, 1)) + 1];

    -- Concatenate (prefixes are TitleCase and suffixes are lowercase)
    _base_username := _prefix || _suffix;

    -- Check length constraint for base username (prefix+suffix <= 7)
    IF length(_base_username) > 7 THEN
      CONTINUE; -- If base combo is too long, skip this combo and try again
    END IF;

    -- Check for duplicates for the base username
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = _base_username) THEN
      _generated_username := _base_username;
      EXIT; -- Found a unique username
    END IF;

    -- If taken, append a single random digit 0-9 and re-check
    _digit := floor(random() * 10)::text;
    _generated_username := _base_username || _digit;

    -- Check length again after adding digit (total <= 8 chars)
    IF length(_generated_username) > 8 THEN
      CONTINUE; -- If with digit it's too long, try a new base combo
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = _generated_username) THEN
      EXIT; -- Found a unique username with digit
    END IF;

    -- If still taken, loop again for a new prefix-suffix combo
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