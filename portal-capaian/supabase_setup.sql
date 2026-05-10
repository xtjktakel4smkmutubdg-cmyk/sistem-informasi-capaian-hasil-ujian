-- 1. Create the custom users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nama VARCHAR NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  role VARCHAR DEFAULT 'siswa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- We use pgcrypto to safely insert a user into auth.users natively, bypassing the dashboard requirement!
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user exists to avoid duplicate errors
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@portal.com') THEN
    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      invited_at, confirmation_token, confirmation_sent_at, recovery_token,
      recovery_sent_at, email_change_token_new, email_change, email_change_sent_at,
      last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token,
      phone_change_sent_at, confirmed_at, email_change_token_current, email_change_confirm_status,
      banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user,
      deleted_at, is_anonymous
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 'admin@portal.com',
      crypt('adminpassword123', gen_salt('bf')), now(),
      NULL, '', NULL, '',
      NULL, '', '', NULL,
      NULL, '{"provider":"email","providers":["email"]}', '{}', FALSE,
      now(), now(), NULL, NULL, '', '',
      NULL, now(), '', 0,
      NULL, '', NULL, FALSE,
      NULL, FALSE
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), new_user_id, format('{"sub":"%s","email":"%s"}', new_user_id::text, 'admin@portal.com')::jsonb, 'email', now(), now(), now()
    );

    -- Link it to the public.users table as requested
    INSERT INTO public.users (id, nama, username, role)
    VALUES (new_user_id, 'Administrator', 'admin', 'admin');

    RAISE NOTICE 'Admin user created successfully.';
  ELSE
    RAISE NOTICE 'Admin user already exists.';
  END IF;
END $$;
