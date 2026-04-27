ALTER TABLE public.menu_settings
ADD COLUMN IF NOT EXISTS business_hours jsonb NOT NULL DEFAULT '{
  "mon": {"enabled": false, "open": "09:00", "close": "18:00"},
  "tue": {"enabled": false, "open": "09:00", "close": "18:00"},
  "wed": {"enabled": false, "open": "09:00", "close": "18:00"},
  "thu": {"enabled": false, "open": "09:00", "close": "18:00"},
  "fri": {"enabled": false, "open": "09:00", "close": "18:00"},
  "sat": {"enabled": false, "open": "09:00", "close": "18:00"},
  "sun": {"enabled": false, "open": "09:00", "close": "18:00"}
}'::jsonb;