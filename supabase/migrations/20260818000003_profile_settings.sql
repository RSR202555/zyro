-- Adicionar campos de customização ao perfil do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_status TEXT,
ADD COLUMN IF NOT EXISTS profile_color TEXT DEFAULT 'indigo' NOT NULL;
