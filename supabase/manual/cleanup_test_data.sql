-- ============================================================
-- Pre-launch cleanup: remove ladder test data
-- ============================================================
-- Safe default:
--   - Keeps admin user profiles/accounts
--   - Deletes all ladder activity and non-admin players
--   - Removes avatar files for deleted users
--
-- Run in Supabase SQL Editor before opening registrations.

BEGIN;

-- 1) Snapshot non-admin user IDs to remove.
CREATE TEMP TABLE _removed_users ON COMMIT DROP AS
SELECT id
FROM public.users
WHERE is_admin = false;

-- 2) Remove activity tables first (in FK-safe order).
DELETE FROM public.matches;
DELETE FROM public.challenges;
DELETE FROM public.invites;
DELETE FROM public.broadcasts;

-- 3) Remove ladder users except admins.
DELETE FROM public.users u
USING _removed_users r
WHERE u.id = r.id;

-- 4) Remove avatar files for deleted users.
DELETE FROM storage.objects so
USING _removed_users r
WHERE so.bucket_id = 'avatars'
  AND split_part(so.name, '/', 1) = r.id::text;

-- 5) Remove auth accounts for deleted users.
DELETE FROM auth.users au
USING _removed_users r
WHERE au.id = r.id;

COMMIT;
