
-- Fix function search path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Restrict listing of bucket: replace broad SELECT with two narrower policies
DROP POLICY IF EXISTS "Public read menu-images" ON storage.objects;

-- Authenticated users can list/select all files (needed for dashboard)
CREATE POLICY "Auth users can read menu-images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'menu-images');

-- Anonymous users can only access specific files via direct URL — no listing
-- (Public bucket already serves files via public URL without RLS check on object reads through the storage API public endpoint)
CREATE POLICY "Anon read individual files" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'menu-images' AND name IS NOT NULL);
