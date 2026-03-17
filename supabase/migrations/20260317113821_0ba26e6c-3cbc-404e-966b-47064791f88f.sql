
UPDATE reusable_modules SET steps = '[{"id":"el_email_reader","name":"Email Reader","type":"automation","description":"Fetches emails and downloads attachments from mailbox","tech":{"topic":"email-reader","implementationType":"external"}}]'::jsonb WHERE id = '66eeb5e6-c898-4b6d-9c82-070cfefc8354';

UPDATE reusable_modules SET steps = '[{"id":"el_data_extractor","name":"Data Extractor","type":"automation","description":"Parses and extracts structured data from files (CSV, XLSX, PDF)","tech":{"topic":"data-extractor","implementationType":"external"}}]'::jsonb WHERE id = '20dcf72b-c678-4649-b423-cd98dcab3886';

UPDATE reusable_modules SET steps = '[{"id":"el_ai_processor","name":"AI Processor","type":"automation","description":"Executes LLM prompt with variable substitution and formats output","tech":{"topic":"ai-processor","implementationType":"external"}}]'::jsonb WHERE id = 'dde44471-6bf6-48ff-bf1b-acaf9a891657';

UPDATE reusable_modules SET steps = '[{"id":"el_send_email","name":"Send Email","type":"automation","description":"Composes and sends email notification via Microsoft Graph","tech":{"topic":"send-email","implementationType":"external"}}]'::jsonb WHERE id = 'c9675089-baa2-4a6a-96c4-a73bc2dcfc3f';

UPDATE reusable_modules SET steps = '[{"id":"el_form_builder","name":"Form Builder","type":"user","description":"Renders a dynamic form for user input","tech":{"topic":"form-render","implementationType":"external"}}]'::jsonb WHERE id = '13917293-2bc6-4f3f-82c2-ec2ca7e0813c';

UPDATE reusable_modules SET steps = '[{"id":"el_approval","name":"Approval / Reviewer","type":"user","description":"Routes to approver for review and decision","tech":{"topic":"approval-review","implementationType":"external"}}]'::jsonb WHERE id = 'f3b0f34d-c878-4993-bcd2-bcd5e0b3f487';
