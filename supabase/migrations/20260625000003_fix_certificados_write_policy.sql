-- Add write policy for certificados (was missing, only read existed)
CREATE POLICY "authenticated_write_certificados" ON public.certificados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
