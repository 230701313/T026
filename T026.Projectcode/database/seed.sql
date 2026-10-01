-- =============================================================================
-- Sample / demo data — AI-Powered Intelligent Lost and Found System
--
-- This seed data is for demonstrating item reporting (Phase 2) and, once
-- image/text embeddings are generated on top of it, AI matching (Phase 3-5).
-- It does NOT insert fake match scores — running the matching pipeline
-- against these rows will produce genuinely computed results once Phase 3-5
-- are implemented.
--
-- USAGE:
--   1. Register at least one real user through the app first (Register page),
--      so auth.users has a row to reference.
--   2. Replace 'YOUR-USER-UUID-HERE' below with that user's id
--      (Supabase dashboard -> Authentication -> Users -> copy the UUID).
--   3. Run this file in the Supabase SQL editor.
--
-- Image URLs are left null; upload real photos through the Report Lost/Found
-- forms (Phase 2) to exercise the image-matching pipeline with real data.
-- =============================================================================

do $$
declare
    demo_user_id uuid := 'YOUR-USER-UUID-HERE';
begin

    -- 5 LOST items
    insert into public.items (user_id, report_type, item_name, category, description, location, date_reported, status)
    values
        (demo_user_id, 'LOST', 'Black Leather Wallet', 'Personal Items',
         'Black leather wallet with brown stitching, contains a college ID card and a few cash notes.',
         'Near the college library', '2026-08-18', 'ACTIVE'),
        (demo_user_id, 'LOST', 'iPhone 13 - Blue', 'Electronics',
         'Blue iPhone 13 with a cracked screen protector and a clear case. Lock screen shows a mountain wallpaper.',
         'Main canteen', '2026-08-19', 'ACTIVE'),
        (demo_user_id, 'LOST', 'Dell Laptop Bag', 'Bags',
         'Grey Dell laptop backpack with a red keychain attached to the zipper.',
         'Computer Science block, room 204', '2026-08-17', 'ACTIVE'),
        (demo_user_id, 'LOST', 'Bunch of Keys', 'Keys',
         'A set of 4 keys on a red carabiner keychain, one is a bike lock key.',
         'Parking lot near Gate 2', '2026-08-20', 'ACTIVE'),
        (demo_user_id, 'LOST', 'Data Structures Textbook', 'Books',
         'Blue hardcover "Data Structures and Algorithms" textbook with handwritten notes in the margins.',
         'Lecture Hall 3', '2026-08-16', 'ACTIVE');

    -- 5 FOUND items
    insert into public.items (user_id, report_type, item_name, category, description, location, date_reported, status)
    values
        (demo_user_id, 'FOUND', 'Black Wallet', 'Personal Items',
         'Found a black leather wallet near the library entrance, has a student ID inside.',
         'College library entrance', '2026-08-19', 'ACTIVE'),
        (demo_user_id, 'FOUND', 'Blue Smartphone', 'Electronics',
         'Found a blue phone with a clear protective case on a canteen table.',
         'Main canteen', '2026-08-19', 'ACTIVE'),
        (demo_user_id, 'FOUND', 'Grey Backpack', 'Bags',
         'Grey laptop backpack found outside room 204, has a keychain on the zip.',
         'Computer Science block', '2026-08-18', 'ACTIVE'),
        (demo_user_id, 'FOUND', 'Keychain with Keys', 'Keys',
         'Set of keys on a red carabiner found near the parking area.',
         'Parking lot near Gate 2', '2026-08-20', 'ACTIVE'),
        (demo_user_id, 'FOUND', 'Umbrella', 'Other',
         'Black folding umbrella left behind in Lecture Hall 1.',
         'Lecture Hall 1', '2026-08-21', 'ACTIVE');

end $$;
