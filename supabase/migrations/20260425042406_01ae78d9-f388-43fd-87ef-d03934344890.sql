CREATE OR REPLACE FUNCTION public.can_create_public_order_item(_order_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.menus m ON m.id = o.menu_id
    LEFT JOIN public.products p ON p.id = _product_id
    WHERE o.id = _order_id
      AND m.is_active = true
      AND (
        _product_id IS NULL
        OR (p.id IS NOT NULL AND p.menu_id = o.menu_id AND p.is_available = true)
      )
  );
$$;

DROP POLICY IF EXISTS "Public can create order items for active menus" ON public.order_items;

CREATE POLICY "Public can create order items for active menus"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (public.can_create_public_order_item(order_id, product_id));