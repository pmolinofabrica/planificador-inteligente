
-- Add write policies for menu_semana to allow authenticated users to insert/update/delete
CREATE POLICY "authenticated_write_menu_semana" ON public.menu_semana
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "permissive_write_menu_semana" ON public.menu_semana
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
