-- 1. Add trial/plan fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS plan_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signup_ip TEXT;

-- Backfill trial dates for existing users based on created_at
UPDATE public.profiles
SET trial_started_at = COALESCE(trial_started_at, created_at),
    trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '15 days')
WHERE trial_started_at IS NULL OR trial_ends_at IS NULL;

-- 2. Signup IP log table
CREATE TABLE IF NOT EXISTS public.signup_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_ips_ip ON public.signup_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_signup_ips_user ON public.signup_ips(user_id);

ALTER TABLE public.signup_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own signup ips" ON public.signup_ips;
CREATE POLICY "Users view own signup ips"
  ON public.signup_ips FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own signup ips" ON public.signup_ips;
CREATE POLICY "Users insert own signup ips"
  ON public.signup_ips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Function: check if IP is blocked (already used by an expired-trial account without paid plan)
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.signup_ips si
    JOIN public.profiles p ON p.id = si.user_id
    WHERE si.ip_address = _ip
      AND p.plan_active = false
      AND COALESCE(p.trial_ends_at, p.created_at + INTERVAL '15 days') < now()
  );
$$;

-- 4. Function: check if a user has active access (trial valid OR paid plan active)
CREATE OR REPLACE FUNCTION public.has_active_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND (
        (p.plan_active = true AND (p.plan_expires_at IS NULL OR p.plan_expires_at > now()))
        OR
        (COALESCE(p.trial_ends_at, p.created_at + INTERVAL '15 days') > now())
      )
  );
$$;

-- 5. Update RLS on menus: only return active menus from accounts with active access
DROP POLICY IF EXISTS "Public view active menus" ON public.menus;
CREATE POLICY "Public view active menus"
  ON public.menus FOR SELECT
  USING (
    is_active = true
    AND public.has_active_access(user_id)
  );

-- 6. Trigger to set trial dates on profile creation
CREATE OR REPLACE FUNCTION public.set_trial_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_started_at IS NULL THEN
    NEW.trial_started_at := now();
  END IF;
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := COALESCE(NEW.trial_started_at, now()) + INTERVAL '15 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_trial_dates ON public.profiles;
CREATE TRIGGER trg_set_trial_dates
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trial_dates();