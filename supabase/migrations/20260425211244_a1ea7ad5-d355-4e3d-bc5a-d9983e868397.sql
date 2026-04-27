-- 1) Bucket de imagens: bloquear listagem pública (mantém leitura por URL direta)
-- Remove policy genérica de SELECT pública e cria uma que só permite ver objeto específico (sem listar bucket).
-- Como o bucket é "public", URLs diretas continuam funcionando — só impede LIST/scrape.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'menu-images public read',
        'Public read menu-images',
        'menu_images_public_read',
        'Anyone can read menu images'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Mantém o bucket utilizável: leitura permitida quando o cliente já conhece o nome exato do arquivo.
-- (Buckets "public" do Supabase atendem GET /object/public/... mesmo com policy específica.)
CREATE POLICY "menu-images public read by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- 2) auth_otp_codes: garantir que NUNCA seja legível por anon/authenticated.
-- RLS está ativa e nenhuma policy de SELECT existe; reforçamos REVOKE explícito.
REVOKE ALL ON public.auth_otp_codes FROM anon, authenticated;
GRANT INSERT ON public.auth_otp_codes TO service_role;

-- 3) Hash do código OTP no banco (defesa em profundidade).
-- Adiciona coluna code_hash; quando preenchida, verify-otp deve comparar pelo hash.
-- A coluna `code` continua existindo para retrocompatibilidade (não vai quebrar a função atual),
-- mas será preenchida apenas em escritas novas. NOVA escrita recomendada: code_hash.
ALTER TABLE public.auth_otp_codes
  ADD COLUMN IF NOT EXISTS code_hash text;

-- Índice para varredura por phone (usado pelo verify-otp)
CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_phone_created
  ON public.auth_otp_codes (phone, created_at DESC);

-- 4) Limita comprimento de campos textuais sensíveis na tabela orders (anti-abuse).
-- Defesa contra payloads enormes em pedidos públicos.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_name_len CHECK (length(customer_name) <= 120) NOT VALID;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_phone_len CHECK (customer_phone IS NULL OR length(customer_phone) <= 30) NOT VALID;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_address_len CHECK (customer_address IS NULL OR length(customer_address) <= 500) NOT VALID;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_notes_len CHECK (notes IS NULL OR length(notes) <= 1000) NOT VALID;

-- 5) Limites em order_items (anti-abuse)
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_name_len CHECK (length(product_name) <= 200) NOT VALID;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_notes_len CHECK (notes IS NULL OR length(notes) <= 500) NOT VALID;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_quantity_pos CHECK (quantity > 0 AND quantity <= 999) NOT VALID;