-- 1. Tabela de itens de estoque
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  min_quantity NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC,
  block_sale_when_empty BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_qty_nonneg CHECK (current_quantity >= 0),
  CONSTRAINT inventory_items_min_nonneg CHECK (min_quantity >= 0)
);

CREATE INDEX idx_inventory_items_user ON public.inventory_items(user_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inventory items"
ON public.inventory_items FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER inventory_items_set_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Tabela de movimentações de estoque
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'in' ou 'out'
  quantity NUMERIC NOT NULL,
  reason TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_qty_positive CHECK (quantity > 0),
  CONSTRAINT inventory_movements_type_valid CHECK (movement_type IN ('in', 'out'))
);

CREATE INDEX idx_inventory_movements_user ON public.inventory_movements(user_id);
CREATE INDEX idx_inventory_movements_item ON public.inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_order ON public.inventory_movements(order_id);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inventory movements"
ON public.inventory_movements FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Tabela de receitas (relação produto -> insumos)
CREATE TABLE public.product_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_per_unit NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_recipes_qty_positive CHECK (quantity_per_unit > 0),
  CONSTRAINT product_recipes_unique UNIQUE (product_id, inventory_item_id)
);

CREATE INDEX idx_product_recipes_user ON public.product_recipes(user_id);
CREATE INDEX idx_product_recipes_product ON public.product_recipes(product_id);
CREATE INDEX idx_product_recipes_item ON public.product_recipes(inventory_item_id);

ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own product recipes"
ON public.product_recipes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER product_recipes_set_updated_at
BEFORE UPDATE ON public.product_recipes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Função para aplicar movimentação atualizando o estoque
CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty NUMERIC;
  new_qty NUMERIC;
BEGIN
  SELECT current_quantity INTO current_qty
  FROM public.inventory_items
  WHERE id = NEW.item_id;

  IF current_qty IS NULL THEN
    RAISE EXCEPTION 'Item de estoque não encontrado';
  END IF;

  IF NEW.movement_type = 'in' THEN
    new_qty := current_qty + NEW.quantity;
  ELSE
    new_qty := current_qty - NEW.quantity;
    IF new_qty < 0 THEN
      new_qty := 0; -- nunca negativo
    END IF;
  END IF;

  UPDATE public.inventory_items
  SET current_quantity = new_qty
  WHERE id = NEW.item_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

-- 5. Função para dar baixa automática quando pedido é confirmado
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_rec RECORD;
  recipe_rec RECORD;
  total_deduct NUMERIC;
BEGIN
  -- Só dá baixa quando muda para 'confirmed' ou 'preparing' a partir de 'new'
  IF (TG_OP = 'INSERT' AND NEW.status IN ('confirmed', 'preparing'))
     OR (TG_OP = 'UPDATE' AND OLD.status = 'new' AND NEW.status IN ('confirmed', 'preparing'))
  THEN
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
        total_deduct := recipe_rec.quantity_per_unit * item_rec.quantity;
        INSERT INTO public.inventory_movements
          (user_id, item_id, movement_type, quantity, reason, order_id)
        VALUES
          (NEW.user_id, recipe_rec.inventory_item_id, 'out', total_deduct,
           'Baixa automática por pedido', NEW.id);
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_inventory_on_order
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.deduct_inventory_for_order();