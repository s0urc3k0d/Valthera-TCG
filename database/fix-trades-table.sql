-- Migration pour ajouter les colonnes manquantes à la table trades
-- À exécuter dans Supabase SQL Editor

-- Ajouter les colonnes pour stocker les cartes directement dans trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS from_username VARCHAR(50);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS to_username VARCHAR(50);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS offered_cards JSONB DEFAULT '[]';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS requested_cards JSONB DEFAULT '[]';

-- Mettre à jour les policies RLS pour permettre les opérations via API
DROP POLICY IF EXISTS "Users can view their own trades" ON trades;
DROP POLICY IF EXISTS "Users can create trades" ON trades;
DROP POLICY IF EXISTS "Users can update trades they're involved in" ON trades;

CREATE POLICY "Trades are viewable by everyone" ON trades FOR SELECT USING (true);
CREATE POLICY "Trades can be created by anyone" ON trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Trades can be updated by anyone" ON trades FOR UPDATE USING (true);
CREATE POLICY "Trades can be deleted by anyone" ON trades FOR DELETE USING (true);

-- Vérification
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trades';
