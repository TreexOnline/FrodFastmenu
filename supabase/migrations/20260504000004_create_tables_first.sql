-- Script para criar as tabelas básicas primeiro
-- Depois criaremos as policies

-- ============ CRIAR TABELAS BÁSICAS ============

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  full_name varchar(255) NULL,
  phone varchar(20) NULL,
  whatsapp_addon_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ STORES ============
CREATE TABLE IF NOT EXISTS public.stores (
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
CREATE TABLE IF NOT EXISTS public.categories (
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
CREATE TABLE IF NOT EXISTS public.menu_items (
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
CREATE TABLE IF NOT EXISTS public.orders (
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
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total_price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ WHATSAPP_SESSIONS ============
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
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
CREATE TABLE IF NOT EXISTS public.whatsapp_auto_messages (
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
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
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
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts_cooldown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number varchar(20) NOT NULL,
  last_auto_reply_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, phone_number)
);

-- ============ MENU_SETTINGS ============
CREATE TABLE IF NOT EXISTS public.menu_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  auto_confirm boolean NOT NULL DEFAULT false,
  auto_print boolean NOT NULL DEFAULT false,
  allow_edit_orders boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ USER_ROLES ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL DEFAULT 'user',
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ADDON_LIBRARY_GROUPS ============
CREATE TABLE IF NOT EXISTS public.addon_library_groups (
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
CREATE TABLE IF NOT EXISTS public.addon_library_options (
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
CREATE TABLE IF NOT EXISTS public.auth_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code varchar(10) NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INVENTORY_ITEMS ============
CREATE TABLE IF NOT EXISTS public.inventory_items (
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
CREATE TABLE IF NOT EXISTS public.inventory_movements (
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

-- ============ FUNÇÃO AUXILIAR ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============ VERIFICAÇÃO ============
DO $$
BEGIN
    RAISE NOTICE '=== TABELAS CRIADAS COM SUCESSO ===';
    
    -- Verificar se as tabelas principais existem
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ profiles criada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ stores criada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_auto_messages' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ whatsapp_auto_messages criada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ categories criada';
    END IF;
    
    RAISE NOTICE '=== TODAS AS TABELAS FORAM CRIADAS ===';
END $$;
