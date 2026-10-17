/*
# Service photo storage bucket

1. Purpose
- Store the client-facing photographs for each service of the catalog in
  Supabase Storage so they persist server-side and survive reloads.

2. New objects
- Storage bucket `service-images` (public read). Objects are managed
  exclusively by the `studio-api` edge function using the service role
  key after verifying an admin token, so no storage policies are needed:
  anon/authenticated roles have no direct access to the bucket.

3. Notes
- The catalog itself keeps only the public URL of each photo inside the
  existing `studio_catalog.category` JSON, so no table change is required.
- Run once; safe to re-run (idempotent insert).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;
