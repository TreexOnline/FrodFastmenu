-- Migration para corrigir o fluxo de autenticação
-- Problema: Frontend tentando criar registros antes da confirmação de e-mail
-- Solução: Trigger que dispara APENAS quando usuário confirma e-mail

-- 1. Remover trigger antigo que cria profile incompleto
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Função completa para setup do usuário após confirmação de e-mail
CREATE OR REPLACE FUNCTION public.handle_user_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  restaurant_name TEXT;
  trial_end_date TIMESTAMPTZ;
  menu_id UUID;
BEGIN
  -- Só executar se o usuário foi confirmado (email_confirmed_at não é nulo)
  -- E se não tem profile ainda (evitar duplicação)
  IF NEW.email_confirmed_at IS NOT NULL AND 
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    
    -- Extrair dados do metadata
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nome do Usuário');
    restaurant_name := COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Meu Restaurante');
    
    -- Calcular trial (15 dias a partir de agora)
    trial_end_date := NOW() + INTERVAL '15 days';
    
    -- 1. Criar profile completo
    INSERT INTO public.profiles (
      id,
      full_name,
      restaurant_name,
      current_plan,
      plan_active,
      trial_started_at,
      trial_ends_at,
      whatsapp_addon_active
    ) VALUES (
      NEW.id,
      user_name,
      restaurant_name,
      'trial',
      true,
      NOW(),
      trial_end_date,
      false
    );
    
    -- 2. Criar menu inicial
    INSERT INTO public.menus (
      user_id,
      name,
      slug,
      is_active
    ) VALUES (
      NEW.id,
      restaurant_name,
      lower(regexp_replace(restaurant_name, '[^a-zA-Z0-9\s]', '', 'g')) -- remover caracteres especiais
    ) RETURNING id INTO menu_id;
    
    -- 3. Criar menu_settings para o menu inicial
    INSERT INTO public.menu_settings (
      menu_id,
      user_id,
      display_name,
      primary_color,
      layout_style
    ) VALUES (
      menu_id,
      NEW.id,
      restaurant_name,
      '#6C2BD9',
      'list'
    );
    
    -- 4. Criar role básica do usuário
    INSERT INTO public.user_roles (
      user_id,
      role,
      permissions,
      created_at
    ) VALUES (
      NEW.id,
      'user',
      jsonb_build_object(
        'manage_stores', true,
        'manage_categories', true,
        'manage_products', true,
        'manage_orders', true,
        'view_reports', true
      ),
      NOW()
    );
    
    -- Log para debugging
    RAISE LOG 'Usuário % confirmado e setup completo realizado', NEW.email;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Trigger que dispara quando usuário é atualizado (confirmação de e-mail)
CREATE TRIGGER trigger_user_confirmation
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_confirmation();

-- 4. Política para permitir inserção em user_roles pelo trigger
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own roles" ON public.user_roles;
CREATE POLICY "Users manage own roles" ON public.user_roles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Política para permitir inserção em profiles pelo trigger
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Função para verificar status do trial
CREATE OR REPLACE FUNCTION public.get_trial_status()
RETURNS TABLE(
  user_id UUID,
  is_trial BOOLEAN,
  trial_active BOOLEAN,
  trial_days_remaining INTEGER,
  trial_ends_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    (p.current_plan = 'trial') as is_trial,
    (p.current_plan = 'trial' AND p.plan_active AND p.trial_ends_at > NOW()) as trial_active,
    EXTRACT(DAYS FROM (p.trial_ends_at - NOW()))::INTEGER as trial_days_remaining,
    p.trial_ends_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- 7. Função para expirar trials automaticamente (será chamada por job)
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    plan_active = false,
    current_plan = 'expired'
  WHERE 
    current_plan = 'trial' 
    AND trial_ends_at < NOW()
    AND plan_active = true;
    
  RAISE LOG 'Trials expirados: %', ROW_COUNT;
END;
$$;
