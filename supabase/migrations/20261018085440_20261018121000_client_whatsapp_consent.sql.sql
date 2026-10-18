/*
# Client WhatsApp consent

1. Modified Tables
- `studio_clients`: add `whatsapp_consent boolean NOT NULL DEFAULT false`.
  Records whether the client authorised L'Studio Ana to send appointment
  notices to her phone via WhatsApp. The WhatsApp worker only sends to
  clients (or portal bookings) whose snapshot phone is present and whose
  client record (when linked) has consent.
2. Security
- Column is readable/writable only through the service role and the edge
  functions; RLS on the table is unchanged.
*/

ALTER TABLE studio_clients ADD COLUMN IF NOT EXISTS whatsapp_consent boolean NOT NULL DEFAULT false;
