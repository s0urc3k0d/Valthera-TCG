// Configuration Supabase
// À configurer avec vos propres credentials

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

// Bucket pour les images
export const STORAGE_BUCKETS = {
  CARD_IMAGES: 'card-images',
  AVATARS: 'avatars',
  SERIES_COVERS: 'series-covers',
};

// Tables
export const TABLES = {
  USERS: 'users',
  CARDS: 'cards',
  SERIES: 'series',
  COLLECTIONS: 'user_collections',
  TRADES: 'trades',
  TRADE_ITEMS: 'trade_items',
  NOTIFICATIONS: 'notifications',
};
