import { Card, Series, User, Trade, Notification, TradeStatus, Rarity, CardType, TradeItem, NotificationType } from '../types';

const rawBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '');
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const ACCESS_TOKEN_KEY = 'valthera_auth0_access_token';

const apiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  const response = await fetch(apiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

class ApiService {
  async getCards(): Promise<Card[]> {
    try {
      return await request<Card[]>('/cards');
    } catch (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
  }

  async getCardById(id: string): Promise<Card | null> {
    try {
      return await request<Card>(`/cards/${id}`);
    } catch (error) {
      console.error('Error fetching card:', error);
      return null;
    }
  }

  async getCardsBySeries(seriesId: string): Promise<Card[]> {
    try {
      return await request<Card[]>(`/cards?seriesId=${encodeURIComponent(seriesId)}`);
    } catch (error) {
      console.error('Error fetching cards by series:', error);
      return [];
    }
  }

  async createCard(card: Card): Promise<Card | null> {
    try {
      return await request<Card>('/cards', {
        method: 'POST',
        body: JSON.stringify(card),
      });
    } catch (error) {
      console.error('Error creating card:', error);
      return null;
    }
  }

  async updateCard(id: string, updates: Partial<Card>): Promise<Card | null> {
    try {
      return await request<Card>(`/cards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating card:', error);
      return null;
    }
  }

  async deleteCard(id: string): Promise<boolean> {
    try {
      await request<{ success: boolean }>(`/cards/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Error deleting card:', error);
      return false;
    }
  }

  async getBooster(count: number = 5, seriesId?: string): Promise<Card[]> {
    try {
      let cards = await this.getCards();
      if (seriesId) {
        cards = cards.filter((c) => c.seriesId === seriesId);
      }
      if (cards.length === 0) return [];

      const weights: Record<string, number> = {
        [Rarity.COMMON]: 50,
        [Rarity.UNCOMMON]: 30,
        [Rarity.RARE]: 15,
        [Rarity.EPIC]: 4,
        [Rarity.LEGENDARY]: 1,
      };

      const weightedCards: Card[] = [];
      cards.forEach((card) => {
        const weight = weights[card.rarity] || 10;
        for (let i = 0; i < weight; i++) weightedCards.push(card);
      });

      const booster: Card[] = [];
      for (let i = 0; i < count; i++) {
        const random = weightedCards[Math.floor(Math.random() * weightedCards.length)];
        booster.push(random);
      }

      return booster;
    } catch (error) {
      console.error('Error generating booster:', error);
      return [];
    }
  }

  async getSeries(): Promise<Series[]> {
    try {
      return await request<Series[]>('/series');
    } catch (error) {
      console.error('Error fetching series:', error);
      return [];
    }
  }

  async getSeriesById(id: string): Promise<Series | null> {
    try {
      return await request<Series>(`/series/${id}`);
    } catch (error) {
      console.error('Error fetching series:', error);
      return null;
    }
  }

  async createSeries(series: Series): Promise<Series | null> {
    try {
      return await request<Series>('/series', {
        method: 'POST',
        body: JSON.stringify(series),
      });
    } catch (error) {
      console.error('Error creating series:', error);
      return null;
    }
  }

  async updateSeries(id: string, updates: Partial<Series>): Promise<Series | null> {
    try {
      return await request<Series>(`/series/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating series:', error);
      return null;
    }
  }

  async deleteSeries(id: string): Promise<boolean> {
    try {
      await request<{ success: boolean }>(`/series/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Error deleting series:', error);
      return false;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await request<User>(`/users/${id}`);
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await request<User>(`/users/by-email/${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      return await request<User>(`/users/by-username/${encodeURIComponent(username)}`);
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      return await request<User[]>('/users');
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User | null> {
    try {
      return await request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      return await request<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  async giveBooster(userId: string, count: number = 1): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;
      const currentBoosters = user.availableBoosters || 0;
      const newBoosters = Math.min(currentBoosters + count, 10);
      const result = await this.updateUser(userId, { availableBoosters: newBoosters });
      return !!result;
    } catch (error) {
      console.error('Error giving booster:', error);
      return false;
    }
  }

  async banUser(userId: string, ban: boolean): Promise<boolean> {
    try {
      const result = await this.updateUser(userId, { isBanned: ban });
      return !!result;
    } catch (error) {
      console.error('Error banning user:', error);
      return false;
    }
  }

  async updateCardsForTrade(userId: string, cardIds: string[]): Promise<boolean> {
    try {
      const result = await this.updateUser(userId, { cardsForTrade: cardIds });
      return !!result;
    } catch (error) {
      console.error('Error updating cards for trade:', error);
      return false;
    }
  }

  async getCardsForTrade(userId: string): Promise<string[]> {
    try {
      const user = await this.getUserById(userId);
      return user?.cardsForTrade || [];
    } catch (error) {
      console.error('Error fetching cards for trade:', error);
      return [];
    }
  }

  async getUsersWithCardsForTrade(): Promise<User[]> {
    try {
      return await request<User[]>('/users?withCardsForTrade=true');
    } catch (error) {
      console.error('Error fetching users with trades:', error);
      return [];
    }
  }

  async getUsersCardCounts(): Promise<Record<string, number>> {
    try {
      return await request<Record<string, number>>('/users/card-counts/all');
    } catch (error) {
      console.error('Error fetching card counts:', error);
      return {};
    }
  }

  async getUserCollection(userId: string): Promise<string[]> {
    try {
      return await request<string[]>(`/collections/${userId}`);
    } catch (error) {
      console.error('Error fetching collection:', error);
      return [];
    }
  }

  async addToCollection(userId: string, cardIds: string[]): Promise<boolean> {
    try {
      await request<{ success: boolean }>(`/collections/${userId}/add`, {
        method: 'POST',
        body: JSON.stringify({ cardIds }),
      });
      return true;
    } catch (error) {
      console.error('Error adding to collection:', error);
      return false;
    }
  }

  async removeFromCollection(userId: string, cardId: string): Promise<boolean> {
    try {
      await request<{ success: boolean }>(`/collections/${userId}/card/${cardId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Error removing from collection:', error);
      return false;
    }
  }

  async updateUserCollection(userId: string, newCollection: string[]): Promise<boolean> {
    try {
      await request<{ success: boolean }>(`/collections/${userId}/replace`, {
        method: 'PUT',
        body: JSON.stringify({ collection: newCollection }),
      });
      return true;
    } catch (error) {
      console.error('Error updating user collection:', error);
      return false;
    }
  }

  async cleanupUserCollection(userId: string): Promise<{ removed: number; kept: number }> {
    try {
      const validCards = await this.getCards();
      const validCardIds = new Set(validCards.map((c) => c.id));
      const collection = await this.getUserCollection(userId);
      const filtered = collection.filter((id) => validCardIds.has(id));

      if (filtered.length === collection.length) {
        return { removed: 0, kept: filtered.length };
      }

      await this.updateUserCollection(userId, filtered);
      return { removed: collection.length - filtered.length, kept: filtered.length };
    } catch (error) {
      console.error('Error cleaning up collection:', error);
      return { removed: 0, kept: 0 };
    }
  }

  async cleanupAllUserData(userId: string): Promise<void> {
    try {
      await this.cleanupUserCollection(userId);
      const validCards = await this.getCards();
      const validCardIds = new Set(validCards.map((c) => c.id));
      const user = await this.getUserById(userId);

      if (user) {
        const cleanedFavorites = (user.favoriteCards || []).filter((id) => validCardIds.has(id));
        const cleanedForTrade = (user.cardsForTrade || []).filter((id) => validCardIds.has(id));
        await this.updateUser(userId, { favoriteCards: cleanedFavorites, cardsForTrade: cleanedForTrade });
      }

      const storageKey = `valthera_for_trade_${userId}`;
      const storedForTrade = localStorage.getItem(storageKey);
      if (storedForTrade) {
        const forTradeIds = JSON.parse(storedForTrade) as string[];
        const cleanedLocalForTrade = forTradeIds.filter((id) => validCardIds.has(id));
        localStorage.setItem(storageKey, JSON.stringify(cleanedLocalForTrade));
      }
    } catch (error) {
      console.error('Error cleaning up user data:', error);
    }
  }

  async getTrades(userId: string): Promise<Trade[]> {
    try {
      return await request<Trade[]>(`/trades/user/${userId}`);
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  }

  async createTrade(trade: Omit<Trade, 'id' | 'createdAt'>): Promise<Trade | null> {
    try {
      return await request<Trade>('/trades', {
        method: 'POST',
        body: JSON.stringify(trade),
      });
    } catch (error) {
      console.error('Error creating trade:', error);
      return null;
    }
  }

  async updateTradeStatus(tradeId: string, status: string): Promise<boolean> {
    try {
      await request<Trade>(`/trades/${tradeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return true;
    } catch (error) {
      console.error('Error updating trade status:', error);
      return false;
    }
  }

  async acceptTradeAtomic(tradeId: string): Promise<Trade | null> {
    try {
      return await request<Trade>(`/trades/${tradeId}/accept`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error accepting trade atomically:', error);
      return null;
    }
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      return await request<Notification[]>(`/notifications/user/${userId}`);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification | null> {
    try {
      return await request<Notification>('/notifications', {
        method: 'POST',
        body: JSON.stringify(notification),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      await request<Notification>(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  getImageUrl(_bucket: string, path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
  }

  async uploadImage(bucket: string, path: string, file: File): Promise<string | null> {
    try {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const response = await fetch(
        apiUrl(`/media/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`),
        {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: file,
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Upload failed');
        throw new Error(errorText);
      }

      const payload = await response.json() as { url?: string; path?: string };
      return payload.url || (payload.path ? this.getImageUrl(bucket, payload.path) : null);
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  async deleteImage(bucket: string, path: string): Promise<boolean> {
    try {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const response = await fetch(
        apiUrl(`/media/delete?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`),
        {
          method: 'DELETE',
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await request<{ status: string }>('/health');
      return result.status === 'ok';
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
