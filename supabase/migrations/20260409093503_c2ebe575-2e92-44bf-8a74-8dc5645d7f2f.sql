CREATE OR REPLACE FUNCTION public.increment_anuncio_impressao(anuncio_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE anuncios SET impressoes = impressoes + 1 WHERE id = anuncio_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_anuncio_clique(anuncio_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE anuncios SET cliques = cliques + 1 WHERE id = anuncio_id;
$$;