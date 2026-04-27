
-- Biblioteca de grupos de adicionais (reutilizáveis entre produtos)
CREATE TABLE public.addon_library_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single',
  is_required boolean NOT NULL DEFAULT false,
  max_selections integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.addon_library_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  library_group_id uuid NOT NULL REFERENCES public.addon_library_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_library_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_library_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addon library groups"
ON public.addon_library_groups FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own addon library options"
ON public.addon_library_options FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_addon_library_groups
BEFORE UPDATE ON public.addon_library_groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_addon_library_options
BEFORE UPDATE ON public.addon_library_options
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_addon_library_groups_user ON public.addon_library_groups(user_id);
CREATE INDEX idx_addon_library_options_group ON public.addon_library_options(library_group_id);

-- Vínculo opcional: grupo do produto pode referenciar um grupo da biblioteca
ALTER TABLE public.product_addon_groups
  ADD COLUMN library_group_id uuid REFERENCES public.addon_library_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_product_addon_groups_library ON public.product_addon_groups(library_group_id);

-- Quantidade por opção de adicional no carrinho/checkout
ALTER TABLE public.product_addons
  ADD COLUMN default_quantity integer NOT NULL DEFAULT 1;

-- Snapshot estruturado dos adicionais escolhidos por item de pedido
ALTER TABLE public.order_items
  ADD COLUMN addons jsonb;
