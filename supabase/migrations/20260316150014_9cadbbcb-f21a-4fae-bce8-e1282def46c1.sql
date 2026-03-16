
-- Add new columns to reusable_modules
ALTER TABLE public.reusable_modules
  ADD COLUMN IF NOT EXISTS config_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allowed_personas text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS icon text DEFAULT 'package';

-- Seed Email Fetcher module
INSERT INTO public.reusable_modules (name, category, description, icon, config_schema, steps, allowed_personas)
VALUES (
  'Email Fetcher',
  'Integration',
  'Fetch emails from Microsoft Graph with filters and download attachments',
  'mail',
  '[
    {"key":"graphEndpoint","label":"Graph API Endpoint","type":"string","required":true,"defaultValue":"https://graph.microsoft.com/v1.0","group":"Connection"},
    {"key":"authMethod","label":"Authentication","type":"select","required":true,"options":["OAuth2","App Registration","Delegated"],"group":"Connection"},
    {"key":"mailFolder","label":"Mail Folder","type":"string","required":false,"defaultValue":"Inbox","group":"Filters"},
    {"key":"subjectFilter","label":"Subject Contains","type":"string","required":false,"group":"Filters"},
    {"key":"senderFilter","label":"From Email","type":"string","required":false,"group":"Filters"},
    {"key":"bodyContains","label":"Body Contains","type":"string","required":false,"group":"Filters"},
    {"key":"downloadAttachments","label":"Download Attachments","type":"boolean","required":false,"defaultValue":"true","group":"Attachments"},
    {"key":"attachmentFilter","label":"Attachment File Types","type":"string","required":false,"hint":"e.g., .pdf,.xlsx","group":"Attachments"}
  ]'::jsonb,
  '[
    {"id":"ef_1","type":"automation","name":"Authenticate with Graph API","description":"Obtain access token"},
    {"id":"ef_2","type":"automation","name":"Fetch Emails","description":"Query mailbox with filters"},
    {"id":"ef_3","type":"decision","name":"Has Attachments?","branches":[{"id":"b1","label":"Yes","condition":"${hasAttachments}"},{"id":"b2","label":"No","condition":"${!hasAttachments}"}]},
    {"id":"ef_4","type":"automation","name":"Download Attachments","description":"Save filtered attachments"}
  ]'::jsonb,
  '{}'::text[]
);
