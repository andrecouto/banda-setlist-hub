-- Primeiro, vamos criar o usuário administrador diretamente na tabela auth.users
-- e depois criar o perfil correspondente

-- Inserir o usuário administrador na tabela auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'administrador',
  crypt('afevempeloouvir', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Criar o perfil do administrador
INSERT INTO public.profiles (
  user_id,
  name,
  email,
  role
) 
SELECT 
  u.id,
  'Administrador',
  'administrador',
  'superuser'::user_role
FROM auth.users u 
WHERE u.email = 'administrador';

-- Atualizar a função handle_new_user para não criar perfil para o admin (já existe)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Não criar perfil para o administrador (já existe)
  IF NEW.email != 'administrador' THEN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
      NEW.email
    );
  END IF;
  RETURN NEW;
END;
$function$;