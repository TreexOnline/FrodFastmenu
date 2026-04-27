-- Permite que qualquer cliente (anônimo ou autenticado) crie pedidos via cardápio público,
-- desde que o menu esteja ativo e o user_id corresponda ao dono do menu.
CREATE POLICY "Public can create orders for active menus"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.menus m
    WHERE m.id = orders.menu_id
      AND m.is_active = true
      AND m.user_id = orders.user_id
  )
);

-- Permite inserir itens de pedido recém-criado em menus ativos.
CREATE POLICY "Public can create order items for active menus"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.menus m ON m.id = o.menu_id
    WHERE o.id = order_items.order_id
      AND m.is_active = true
  )
);