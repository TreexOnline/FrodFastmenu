ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'kitchen';

CREATE INDEX IF NOT EXISTS idx_inventory_items_user_kind
  ON public.inventory_items (user_id, kind);