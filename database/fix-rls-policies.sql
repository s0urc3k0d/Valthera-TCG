-- =============================================
-- Fix RLS Policies for Valthera TCG
-- Exécuter ce script dans Supabase SQL Editor
-- =============================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Cards are viewable by everyone" ON cards;
DROP POLICY IF EXISTS "Series are viewable by everyone" ON series;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can view their own collection" ON user_collections;
DROP POLICY IF EXISTS "Users can insert into their own collection" ON user_collections;
DROP POLICY IF EXISTS "Users can update their own collection" ON user_collections;
DROP POLICY IF EXISTS "Users can view their own trades" ON trades;
DROP POLICY IF EXISTS "Users can create trades" ON trades;
DROP POLICY IF EXISTS "Users can update trades they're involved in" ON trades;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Cards: lecture et écriture publique
CREATE POLICY "Cards are viewable by everyone" ON cards FOR SELECT USING (true);
CREATE POLICY "Cards can be created by anyone" ON cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Cards can be updated by anyone" ON cards FOR UPDATE USING (true);
CREATE POLICY "Cards can be deleted by anyone" ON cards FOR DELETE USING (true);

-- Series: lecture et écriture publique
CREATE POLICY "Series are viewable by everyone" ON series FOR SELECT USING (true);
CREATE POLICY "Series can be created by anyone" ON series FOR INSERT WITH CHECK (true);
CREATE POLICY "Series can be updated by anyone" ON series FOR UPDATE USING (true);
CREATE POLICY "Series can be deleted by anyone" ON series FOR DELETE USING (true);

-- Users: lecture et écriture publique
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can be created by anyone" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can be updated by anyone" ON users FOR UPDATE USING (true);

-- User collections: lecture et écriture publique
CREATE POLICY "Collections are viewable by everyone" ON user_collections FOR SELECT USING (true);
CREATE POLICY "Collections can be created by anyone" ON user_collections FOR INSERT WITH CHECK (true);
CREATE POLICY "Collections can be updated by anyone" ON user_collections FOR UPDATE USING (true);
CREATE POLICY "Collections can be deleted by anyone" ON user_collections FOR DELETE USING (true);

-- Trades: lecture et écriture publique
CREATE POLICY "Trades are viewable by everyone" ON trades FOR SELECT USING (true);
CREATE POLICY "Trades can be created by anyone" ON trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Trades can be updated by anyone" ON trades FOR UPDATE USING (true);

-- Trade items: lecture et écriture publique
CREATE POLICY "Trade items are viewable by everyone" ON trade_items FOR SELECT USING (true);
CREATE POLICY "Trade items can be created by anyone" ON trade_items FOR INSERT WITH CHECK (true);

-- Notifications: lecture et écriture publique
CREATE POLICY "Notifications are viewable by everyone" ON notifications FOR SELECT USING (true);
CREATE POLICY "Notifications can be created by anyone" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Notifications can be updated by anyone" ON notifications FOR UPDATE USING (true);

-- Vérification: lister les tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Vérification: compter les données
SELECT 'series' as table_name, COUNT(*) as count FROM series
UNION ALL
SELECT 'cards' as table_name, COUNT(*) as count FROM cards
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users;
