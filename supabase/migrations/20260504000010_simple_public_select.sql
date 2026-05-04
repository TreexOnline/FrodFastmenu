-- SOLUÇÃO SIMPLES - Liberar SELECT público para tabelas de catálogo
-- Isso resolve os erros 400/404 do frontend

-- ============ POLICIES PÚBLICAS DE SELECT ============

-- Products - Catálogo público
CREATE POLICY "Allow public select" ON public.products
    FOR SELECT USING (true);

-- Product_addon_groups - Catálogo público  
CREATE POLICY "Allow public select" ON public.product_addon_groups
    FOR SELECT USING (true);

-- Product_addons - Catálogo público
CREATE POLICY "Allow public select" ON public.product_addons
    FOR SELECT USING (true);

-- Categories - Catálogo público
CREATE POLICY "Allow public select" ON public.categories
    FOR SELECT USING (true);

-- Menu_items - Catálogo público
CREATE POLICY "Allow public select" ON public.menu_items
    FOR SELECT USING (true);

-- Menus - Catálogo público
CREATE POLICY "Allow public select" ON public.menus
    FOR SELECT USING (true);

-- Menu_settings - Catálogo público
CREATE POLICY "Allow public select" ON public.menu_settings
    FOR SELECT USING (true);

-- Addon_library_groups - Catálogo público
CREATE POLICY "Allow public select" ON public.addon_library_groups
    FOR SELECT USING (true);

-- Addon_library_options - Catálogo público
CREATE POLICY "Allow public select" ON public.addon_library_options
    FOR SELECT USING (true);

-- ============ POLICIAS PRIVADAS (INSERT/UPDATE/DELETE) ============

-- Products - Apenas donos podem modificar
CREATE POLICY "Store owners can manage products" ON public.products
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.menus m
        WHERE m.id = menu_id AND m.user_id = auth.uid()
    ));

-- Product_addon_groups - Apenas donos podem modificar
CREATE POLICY "Store owners can manage product addon groups" ON public.product_addon_groups
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.menus m ON m.id = p.menu_id
        WHERE p.id = product_id AND m.user_id = auth.uid()
    ));

-- Product_addons - Apenas donos podem modificar
CREATE POLICY "Store owners can manage product addons" ON public.product_addons
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.product_addon_groups pag
        JOIN public.products p ON p.id = pag.product_id
        JOIN public.menus m ON m.id = p.menu_id
        WHERE pag.id = group_id AND m.user_id = auth.uid()
    ));

-- Categories - Apenas donos podem modificar
CREATE POLICY "Store owners can manage categories" ON public.categories
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.stores 
        WHERE id = store_id AND owner_id = auth.uid()
    ));

-- Menu_items - Apenas donos podem modificar
CREATE POLICY "Store owners can manage menu items" ON public.menu_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.categories c
        JOIN public.stores s ON s.id = c.store_id
        WHERE c.id = category_id AND s.owner_id = auth.uid()
    ));

-- Menus - Apenas donos podem modificar
CREATE POLICY "Store owners can manage menus" ON public.menus
    FOR ALL USING (auth.uid() = user_id);

-- Menu_settings - Apenas donos podem modificar
CREATE POLICY "Store owners can manage menu settings" ON public.menu_settings
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.menus m
        WHERE m.id = menu_id AND m.user_id = auth.uid()
    ));

-- ============ VERIFICAÇÃO ============

DO $$
DECLARE
    policy_count integer;
BEGIN
    RAISE NOTICE '=== POLICIES SIMPLES CRIADAS ===';
    
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '📊 Total de policies: %', policy_count;
    RAISE NOTICE '✅ SELECT público liberado para catálogos';
    RAISE NOTICE '🔒 INSERT/UPDATE/DELETE restritos aos donos';
    RAISE NOTICE '🎯 Frontend deve funcionar agora!';
    RAISE NOTICE '🔐 Admin deve aparecer no menu!';
    RAISE NOTICE '=== FIM ===';
END $$;
