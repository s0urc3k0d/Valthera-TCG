-- PostgreSQL init script for Valthera API (hors Supabase)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  avatar TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  last_booster_date TIMESTAMPTZ,
  available_boosters INTEGER DEFAULT 0,
  favorite_cards TEXT[] DEFAULT '{}',
  cards_for_trade TEXT[] DEFAULT '{}',
  is_public_profile BOOLEAN DEFAULT TRUE,
  share_code VARCHAR(10) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  lore TEXT,
  image_url TEXT,
  card_type VARCHAR(50) NOT NULL,
  rarity VARCHAR(50) NOT NULL,
  attack INTEGER DEFAULT 0,
  defense INTEGER DEFAULT 0,
  abilities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  is_for_trade BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_username TEXT,
  to_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  offered_cards JSONB NOT NULL DEFAULT '[]',
  requested_cards JSONB NOT NULL DEFAULT '[]',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_cards_series ON cards(series_id);
CREATE INDEX IF NOT EXISTS idx_collections_user ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_from_user ON trades(from_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_to_user ON trades(to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
