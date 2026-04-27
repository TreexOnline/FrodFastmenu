
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  restaurant_name TEXT NOT NULL,
  whatsapp_number TEXT,
  current_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- MENUS
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cover_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  slug TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 10),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own menus" ON public.menus
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public view active menus" ON public.menus
  FOR SELECT USING (is_active = true);

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  position INTEGER DEFAULT 0 NOT NULL,
  is_available BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products" ON public.products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public view products of active menus" ON public.products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.menus m WHERE m.id = menu_id AND m.is_active = true)
  );

-- MENU SETTINGS (customização)
CREATE TABLE public.menu_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL UNIQUE REFERENCES public.menus(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  display_name TEXT,
  primary_color TEXT DEFAULT '#6C2BD9',
  layout_style TEXT DEFAULT 'list' NOT NULL,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.menu_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own menu_settings" ON public.menu_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public view settings of active menus" ON public.menu_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.menus m WHERE m.id = menu_id AND m.is_active = true)
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_menus_updated BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_menu_settings_updated BEFORE UPDATE ON public.menu_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, restaurant_name, whatsapp_number)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Meu Restaurante'),
    NEW.raw_user_meta_data->>'whatsapp_number'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);

CREATE POLICY "Public read menu-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "Users upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
