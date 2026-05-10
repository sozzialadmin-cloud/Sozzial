# Supabase SQL run order

Paste the files in Supabase SQL Editor in this order:

1. `SUPABASE_AUTH_PROFILES_SETUP.sql`
2. `SUPABASE_00_BASE_APP_SCHEMA.sql`
3. `SUPABASE_PROFILE_EXTENSIONS.sql`
4. `SUPABASE_PRODUCT_CORE_SETUP.sql`
5. `SUPABASE_SOCIAL_PLUS_SETUP.sql`

If Supabase says `relation "public.spots" does not exist`, it means step 2 has not been run yet.

If a file was already run successfully, do not delete the project. Continue with the next missing step.
