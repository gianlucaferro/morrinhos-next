-- Create temp-uploads bucket for file processing
INSERT INTO storage.buckets (id, name, public) VALUES ('temp-uploads', 'temp-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Temp uploads are publicly readable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'temp-uploads');

-- Allow service role to insert
CREATE POLICY "Service role can upload to temp" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'temp-uploads');
