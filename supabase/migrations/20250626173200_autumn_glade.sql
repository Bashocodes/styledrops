/*
  # Create profiles trigger function

  1. Functions
    - `handle_new_user()` - Automatically creates a profile when a new user signs up
  
  2. Triggers  
    - Trigger on auth.users table to call handle_new_user function
*/

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(
      lower(replace(new.raw_user_meta_data->>'full_name', ' ', '')),
      split_part(new.email, '@', 1),
      'user_' || substr(new.id::text, 1, 8)
    ),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();