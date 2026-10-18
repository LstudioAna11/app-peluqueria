/*
# Enable pg_cron and pg_net

1. Purpose
Persistent server-side scheduling for automatic appointment emails.

2. Changes
- Installs `pg_cron` (scheduled jobs that run in the database even when the app
  is closed) and `pg_net` (async HTTP so cron can call the email worker).
- Installs them in the `graphql`/`pg_catalog`-adjacent `cron` and `net` schemas
  Supabase provides. No application tables are touched.

3. Security
- Extension installation only; no grants changed.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;