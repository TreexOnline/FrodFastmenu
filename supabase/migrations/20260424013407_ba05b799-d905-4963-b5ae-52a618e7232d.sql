-- Grupos de adicionais por produto
CREATE TABLE public.product_addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single', -- 'single' | 'multiple'
  is_required boolean NOT NULL DEFAULT false,
  max_selections integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_addon_groups_product ON public.product_addon_groups(product_id);

ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addon groups"
  ON public.product_addon_groups
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public view addon groups of active menus"
  ON public.product_addon_groups
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.menus m ON m.id = p.menu_id
    WHERE p.id = product_addon_groups.product_id AND m.is_active = true
  ));

CREATE TRIGGER trg_addon_groups_updated_at
  BEFORE UPDATE ON public.product_addon_groups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Opções dentro de cada grupo
CREATE TABLE public.product_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.product_addon_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_addons_group ON public.product_addons(group_id);

ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addons"
  ON public.product_addons
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public view addons of active menus"
  ON public.product_addons
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.product_addon_groups g
    JOIN public.products p ON p.id = g.product_id
    JOIN public.menus m ON m.id = p.menu_id
    WHERE g.id = product_addons.group_id AND m.is_active = true
  ));

CREATE TRIGGER trg_addons_updated_at
  BEFORE UPDATE ON public.product_addons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Configurações de checkout em menu_settings
ALTER TABLE public.menu_settings
  ADD COLUMN accept_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN accept_pickup boolean NOT NULL DEFAULT true,
  ADD COLUMN accept_dine_in boolean NOT NULL DEFAULT false,
  ADD COLUMN delivery_fee numeric NOT NULL DEFAULT 0;