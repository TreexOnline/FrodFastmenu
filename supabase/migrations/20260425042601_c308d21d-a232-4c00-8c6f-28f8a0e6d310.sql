CREATE OR REPLACE FUNCTION public.create_public_menu_order(
  _menu_id uuid,
  _user_id uuid,
  _customer_name text,
  _customer_phone text,
  _customer_address text,
  _total_amount numeric,
  _notes text,
  _order_type text,
  _is_scheduled boolean,
  _scheduled_for timestamp with time zone,
  _items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_id uuid;
  item jsonb;
  item_product_id uuid;
  item_product_menu_id uuid;
  item_quantity integer;
  item_unit_price numeric;
  item_subtotal numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.menus m
    WHERE m.id = _menu_id
      AND m.user_id = _user_id
      AND m.is_active = true
      AND public.has_active_access(m.user_id)
  ) THEN
    RAISE EXCEPTION 'Este cardápio não está disponível para receber pedidos agora.';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Seu carrinho está vazio. Adicione pelo menos um item para continuar.';
  END IF;

  INSERT INTO public.orders (
    menu_id,
    user_id,
    customer_name,
    customer_phone,
    customer_address,
    total_amount,
    status,
    source,
    notes,
    order_type,
    is_manual,
    is_open_tab,
    is_scheduled,
    scheduled_for
  ) VALUES (
    _menu_id,
    _user_id,
    trim(_customer_name),
    nullif(trim(coalesce(_customer_phone, '')), ''),
    _customer_address,
    coalesce(_total_amount, 0),
    'new',
    'menu',
    _notes,
    coalesce(_order_type, 'delivery'),
    false,
    false,
    coalesce(_is_scheduled, false),
    _scheduled_for
  )
  RETURNING id INTO new_order_id;

  FOR item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    item_product_id := NULLIF(item->>'product_id', '')::uuid;

    IF item_product_id IS NOT NULL THEN
      SELECT p.menu_id
      INTO item_product_menu_id
      FROM public.products p
      WHERE p.id = item_product_id
        AND p.is_available = true;

      IF item_product_menu_id IS NULL OR item_product_menu_id <> _menu_id THEN
        RAISE EXCEPTION 'Um item do carrinho não está mais disponível. Atualize o cardápio e tente novamente.';
      END IF;
    END IF;

    item_quantity := GREATEST(1, COALESCE((item->>'quantity')::integer, 1));
    item_unit_price := GREATEST(0, COALESCE((item->>'unit_price')::numeric, 0));
    item_subtotal := GREATEST(0, COALESCE((item->>'subtotal')::numeric, 0));

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      subtotal,
      notes,
      addons,
      category_name
    ) VALUES (
      new_order_id,
      item_product_id,
      COALESCE(NULLIF(item->>'product_name', ''), 'Item do pedido'),
      item_quantity,
      item_unit_price,
      item_subtotal,
      NULLIF(item->>'notes', ''),
      COALESCE(item->'addons', '[]'::jsonb),
      NULLIF(item->>'category_name', '')
    );
  END LOOP;

  RETURN new_order_id;
END;
$$;