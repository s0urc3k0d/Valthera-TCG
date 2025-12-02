-- =============================================
-- Valthera TCG - Schéma de base de données Supabase
-- =============================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  avatar TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  last_booster_date DATE,
  favorite_cards TEXT[] DEFAULT '{}',
  is_public_profile BOOLEAN DEFAULT TRUE,
  share_code VARCHAR(10) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche par username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_share_code ON users(share_code);

-- Migration pour ajouter is_banned si la table existe déjà
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- =============================================
-- Table: series (Campagnes)
-- =============================================
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  setting TEXT,
  total_cards INTEGER DEFAULT 0,
  cover_image TEXT,
  release_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: cards
-- =============================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  lore TEXT,
  image_url TEXT,
  card_type VARCHAR(50) NOT NULL CHECK (card_type IN ('Personnage', 'Créature', 'Lieu', 'Objet', 'Événement', 'Boss')),
  rarity VARCHAR(50) NOT NULL CHECK (rarity IN ('Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire')),
  attack INTEGER DEFAULT 0,
  defense INTEGER DEFAULT 0,
  abilities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_cards_series ON cards(series_id);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);

-- =============================================
-- Table: user_collections
-- =============================================
CREATE TABLE IF NOT EXISTS user_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  is_for_trade BOOLEAN DEFAULT FALSE
);

-- Index pour les recherches de collection
CREATE INDEX IF NOT EXISTS idx_collections_user ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_card ON user_collections(card_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_card ON user_collections(user_id, card_id);

-- =============================================
-- Table: trades
-- =============================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index pour les échanges
CREATE INDEX IF NOT EXISTS idx_trades_from_user ON trades(from_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_to_user ON trades(to_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- =============================================
-- Table: trade_items
-- =============================================
CREATE TABLE IF NOT EXISTS trade_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  is_offered BOOLEAN NOT NULL -- true = offered by initiator, false = requested from receiver
);

-- Index pour les items d'échange
CREATE INDEX IF NOT EXISTS idx_trade_items_trade ON trade_items(trade_id);

-- =============================================
-- Table: notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('trade_received', 'trade_accepted', 'trade_rejected', 'new_card', 'rare_card', 'booster_available', 'system')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- =============================================
-- Fonctions et Triggers
-- =============================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour générer un share_code unique
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_user_share_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_share_code();

-- Fonction pour mettre à jour total_cards dans series
CREATE OR REPLACE FUNCTION update_series_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE series SET total_cards = total_cards + 1 WHERE id = NEW.series_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE series SET total_cards = total_cards - 1 WHERE id = OLD.series_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_card_count
  AFTER INSERT OR DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_series_card_count();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies pour la lecture publique (SELECT)
CREATE POLICY "Cards are viewable by everyone" ON cards FOR SELECT USING (true);
CREATE POLICY "Series are viewable by everyone" ON series FOR SELECT USING (true);
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);

-- Policies pour l'écriture publique sur cards et series (admin via API key)
CREATE POLICY "Cards can be created by anyone" ON cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Cards can be updated by anyone" ON cards FOR UPDATE USING (true);
CREATE POLICY "Cards can be deleted by anyone" ON cards FOR DELETE USING (true);

CREATE POLICY "Series can be created by anyone" ON series FOR INSERT WITH CHECK (true);
CREATE POLICY "Series can be updated by anyone" ON series FOR UPDATE USING (true);
CREATE POLICY "Series can be deleted by anyone" ON series FOR DELETE USING (true);

-- Policies pour users (création et modification)
CREATE POLICY "Users can be created by anyone" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can be updated by anyone" ON users FOR UPDATE USING (true);

-- Policies pour les collections
CREATE POLICY "Users can view their own collection" ON user_collections FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert into their own collection" ON user_collections FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own collection" ON user_collections FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Policies pour les échanges
CREATE POLICY "Users can view their own trades" ON trades FOR SELECT USING (auth.uid()::text = from_user_id::text OR auth.uid()::text = to_user_id::text);
CREATE POLICY "Users can create trades" ON trades FOR INSERT WITH CHECK (auth.uid()::text = from_user_id::text);
CREATE POLICY "Users can update trades they're involved in" ON trades FOR UPDATE USING (auth.uid()::text = from_user_id::text OR auth.uid()::text = to_user_id::text);

-- Policies pour les notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id::text);

-- =============================================
-- Données initiales - Campagne exemple
-- =============================================

-- Insérer la campagne "Les Ombres de Kael'Thar"
INSERT INTO series (name, description, setting, is_active) VALUES (
  'Les Ombres de Kael''Thar',
  'Explorez les terres maudites de Kael''Thar, où les ombres prennent vie et d''anciens secrets attendent d''être découverts.',
  'Royaume de Kael''Thar - Terres maudites',
  true
) ON CONFLICT DO NOTHING;

-- Note: Les cartes seront ajoutées via l'interface admin ou via script séparé
