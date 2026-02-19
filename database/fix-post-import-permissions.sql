-- ============================================================================
-- Valthera TCG - Fix permissions/ownership après import Supabase -> PostgreSQL
-- ============================================================================
-- Usage:
--   1) Remplacer 'valthera_user' par l'utilisateur DB de l'API.
--   2) Exécuter ce script avec un rôle superuser / owner (ex: postgres).

DO $$
DECLARE
  app_role text := 'valthera_user';
  row_record record;
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT CREATE ON SCHEMA public TO %I', app_role);

  FOR row_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', row_record.tablename, app_role);
  END LOOP;

  FOR row_record IN
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO %I', row_record.sequencename, app_role);
  END LOOP;

  EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO %I', app_role);
  EXECUTE format('GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO %I', app_role);

  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO %I', app_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO %I', app_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO %I', app_role);
END $$;

-- Optionnel (self-hosted API): désactiver RLS si activé lors de l'import Supabase.
-- Décommenter si nécessaire.
--
-- ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.series DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.cards DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.user_collections DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.trades DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.trade_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
