-- Note: Supabase auth accounts cannot be created directly via SQL for security reasons (passwords must be hashed).
-- You must sign up the admin user via your app or the Supabase dashboard first:
-- Email: admin@portal.com
-- Password: adminpassword123

-- 1. Create the custom users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nama VARCHAR NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  role VARCHAR DEFAULT 'siswa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. After you sign up the user via the app/dashboard, you must link it.
-- Retrieve the ID of the user you just created:
-- SELECT id FROM auth.users WHERE email = 'admin@portal.com';

-- Replace 'YOUR_AUTH_USER_ID' with the actual UUID from auth.users
-- INSERT INTO public.users (id, nama, username, role)
-- VALUES ('YOUR_AUTH_USER_ID', 'Administrator', 'admin', 'admin');
