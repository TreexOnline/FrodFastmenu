-- Migração Completa para Novo Supabase
-- Criar todas as tabelas necessárias para o funcionamento do sistema
-- Baseado na estrutura existente do projeto

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  full_name varchar(255) NULL,
  phone varchar(20) NULL,
  whatsapp_addon_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ STORES ============
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text NULL,
  address text NULL,
  phone varchar(20) NULL,
  email varchar(255) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text NULL,
  color varchar(7) DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  max_selections integer NULL,
  selection_type varchar(20) NOT NULL DEFAULT 'single',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ MENU_ITEMS ============
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  image_url text NULL,
  position integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  customer_name varchar(255) NOT NULL,
  customer_phone varchar(20) NULL,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  status varchar(50) NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ORDER_ITEMS ============
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total_price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ WHATSAPP_SESSIONS ============
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_name varchar(50) NOT NULL DEFAULT 'default',
  phone varchar(20) NULL,
  status varchar(20) NOT NULL DEFAULT 'disconnected',
  auth_path varchar(255) NULL,
  qr_code text NULL,
  profile_name varchar(100) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, session_name)
);

-- ============ WHATSAPP_AUTO_MESSAGES ============
CREATE TABLE public.whatsapp_auto_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  cooldown_minutes integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- ============ WHATSAPP_MESSAGE_LOGS ============
CREATE TABLE public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  customer_number varchar(20) NOT NULL,
  customer_name varchar(100) NULL,
  message_received text NULL,
  message_sent text NULL,
  last_sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, customer_number)
);

-- ============ WHATSAPP_CONTACTS_COOLDOWN ============
CREATE TABLE public.whatsapp_contacts_cooldown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number varchar(20) NOT NULL,
  last_auto_reply_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, phone_number)
);

-- ============ MENU_SETTINGS ============
CREATE TABLE public.menu_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  auto_confirm boolean NOT NULL DEFAULT false,
  auto_print boolean NOT NULL DEFAULT false,
  allow_edit_orders boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL DEFAULT 'user',
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ADDON_LIBRARY_GROUPS ============
CREATE TABLE public.addon_library_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  max_selections integer NULL,
  position integer NOT NULL DEFAULT 0,
  selection_type varchar(20) NOT NULL DEFAULT 'single',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ADDON_LIBRARY_OPTIONS ============
CREATE TABLE public.addon_library_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES addon_library_groups(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ AUTH_OTP_CODES ============
CREATE TABLE public.auth_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code varchar(10) NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INVENTORY_ITEMS ============
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text NULL,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  unit varchar(50) NOT NULL DEFAULT 'un',
  cost_price decimal(10,2) NULL,
  sale_price decimal(10,2) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INVENTORY_MOVEMENTS ============
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type varchar(20) NOT NULL, -- 'in', 'out', 'adjust'
  quantity integer NOT NULL,
  unit_cost decimal(10,2) NULL,
  description text NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ HABILITAR RLS ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_auto_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts_cooldown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_library_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_library_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- ============ POLÍTICAS RLS ============
CREATE POLICY "Users manage own profiles"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own stores"
  ON public.stores FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users manage all categories"
  ON public.categories FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage all menu_items"
  ON public.menu_items FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own orders"
  ON public.orders FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own order_items"
  ON public.order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.store_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.store_id = auth.uid()));

CREATE POLICY "Users manage own whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own whatsapp_auto_messages"
  ON public.whatsapp_auto_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own whatsapp_message_logs"
  ON public.whatsapp_message_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own whatsapp_contacts_cooldown"
  ON public.whatsapp_contacts_cooldown FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own menu_settings"
  ON public.menu_settings FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own user_roles"
  ON public.user_roles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own addon_library_groups"
  ON public.addon_library_groups FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own addon_library_options"
  ON public.addon_library_options FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own auth_otp_codes"
  ON public.auth_otp_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own inventory_items"
  ON public.inventory_items FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users manage own inventory_movements"
  ON public.inventory_movements FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

-- ============ ÍNDICES OTIMIZADOS ============
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX idx_categories_store_id ON public.categories(store_id);
CREATE INDEX idx_categories_position ON public.categories(store_id, position);
CREATE INDEX idx_menu_items_store_id ON public.menu_items(store_id);
CREATE INDEX idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX idx_menu_items_position ON public.menu_items(store_id, position);
CREATE INDEX idx_orders_store_id ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX idx_whatsapp_sessions_user_id ON public.whatsapp_sessions(user_id);
CREATE INDEX idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);
CREATE INDEX idx_whatsapp_auto_messages_user_id ON public.whatsapp_auto_messages(user_id);
CREATE INDEX idx_whatsapp_message_logs_user_id ON public.whatsapp_message_logs(user_id);
CREATE INDEX idx_whatsapp_message_logs_customer ON public.whatsapp_message_logs(user_id, customer_number);
CREATE INDEX idx_whatsapp_message_logs_last_sent ON public.whatsapp_message_logs(last_sent_at);
CREATE INDEX idx_whatsapp_contacts_cooldown_user_id ON public.whatsapp_contacts_cooldown(user_id);
CREATE INDEX idx_inventory_items_store_id ON public.inventory_items(store_id);
CREATE INDEX idx_inventory_movements_store_id ON public.inventory_movements(store_id);
CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements(item_id);
CREATE INDEX idx_addon_library_groups_store_id ON public.addon_library_groups(store_id);
CREATE INDEX idx_addon_library_options_group_id ON public.addon_library_options(group_id);

-- ============ TRIGGERS PARA updated_at ============
CREATE TRIGGER tg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_stores_updated
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_categories_updated
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_menu_items_updated
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_whatsapp_sessions_updated
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_whatsapp_auto_messages_updated
  BEFORE UPDATE ON public.whatsapp_auto_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_whatsapp_message_logs_updated
  BEFORE UPDATE ON public.whatsapp_message_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_whatsapp_contacts_cooldown_updated
  BEFORE UPDATE ON public.whatsapp_contacts_cooldown
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_menu_settings_updated
  BEFORE UPDATE ON public.menu_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_user_roles_updated
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_addon_library_groups_updated
  BEFORE UPDATE ON public.addon_library_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_addon_library_options_updated
  BEFORE UPDATE ON public.addon_library_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_inventory_items_updated
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_inventory_movements_updated
  BEFORE UPDATE ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FUNÇÃO AUXILIAR ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
