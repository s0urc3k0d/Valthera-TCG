// Service Supabase pour Valthera TCG
// Gestion de la base de données et du stockage

import { SUPABASE_CONFIG, STORAGE_BUCKETS, TABLES } from '../config/supabase';
import { Card, Series, User, Trade, Notification, TradeStatus, TradeItem, NotificationType, CardType, Rarity } from '../types';

// Simple fetch wrapper pour Supabase REST API
class SupabaseService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = SUPABASE_CONFIG.url;
    this.headers = {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  // ==================== CARDS ====================

  private mapCardFromDb(dbCard: Record<string, unknown>): Card {
    return {
      id: dbCard.id as string,
      seriesId: dbCard.series_id as string,
      name: dbCard.name as string,
      title: dbCard.title as string | undefined,
      description: dbCard.description as string,
      lore: dbCard.lore as string | undefined,
      imageUrl: dbCard.image_url as string,
      cardType: dbCard.card_type as CardType,
      rarity: dbCard.rarity as Rarity,
      attack: dbCard.attack as number,
      defense: dbCard.defense as number,
      abilities: dbCard.abilities as string[] | undefined,
      createdAt: dbCard.created_at as string | undefined,
      updatedAt: dbCard.updated_at as string | undefined,
    };
  }

  private mapCardToDb(card: Partial<Card>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    if (card.seriesId !== undefined) mapped.series_id = card.seriesId;
    if (card.name !== undefined) mapped.name = card.name;
    if (card.title !== undefined) mapped.title = card.title;
    if (card.description !== undefined) mapped.description = card.description;
    if (card.lore !== undefined) mapped.lore = card.lore;
    if (card.imageUrl !== undefined) mapped.image_url = card.imageUrl;
    if (card.cardType !== undefined) mapped.card_type = card.cardType;
    if (card.rarity !== undefined) mapped.rarity = card.rarity;
    if (card.attack !== undefined) mapped.attack = card.attack;
    if (card.defense !== undefined) mapped.defense = card.defense;
    if (card.abilities !== undefined) mapped.abilities = card.abilities;
    return mapped;
  }
  
  async getCards(): Promise<Card[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.CARDS}?select=*&order=name.asc`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch cards');
      const data = await response.json();
      return data.map((c: Record<string, unknown>) => this.mapCardFromDb(c));
    } catch (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
  }

  async getCardById(id: string): Promise<Card | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.CARDS}?id=eq.${id}&select=*`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch card');
      const data = await response.json();
      return data[0] ? this.mapCardFromDb(data[0]) : null;
    } catch (error) {
      console.error('Error fetching card:', error);
      return null;
    }
  }

  async getCardsBySeries(seriesId: string): Promise<Card[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.CARDS}?series_id=eq.${seriesId}&select=*&order=name.asc`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch cards');
      const data = await response.json();
      return data.map((c: Record<string, unknown>) => this.mapCardFromDb(c));
    } catch (error) {
      console.error('Error fetching cards by series:', error);
      return [];
    }
  }

  async createCard(card: Card): Promise<Card | null> {
    try {
      const dbCard = this.mapCardToDb(card);
      dbCard.id = card.id; // Include the ID
      dbCard.created_at = new Date().toISOString();
      
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.CARDS}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(dbCard),
        }
      );
      if (!response.ok) {
        const error = await response.text();
        console.error('Create card error:', error);
        throw new Error('Failed to create card');
      }
      const data = await response.json();
      return data[0] ? this.mapCardFromDb(data[0]) : null;
    } catch (error) {
      console.error('Error creating card:', error);
      return null;
    }
  }

  async updateCard(id: string, updates: Partial<Card>): Promise<Card | null> {
    try {
      const dbUpdates = this.mapCardToDb(updates);
      dbUpdates.updated_at = new Date().toISOString();
      
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.CARDS}?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify(dbUpdates),
        }
      );
      if (!response.ok) throw new Error('Failed to update card');
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error updating card:', error);
      return null;
    }
  }

  async deleteCard(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.CARDS}?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error deleting card:', error);
      return false;
    }
  }

  // Generate a booster pack with weighted randomization
  async getBooster(count: number = 5, seriesId?: string): Promise<Card[]> {
    try {
      let cards = await this.getCards();
      if (seriesId) {
        cards = cards.filter(c => c.seriesId === seriesId);
      }
      
      if (cards.length === 0) return [];
      
      // Weighted randomizer based on rarity
      const weights: Record<string, number> = {
        [Rarity.COMMON]: 50,
        [Rarity.UNCOMMON]: 30,
        [Rarity.RARE]: 15,
        [Rarity.EPIC]: 4,
        [Rarity.LEGENDARY]: 1,
      };

      const weightedCards: Card[] = [];
      cards.forEach(card => {
        const weight = weights[card.rarity] || 10;
        for (let i = 0; i < weight; i++) {
          weightedCards.push(card);
        }
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

  // ==================== SERIES ====================

  private mapSeriesFromDb(dbSeries: Record<string, unknown>): Series {
    return {
      id: dbSeries.id as string,
      name: dbSeries.name as string,
      description: dbSeries.description as string || '',
      setting: dbSeries.setting as string || '',
      totalCards: dbSeries.total_cards as number || 0,
      coverImage: dbSeries.cover_image as string || '',
      releaseDate: dbSeries.release_date as string | undefined,
      isActive: dbSeries.is_active as boolean,
      createdAt: dbSeries.created_at as string | undefined,
      updatedAt: dbSeries.updated_at as string | undefined,
    };
  }

  private mapSeriesToDb(series: Partial<Series>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    if (series.name !== undefined) mapped.name = series.name;
    if (series.description !== undefined) mapped.description = series.description;
    if (series.setting !== undefined) mapped.setting = series.setting;
    if (series.totalCards !== undefined) mapped.total_cards = series.totalCards;
    if (series.coverImage !== undefined) mapped.cover_image = series.coverImage;
    if (series.releaseDate !== undefined) mapped.release_date = series.releaseDate;
    if (series.isActive !== undefined) mapped.is_active = series.isActive;
    return mapped;
  }

  async getSeries(): Promise<Series[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.SERIES}?select=*&order=name.asc`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch series');
      const data = await response.json();
      return data.map((s: Record<string, unknown>) => this.mapSeriesFromDb(s));
    } catch (error) {
      console.error('Error fetching series:', error);
      return [];
    }
  }

  async getSeriesById(id: string): Promise<Series | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.SERIES}?id=eq.${id}&select=*`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch series');
      const data = await response.json();
      return data[0] ? this.mapSeriesFromDb(data[0]) : null;
    } catch (error) {
      console.error('Error fetching series:', error);
      return null;
    }
  }

  async createSeries(series: Series): Promise<Series | null> {
    try {
      const dbSeries = this.mapSeriesToDb(series);
      dbSeries.id = series.id; // Include the ID
      dbSeries.created_at = new Date().toISOString();
      
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.SERIES}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(dbSeries),
        }
      );
      if (!response.ok) throw new Error('Failed to create series');
      const data = await response.json();
      return data[0] ? this.mapSeriesFromDb(data[0]) : null;
    } catch (error) {
      console.error('Error creating series:', error);
      return null;
    }
  }

  async updateSeries(id: string, updates: Partial<Series>): Promise<Series | null> {
    try {
      const dbUpdates = this.mapSeriesToDb(updates);
      dbUpdates.updated_at = new Date().toISOString();
      
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.SERIES}?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify(dbUpdates),
        }
      );
      if (!response.ok) throw new Error('Failed to update series');
      const data = await response.json();
      return data[0] ? this.mapSeriesFromDb(data[0]) : null;
    } catch (error) {
      console.error('Error updating series:', error);
      return null;
    }
  }

  async deleteSeries(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.SERIES}?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error deleting series:', error);
      return false;
    }
  }

  // ==================== USERS ====================

  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?id=eq.${id}&select=*`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      return this.mapUserFromDb(data[0]) || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      return this.mapUserFromDb(data[0]) || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?username=eq.${encodeURIComponent(username)}&select=*`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      return this.mapUserFromDb(data[0]) || null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?select=*`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.map((u: Record<string, unknown>) => this.mapUserFromDb(u)).filter((u: User | null): u is User => u !== null);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Helper pour mapper les champs snake_case vers camelCase
  private mapUserFromDb(dbUser: Record<string, unknown> | undefined): User | null {
    if (!dbUser) return null;
    return {
      id: dbUser.id as string,
      username: dbUser.username as string,
      email: dbUser.email as string | undefined,
      avatar: dbUser.avatar as string | undefined,
      isAdmin: dbUser.is_admin as boolean,
      isBanned: dbUser.is_banned as boolean | undefined,
      lastBoosterDate: dbUser.last_booster_date as string | null,
      availableBoosters: (dbUser.available_boosters as number) || 0,
      collection: [], // Chargé séparément
      favoriteCards: dbUser.favorite_cards as string[] | undefined,
      cardsForTrade: dbUser.cards_for_trade as string[] | undefined,
      createdAt: dbUser.created_at as string,
      updatedAt: dbUser.updated_at as string | undefined,
      isPublicProfile: dbUser.is_public_profile as boolean | undefined,
      shareCode: dbUser.share_code as string | undefined,
    };
  }

  // Helper pour mapper les champs camelCase vers snake_case pour la DB
  private mapUserToDb(user: Partial<User>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    if (user.username !== undefined) mapped.username = user.username;
    if (user.email !== undefined) mapped.email = user.email;
    if (user.avatar !== undefined) mapped.avatar = user.avatar;
    if (user.isAdmin !== undefined) mapped.is_admin = user.isAdmin;
    if (user.isBanned !== undefined) mapped.is_banned = user.isBanned;
    if (user.lastBoosterDate !== undefined) mapped.last_booster_date = user.lastBoosterDate;
    if (user.availableBoosters !== undefined) mapped.available_boosters = user.availableBoosters;
    if (user.favoriteCards !== undefined) mapped.favorite_cards = user.favoriteCards;
    if (user.cardsForTrade !== undefined) mapped.cards_for_trade = user.cardsForTrade;
    if (user.isPublicProfile !== undefined) mapped.is_public_profile = user.isPublicProfile;
    return mapped;
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            ...this.mapUserToDb(user),
            created_at: new Date().toISOString(),
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create user');
      const data = await response.json();
      return this.mapUserFromDb(data[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            ...this.mapUserToDb(updates),
            updated_at: new Date().toISOString(),
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to update user');
      const data = await response.json();
      return this.mapUserFromDb(data[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Give booster to user
  async giveBooster(userId: string, count: number = 1): Promise<boolean> {
    try {
      // Get current user data
      const user = await this.getUserById(userId);
      if (!user) return false;
      
      const currentBoosters = user.availableBoosters || 0;
      const newBoosters = Math.min(currentBoosters + count, 10); // Max 10 boosters
      
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            available_boosters: newBoosters,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      
      console.log(`🎁 Gave ${count} booster(s) to user ${userId}. New total: ${newBoosters}`);
      return response.ok;
    } catch (error) {
      console.error('Error giving booster:', error);
      return false;
    }
  }

  // Ban/Unban user
  async banUser(userId: string, ban: boolean): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            is_banned: ban,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error banning user:', error);
      return false;
    }
  }

  // Update cards for trade - stores in users table
  async updateCardsForTrade(userId: string, cardIds: string[]): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            cards_for_trade: cardIds,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      
      if (!response.ok) {
        console.error('Failed to update cards for trade:', await response.text());
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating cards for trade:', error);
      return false;
    }
  }

  // Get cards for trade for a specific user (from Supabase)
  async getCardsForTrade(userId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?id=eq.${userId}&select=cards_for_trade`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch cards for trade');
      const data = await response.json();
      return (data[0]?.cards_for_trade as string[]) || [];
    } catch (error) {
      console.error('Error fetching cards for trade:', error);
      return [];
    }
  }

  // Get all users with cards for trade (for marketplace)
  async getUsersWithCardsForTrade(): Promise<User[]> {
    try {
      // Get only users who have cards for trade (filter in query)
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.USERS}?cards_for_trade=not.is.null&select=*`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch users with trades');
      const data = await response.json();
      
      // Map and filter users with non-empty cardsForTrade arrays
      const usersWithTrades = data
        .map((dbUser: Record<string, unknown>) => this.mapUserFromDb(dbUser))
        .filter((user: User | null) => user && Array.isArray(user.cardsForTrade) && user.cardsForTrade.length > 0);
      
      console.log(`📦 Found ${usersWithTrades.length} users with cards for trade`);
      return usersWithTrades;
    } catch (error) {
      console.error('Error fetching users with trades:', error);
      return [];
    }
  }

  // ==================== COLLECTIONS ====================

  // Get card count for all users in a single query (for admin panel)
  async getUsersCardCounts(): Promise<Record<string, number>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.COLLECTIONS}?select=user_id`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch card counts');
      const data = await response.json();
      
      // Count cards per user
      const counts: Record<string, number> = {};
      for (const item of data) {
        const userId = item.user_id;
        counts[userId] = (counts[userId] || 0) + 1;
      }
      return counts;
    } catch (error) {
      console.error('Error fetching card counts:', error);
      return {};
    }
  }

  async getUserCollection(userId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.COLLECTIONS}?user_id=eq.${userId}&select=card_id`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch collection');
      const data = await response.json();
      return data.map((item: { card_id: string }) => item.card_id);
    } catch (error) {
      console.error('Error fetching collection:', error);
      return [];
    }
  }

  async addToCollection(userId: string, cardIds: string[]): Promise<boolean> {
    try {
      const items = cardIds.map(cardId => ({
        user_id: userId,
        card_id: cardId,
        obtained_at: new Date().toISOString(),
      }));
      
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.COLLECTIONS}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(items),
        }
      );
      if (!response.ok) {
        console.error('Failed to add to collection:', await response.text());
      }
      return response.ok;
    } catch (error) {
      console.error('Error adding to collection:', error);
      return false;
    }
  }

  async removeFromCollection(userId: string, cardId: string): Promise<boolean> {
    try {
      // Supprimer UNE seule entrée (pas toutes les copies)
      // On récupère d'abord l'ID de l'entrée à supprimer
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.COLLECTIONS}?user_id=eq.${userId}&card_id=eq.${cardId}&limit=1&select=id`,
        { headers: this.headers }
      );
      
      if (!response.ok) return false;
      const data = await response.json();
      
      if (data.length === 0) return false;
      
      // Supprimer cette entrée spécifique
      const deleteResponse = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.COLLECTIONS}?id=eq.${data[0].id}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );
      
      return deleteResponse.ok;
    } catch (error) {
      console.error('Error removing from collection:', error);
      return false;
    }
  }

  async updateUserCollection(userId: string, newCollection: string[]): Promise<boolean> {
    try {
      // Récupérer la collection actuelle
      const currentCollection = await this.getUserCollection(userId);
      
      // Calculer les cartes à ajouter et à retirer
      const currentCounts = new Map<string, number>();
      currentCollection.forEach(id => {
        currentCounts.set(id, (currentCounts.get(id) || 0) + 1);
      });
      
      const newCounts = new Map<string, number>();
      newCollection.forEach(id => {
        newCounts.set(id, (newCounts.get(id) || 0) + 1);
      });
      
      // Cartes à ajouter
      const toAdd: string[] = [];
      newCounts.forEach((count, cardId) => {
        const currentCount = currentCounts.get(cardId) || 0;
        const diff = count - currentCount;
        for (let i = 0; i < diff; i++) {
          toAdd.push(cardId);
        }
      });
      
      // Cartes à retirer
      const toRemove: string[] = [];
      currentCounts.forEach((count, cardId) => {
        const newCount = newCounts.get(cardId) || 0;
        const diff = count - newCount;
        for (let i = 0; i < diff; i++) {
          toRemove.push(cardId);
        }
      });
      
      // Exécuter les opérations
      if (toAdd.length > 0) {
        await this.addToCollection(userId, toAdd);
      }
      
      for (const cardId of toRemove) {
        await this.removeFromCollection(userId, cardId);
      }
      
      console.log(`📦 Collection updated for ${userId}: +${toAdd.length} -${toRemove.length}`);
      return true;
    } catch (error) {
      console.error('Error updating user collection:', error);
      return false;
    }
  }

  // Clean up ghost data (cards that don't exist in the cards table)
  async cleanupUserCollection(userId: string): Promise<{ removed: number; kept: number }> {
    try {
      // Get all valid card IDs from the database
      const validCards = await this.getCards();
      const validCardIds = new Set(validCards.map(c => c.id));
      
      // Get user's current collection
      const collection = await this.getUserCollection(userId);
      
      // Find ghost card IDs (those that don't exist in cards table)
      const ghostCardIds = collection.filter(cardId => !validCardIds.has(cardId));
      
      if (ghostCardIds.length === 0) {
        return { removed: 0, kept: collection.length };
      }
      
      console.log(`🧹 Found ${ghostCardIds.length} ghost cards to remove`);
      
      // Delete ghost entries from user_collections
      for (const cardId of ghostCardIds) {
        await fetch(
          `${this.baseUrl}/rest/v1/${TABLES.COLLECTIONS}?user_id=eq.${userId}&card_id=eq.${cardId}`,
          {
            method: 'DELETE',
            headers: this.headers,
          }
        );
      }
      
      const keptCount = collection.length - ghostCardIds.length;
      console.log(`🧹 Cleanup complete: removed ${ghostCardIds.length}, kept ${keptCount}`);
      
      return { removed: ghostCardIds.length, kept: keptCount };
    } catch (error) {
      console.error('Error cleaning up collection:', error);
      return { removed: 0, kept: 0 };
    }
  }

  // Clean up all ghost data for a user (collection, favorites, trades)
  async cleanupAllUserData(userId: string): Promise<void> {
    try {
      // Clean collection
      await this.cleanupUserCollection(userId);
      
      // Clean favorites and cardsForTrade (stored in users table)
      const validCards = await this.getCards();
      const validCardIds = new Set(validCards.map(c => c.id));
      
      const user = await this.getUserById(userId);
      if (user) {
        const cleanedFavorites = (user.favoriteCards || []).filter(id => validCardIds.has(id));
        const cleanedForTrade = (user.cardsForTrade || []).filter(id => validCardIds.has(id));
        
        await this.updateUser(userId, {
          favoriteCards: cleanedFavorites,
          cardsForTrade: cleanedForTrade,
        });
      }
      
      // Clean localStorage for cardsForTrade
      const storageKey = `valthera_for_trade_${userId}`;
      const storedForTrade = localStorage.getItem(storageKey);
      if (storedForTrade) {
        const forTradeIds = JSON.parse(storedForTrade) as string[];
        const cleanedLocalForTrade = forTradeIds.filter(id => validCardIds.has(id));
        localStorage.setItem(storageKey, JSON.stringify(cleanedLocalForTrade));
      }
      
      console.log('✅ All user data cleaned up');
    } catch (error) {
      console.error('Error cleaning up user data:', error);
    }
  }

  // ==================== TRADES ====================

  async getTrades(userId: string): Promise<Trade[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.TRADES}?or=(from_user_id.eq.${userId},to_user_id.eq.${userId})&select=*&order=created_at.desc`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch trades');
      const data = await response.json();
      return data.map((t: Record<string, unknown>) => this.mapTradeFromDb(t));
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  }

  private mapTradeFromDb(dbTrade: Record<string, unknown>): Trade {
    return {
      id: dbTrade.id as string,
      fromUserId: dbTrade.from_user_id as string,
      toUserId: dbTrade.to_user_id as string,
      fromUsername: dbTrade.from_username as string,
      toUsername: dbTrade.to_username as string,
      status: dbTrade.status as TradeStatus,
      offeredCards: (dbTrade.offered_cards as TradeItem[]) || [],
      requestedCards: (dbTrade.requested_cards as TradeItem[]) || [],
      message: dbTrade.message as string | undefined,
      createdAt: dbTrade.created_at as string,
      updatedAt: dbTrade.updated_at as string | undefined,
      completedAt: dbTrade.completed_at as string | undefined,
    };
  }

  private mapTradeToDb(trade: Partial<Omit<Trade, 'id' | 'createdAt'>>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    if (trade.fromUserId !== undefined) mapped.from_user_id = trade.fromUserId;
    if (trade.toUserId !== undefined) mapped.to_user_id = trade.toUserId;
    if (trade.fromUsername !== undefined) mapped.from_username = trade.fromUsername;
    if (trade.toUsername !== undefined) mapped.to_username = trade.toUsername;
    if (trade.status !== undefined) mapped.status = trade.status;
    if (trade.offeredCards !== undefined) mapped.offered_cards = trade.offeredCards;
    if (trade.requestedCards !== undefined) mapped.requested_cards = trade.requestedCards;
    if (trade.message !== undefined) mapped.message = trade.message;
    return mapped;
  }

  async createTrade(trade: Omit<Trade, 'id' | 'createdAt'>): Promise<Trade | null> {
    try {
      const payload = {
        ...this.mapTradeToDb(trade),
        created_at: new Date().toISOString(),
      };
      
      console.log('Creating trade with payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.TRADES}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Trade creation failed:', response.status, errorText);
        throw new Error(`Failed to create trade: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Trade created successfully:', data);
      return this.mapTradeFromDb(data[0]);
    } catch (error) {
      console.error('Error creating trade:', error);
      return null;
    }
  }

  async updateTradeStatus(tradeId: string, status: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.TRADES}?id=eq.${tradeId}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            status,
            updated_at: new Date().toISOString(),
            ...(status === 'accepted' || status === 'rejected' ? { completed_at: new Date().toISOString() } : {}),
          }),
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error updating trade status:', error);
      return false;
    }
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.NOTIFICATIONS}?user_id=eq.${userId}&order=created_at.desc&limit=50`,
        { headers: this.headers }
      );
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      return data.map((n: Record<string, unknown>) => this.mapNotificationFromDb(n));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  private mapNotificationFromDb(dbNotif: Record<string, unknown>): Notification {
    return {
      id: dbNotif.id as string,
      userId: dbNotif.user_id as string,
      type: dbNotif.type as NotificationType,
      title: dbNotif.title as string,
      message: dbNotif.message as string,
      data: dbNotif.data as Record<string, unknown> | undefined,
      isRead: dbNotif.is_read as boolean,
      createdAt: dbNotif.created_at as string,
    };
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.NOTIFICATIONS}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            user_id: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            is_read: notification.isRead,
            created_at: new Date().toISOString(),
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create notification');
      const data = await response.json();
      return this.mapNotificationFromDb(data[0]);
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/${TABLES.NOTIFICATIONS}?id=eq.${notificationId}`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({ is_read: true }),
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // ==================== STORAGE (Images) ====================

  getImageUrl(bucket: string, path: string): string {
    return `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  async uploadImage(bucket: string, path: string, file: File): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/storage/v1/object/${bucket}/${path}`,
        {
          method: 'POST',
          headers: {
            ...this.headers,
            'Content-Type': file.type,
          },
          body: file,
        }
      );
      if (!response.ok) throw new Error('Failed to upload image');
      return this.getImageUrl(bucket, path);
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  async deleteImage(bucket: string, path: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/storage/v1/object/${bucket}/${path}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/v1/`,
        { headers: this.headers }
      );
      return response.ok;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;
