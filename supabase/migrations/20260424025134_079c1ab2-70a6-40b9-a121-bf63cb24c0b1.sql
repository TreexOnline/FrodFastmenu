
ALTER TABLE public.addon_library_options
  ADD COLUMN default_quantity integer NOT NULL DEFAULT 1;
