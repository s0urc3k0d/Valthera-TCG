export enum Rarity {
  COMMON = 'Commune',
  UNCOMMON = 'Peu commune',
  RARE = 'Rare',
  EPIC = 'Épique',
  LEGENDARY = 'Légendaire',
}

export enum CardType {
  CHARACTER = 'Personnage',
  CREATURE = 'Créature',
  LOCATION = 'Lieu',
  ITEM = 'Objet',
  EVENT = 'Événement',
  BOSS = 'Boss',
}

export enum TradeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  TRADE_RECEIVED = 'trade_received',
  TRADE_ACCEPTED = 'trade_accepted',
  TRADE_REJECTED = 'trade_rejected',
  NEW_CARD = 'new_card',
  RARE_CARD = 'rare_card',
  BOOSTER_AVAILABLE = 'booster_available',
  SYSTEM = 'system',
}

export interface Card {
  id: string;
  seriesId: string;
  name: string;
  title?: string;
  description: string;
  lore?: string;
  imageUrl: string;
  cardType: CardType;
  rarity: Rarity;
  attack: number;
  defense: number;
  abilities?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Series {
  id: string;
  name: string;
  description: string;
  setting: string;
  totalCards: number;
  coverImage: string;
  releaseDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  isAdmin: boolean;
  isBanned?: boolean;
  lastBoosterDate: string | null;
  availableBoosters?: number; // Nombre de boosters disponibles (max 2)
  collection: string[];
  favoriteCards?: string[];
  cardsForTrade?: string[];
  createdAt: string;
  updatedAt?: string;
  // Stats
  totalCards?: number;
  uniqueCards?: number;
  // Settings
  isPublicProfile?: boolean;
  shareCode?: string;
}

export interface UserCollection {
  id: string;
  oderId: string;
  cardId: string;
  quantity: number;
  obtainedAt: string;
  isFavorite: boolean;
  isForTrade: boolean;
}

export interface Trade {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUsername?: string;
  toUsername?: string;
  status: TradeStatus;
  offeredCards: TradeItem[];
  requestedCards: TradeItem[];
  message?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface TradeItem {
  cardId: string;
  quantity: number;
  card?: Card;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface BoosterConfig {
  cardCount: number;
  guaranteedRarity?: Rarity;
  seriesId?: string;
}

// Filtres et recherche
export interface CardFilters {
  search?: string;
  seriesId?: string;
  cardType?: CardType | 'ALL';
  rarity?: Rarity | 'ALL';
  minAttack?: number;
  maxAttack?: number;
  minDefense?: number;
  maxDefense?: number;
  onlyOwned?: boolean;
  onlyMissing?: boolean;
  onlyFavorites?: boolean;
  onlyForTrade?: boolean;
}

export interface SortOption {
  field: 'name' | 'rarity' | 'attack' | 'defense' | 'cardType' | 'createdAt';
  direction: 'asc' | 'desc';
}

// Statistiques
export interface CollectionStats {
  totalCards: number;
  uniqueCards: number;
  totalPossible: number;
  completionPercentage: number;
  byRarity: Record<Rarity, { owned: number; total: number }>;
  byType: Record<CardType, { owned: number; total: number }>;
  bySeries: Record<string, { owned: number; total: number; name: string }>;
  rarestCards: Card[];
  recentCards: Card[];
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCards: number;
  totalSeries: number;
  totalTrades: number;
  completedTrades: number;
  mostCollectedCards: { card: Card; count: number }[];
  popularSeries: { series: Series; collectors: number }[];
  dailyActivity: { date: string; newUsers: number; boostersOpened: number }[];
}