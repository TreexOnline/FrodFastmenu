-- Orders: novos campos
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS printed_at timestamptz;

-- Validação de order_type
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('delivery','pickup','dine_in','counter'));

-- Index para consultas de agendados
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_for ON public.orders(scheduled_for) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status, created_at DESC);

-- Order items: snapshot da categoria
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS category_name text;

-- Menu settings: configurações novas
ALTER TABLE public.menu_settings
  ADD COLUMN IF NOT EXISTS auto_print boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS print_split_by_category boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accept_scheduled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduling_min_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS scheduling_max_days integer NOT NULL DEFAULT 7;