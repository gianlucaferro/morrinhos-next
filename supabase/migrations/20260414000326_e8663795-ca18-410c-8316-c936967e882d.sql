-- Allow authenticated users to insert, update, and delete anuncios (admin panel)
CREATE POLICY "Authenticated users can insert anuncios"
ON public.anuncios
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update anuncios"
ON public.anuncios
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete anuncios"
ON public.anuncios
FOR DELETE
TO authenticated
USING (true);