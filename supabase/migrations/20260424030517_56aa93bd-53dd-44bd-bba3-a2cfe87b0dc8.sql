-- Permitir leitura pública dos grupos da biblioteca quando estão vinculados a produtos de menus ativos
CREATE POLICY "Public view library groups linked to active menus"
ON public.addon_library_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.product_addon_groups pag
    JOIN public.products p ON p.id = pag.product_id
    JOIN public.menus m ON m.id = p.menu_id
    WHERE pag.library_group_id = addon_library_groups.id
      AND m.is_active = true
  )
);

-- Permitir leitura pública das opções da biblioteca quando o grupo está vinculado a produtos de menus ativos
CREATE POLICY "Public view library options linked to active menus"
ON public.addon_library_options
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.product_addon_groups pag
    JOIN public.products p ON p.id = pag.product_id
    JOIN public.menus m ON m.id = p.menu_id
    WHERE pag.library_group_id = addon_library_options.library_group_id
      AND m.is_active = true
  )
);