ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_number TEXT,
  ADD COLUMN IF NOT EXISTS is_open_tab BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_open_tab ON public.orders(is_open_tab) WHERE is_open_tab = true;