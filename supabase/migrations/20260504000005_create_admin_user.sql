-- Script para criar usuário admin no novo Supabase
-- Vamos criar um usuário administrador para gerenciar o sistema

-- ============ CRIAR USUÁRIO ADMIN ============

-- Inserir usuário admin na tabela profiles
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  phone,
  whatsapp_addon_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@frodfast.com',
  'Administrador FrodFast',
  '+5511999999999',
  true,
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;

-- Criar role de admin para o usuário
INSERT INTO public.user_roles (
  id,
  user_id,
  role,
  permissions,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  p.id,
  'admin',
  '{
    "manage_users": true,
    "manage_stores": true,
    "manage_categories": true,
    "manage_menu_items": true,
    "manage_orders": true,
    "manage_inventory": true,
    "manage_whatsapp": true,
    "manage_settings": true,
    "view_reports": true,
    "system_admin": true
  }'::jsonb,
  now(),
  now()
FROM public.profiles p
WHERE p.email = 'admin@frodfast.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id
);

-- Criar loja padrão para o admin
INSERT INTO public.stores (
  id,
  owner_id,
  name,
  description,
  address,
  phone,
  email,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  p.id,
  'FrodFast Demo Store',
  'Loja de demonstração do FrodFast Menu',
  'Rua Demo, 123 - Centro',
  '+5511999999999',
  'admin@frodfast.com',
  now(),
  now()
FROM public.profiles p
WHERE p.email = 'admin@frodfast.com'
AND NOT EXISTS (
  SELECT 1 FROM public.stores s 
  WHERE s.owner_id = p.id
);

-- Criar configuração padrão de WhatsApp para o admin
INSERT INTO public.whatsapp_auto_messages (
  id,
  user_id,
  message_template,
  is_active,
  cooldown_minutes,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  p.id,
  'Olá 👋 Seja bem vindo ao FrodFast Menu!

🍔 Confira nosso cardápio digital:
https://frodfast.app/cardapio

Faça seu pedido diretamente por aqui! 😊

Para falar com nosso atendimento, responda esta mensagem.',
  true,
  5,
  now(),
  now()
FROM public.profiles p
WHERE p.email = 'admin@frodfast.com'
AND NOT EXISTS (
  SELECT 1 FROM public.whatsapp_auto_messages wam 
  WHERE wam.user_id = p.id
);

-- Criar categoria de exemplo
INSERT INTO public.categories (
  id,
  store_id,
  name,
  description,
  color,
  position,
  is_required,
  max_selections,
  selection_type,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  s.id,
  'Lanches',
  'Nossos deliciosos lanches artesanais',
  '#ef4444',
  1,
  false,
  null,
  'single',
  now(),
  now()
FROM public.stores s
JOIN public.profiles p ON p.id = s.owner_id
WHERE p.email = 'admin@frodfast.com'
AND NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.store_id = s.id
  AND c.name = 'Lanches'
);

-- Criar alguns itens de menu de exemplo
INSERT INTO public.menu_items (
  id,
  store_id,
  category_id,
  name,
  description,
  price,
  image_url,
  position,
  is_available,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  s.id,
  c.id,
  'X-Burger Clássico',
  'Pão brioche, hambúrguer 180g, queijo cheddar, alface, tomate, cebola roxa e molho especial',
  25.90,
  null,
  1,
  true,
  now(),
  now()
FROM public.stores s
JOIN public.profiles p ON p.id = s.owner_id
JOIN public.categories c ON c.store_id = s.id AND c.name = 'Lanches'
WHERE p.email = 'admin@frodfast.com'
AND NOT EXISTS (
  SELECT 1 FROM public.menu_items mi 
  WHERE mi.store_id = s.id
  AND mi.name = 'X-Burger Clássico'
);

INSERT INTO public.menu_items (
  id,
  store_id,
  category_id,
  name,
  description,
  price,
  image_url,
  position,
  is_available,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  s.id,
  c.id,
  'X-Bacon',
  'Pão brioche, hambúrguer 180g, queijo cheddar, bacon crocante, alface, tomate e molho especial',
  28.90,
  null,
  2,
  true,
  now(),
  now()
FROM public.stores s
JOIN public.profiles p ON p.id = s.owner_id
JOIN public.categories c ON c.store_id = s.id AND c.name = 'Lanches'
WHERE p.email = 'admin@frodfast.com'
AND NOT EXISTS (
  SELECT 1 FROM public.menu_items mi 
  WHERE mi.store_id = s.id
  AND mi.name = 'X-Bacon'
);

-- Criar configurações de menu para a loja
INSERT INTO public.menu_settings (
  id,
  store_id,
  auto_confirm,
  auto_print,
  allow_edit_orders,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  s.id,
  false,
  false,
  true,
  now(),
  now()
FROM public.stores s
JOIN public.profiles p ON p.id = s.owner_id
WHERE p.email = 'admin@frodfast.com'
AND NOT EXISTS (
  SELECT 1 FROM public.menu_settings ms 
  WHERE ms.store_id = s.id
);

-- ============ VERIFICAÇÃO ============
DO $$
DECLARE
    admin_email text := 'admin@frodfast.com';
    profile_exists boolean;
    role_exists boolean;
    store_exists boolean;
    whatsapp_exists boolean;
    category_exists boolean;
    menu_items_count integer;
BEGIN
    -- Verificar se o perfil foi criado
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = admin_email) INTO profile_exists;
    
    -- Verificar se o role foi criado
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur 
        JOIN public.profiles p ON p.id = ur.user_id 
        WHERE p.email = admin_email
    ) INTO role_exists;
    
    -- Verificar se a loja foi criada
    SELECT EXISTS(
        SELECT 1 FROM public.stores s 
        JOIN public.profiles p ON p.id = s.owner_id 
        WHERE p.email = admin_email
    ) INTO store_exists;
    
    -- Verificar se a configuração WhatsApp foi criada
    SELECT EXISTS(
        SELECT 1 FROM public.whatsapp_auto_messages wam 
        JOIN public.profiles p ON p.id = wam.user_id 
        WHERE p.email = admin_email
    ) INTO whatsapp_exists;
    
    -- Verificar se a categoria foi criada
    SELECT EXISTS(
        SELECT 1 FROM public.categories c 
        JOIN public.stores s ON s.id = c.store_id 
        JOIN public.profiles p ON p.id = s.owner_id 
        WHERE p.email = admin_email AND c.name = 'Lanches'
    ) INTO category_exists;
    
    -- Contar itens de menu
    SELECT COUNT(*) INTO menu_items_count
    FROM public.menu_items mi 
    JOIN public.stores s ON s.id = mi.store_id 
    JOIN public.profiles p ON p.id = s.owner_id 
    WHERE p.email = admin_email;
    
    RAISE NOTICE '=== USUÁRIO ADMIN CRIADO ===';
    RAISE NOTICE '📧 Email: %', admin_email;
    RAISE NOTICE '👤 Perfil criado: %', CASE WHEN profile_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '🔐 Role admin: %', CASE WHEN role_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '🏪 Loja criada: %', CASE WHEN store_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '📱 WhatsApp config: %', CASE WHEN whatsapp_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '🍔 Categoria criada: %', CASE WHEN category_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '📋 Itens de menu: %', menu_items_count;
    RAISE NOTICE '=== FIM ===';
    
    IF profile_exists AND role_exists AND store_exists THEN
        RAISE NOTICE '🎉 USUÁRIO ADMIN CRIADO COM SUCESSO!';
        RAISE NOTICE '  
