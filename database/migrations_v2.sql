-- =============================================
-- Tables Supabase pour Valthera TCG
-- Exécuter ce script dans l'éditeur SQL de Supabase
-- =============================================

-- Table des échanges (trades)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_username TEXT,
  to_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  offered_cards JSONB NOT NULL DEFAULT '[]',
  requested_cards JSONB NOT NULL DEFAULT '[]',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Activer RLS sur trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can create trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
DROP POLICY IF EXISTS "Allow public read trades" ON public.trades;
DROP POLICY IF EXISTS "Allow public insert trades" ON public.trades;
DROP POLICY IF EXISTS "Allow public update trades" ON public.trades;

-- Politiques RLS pour trades
CREATE POLICY "Users can view their own trades" ON public.trades
  FOR SELECT USING (auth.uid()::TEXT = from_user_id::TEXT OR auth.uid()::TEXT = to_user_id::TEXT);

CREATE POLICY "Users can create trades" ON public.trades
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own trades" ON public.trades
  FOR UPDATE USING (auth.uid()::TEXT = from_user_id::TEXT OR auth.uid()::TEXT = to_user_id::TEXT);

-- Politique publique pour les trades (si vous utilisez anon key)
CREATE POLICY "Allow public read trades" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Allow public insert trades" ON public.trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update trades" ON public.trades FOR UPDATE USING (true);


-- Table des notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS sur notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public update notifications" ON public.notifications;

-- Politiques RLS pour notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Politique publique pour les notifications (si vous utilisez anon key)
CREATE POLICY "Allow public read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notifications" ON public.notifications FOR UPDATE USING (true);


-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_trades_from_user ON public.trades(from_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_to_user ON public.trades(to_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);


-- =============================================
-- MISE À JOUR: Mettre à jour le compte admin
-- Remplacez 'alexandre.bailleu@gmail.com' par votre email si différent
-- =============================================
UPDATE public.users 
SET is_admin = TRUE 
WHERE email = 'alexandre.bailleu@gmail.com';

