-- Create storage bucket for workflow attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('workflow-attachments', 'workflow-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload files (no auth required for now)
CREATE POLICY "Anyone can upload workflow attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'workflow-attachments');

-- Allow anyone to read workflow attachments
CREATE POLICY "Anyone can read workflow attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'workflow-attachments');

-- Allow anyone to delete their uploaded workflow attachments
CREATE POLICY "Anyone can delete workflow attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'workflow-attachments');