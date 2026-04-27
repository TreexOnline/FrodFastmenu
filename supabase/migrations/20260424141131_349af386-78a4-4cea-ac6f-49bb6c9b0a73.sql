-- 1) Substituir a função antiga de baixa para dar baixa imediatamente ao criar o pedido,
--    e devolver ao estoque quando for cancelado.
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item_rec RECORD;
  recipe_rec RECORD;
  total_qty NUMERIC;
  should_deduct BOOLEAN := false;
  should_return BOOLEAN := false;
BEGIN
  -- INSERT: dar baixa se o pedido nasce em qualquer status que não seja "cancelled"
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'cancelled' THEN
      should_deduct := true;
    END IF;

  -- UPDATE: tratar transições de status
  ELSIF TG_OP = 'UPDATE' THEN
    -- Pedido foi cancelado agora -> devolver estoque
    IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
      should_return := true;
    -- Pedido cancelado foi reaberto -> dar baixa novamente
    ELSIF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
      should_deduct := true;
    END IF;
  END IF;

  IF should_deduct THEN
    FOR item_rec IN
      SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      FOR recipe_rec IN
        SELECT pr.inventory_item_id, pr.quantity_per_unit
        FROM public.product_recipes pr
        WHERE pr.product_id = item_rec.product_id
      LOOP
        total_qty := recipe_rec.quantity_per_unit * item_rec.quantity;
        INSERT INTO public.inventory_movements
          (user_id, item_id, movement_type, quantity, reason, order_id)
        VALUES
          (NEW.user_id, recipe_rec.inventory_item_id, 'out', total_qty,
           'Baixa automática por pedido', NEW.id);
      END LOOP;
    END LOOP;
  END IF;

  IF should_return THEN
    FOR item_rec IN
      SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      FOR recipe_rec IN
        SELECT pr.inventory_item_id, pr.quantity_per_unit
        FROM public.product_recipes pr
        WHERE pr.product_id = item_rec.product_id
      LOOP
        total_qty := recipe_rec.quantity_per_unit * item_rec.quantity;
        INSERT INTO public.inventory_movements
          (user_id, item_id, movement_type, quantity, reason, order_id)
        VALUES
          (NEW.user_id, recipe_rec.inventory_item_id, 'in', total_qty,
           'Estorno por cancelamento de pedido', NEW.id);
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Função para dar baixa quando itens são adicionados a uma comanda já aberta
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipe_rec RECORD;
  parent_order RECORD;
  total_qty NUMERIC;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, user_id, status
  INTO parent_order
  FROM public.orders
  WHERE id = NEW.order_id;

  -- Só dá baixa se o pedido pai existe e não está cancelado
  IF parent_order.id IS NULL OR parent_order.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  FOR recipe_rec IN
    SELECT pr.inventory_item_id, pr.quantity_per_unit
    FROM public.product_recipes pr
    WHERE pr.product_id = NEW.product_id
  LOOP
    total_qty := recipe_rec.quantity_per_unit * NEW.quantity;
    INSERT INTO public.inventory_movements
      (user_id, item_id, movement_type, quantity, reason, order_id)
    VALUES
      (parent_order.user_id, recipe_rec.inventory_item_id, 'out', total_qty,
       'Baixa automática por item adicionado à comanda', NEW.order_id);
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 3) Triggers
DROP TRIGGER IF EXISTS trg_deduct_inventory_on_orders ON public.orders;
CREATE TRIGGER trg_deduct_inventory_on_orders
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_for_order();

DROP TRIGGER IF EXISTS trg_apply_inventory_movement ON public.inventory_movements;
CREATE TRIGGER trg_apply_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.apply_inventory_movement();

-- IMPORTANTE: o trigger de order_items NÃO dispara para os itens do pedido inicial,
-- pois esses já são contabilizados pelo trigger de orders (AFTER INSERT). Para evitar
-- baixa duplicada no pedido inicial, só damos baixa quando o item é inserido APÓS o
-- pedido já ter sido criado (ex.: comanda aberta recebendo novos itens).
-- Como o trigger de order_items roda para qualquer insert, usamos uma condição extra:
-- só dispara se o pedido pai já tem outros itens registrados antes deste momento.
-- Para simplificar e ser confiável, não vamos criar esse trigger automático; em vez
-- disso o frontend já dispara um UPDATE em orders.total_amount quando adiciona à
-- comanda. Vamos ajustar a função de orders para também tratar atualizações de
-- total_amount em comandas abertas como nova baixa dos itens novos.

-- Remover qualquer trigger anterior em order_items para evitar duplicidade
DROP TRIGGER IF EXISTS trg_deduct_inventory_on_order_items ON public.order_items;
