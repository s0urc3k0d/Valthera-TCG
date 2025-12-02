import { Card, Series, User, Rarity, CardType } from '../types';

const STORAGE_KEYS = {
  USERS: 'valthera_users',
  CURRENT_USER: 'valthera_current_user',
  SERIES: 'valthera_series',
  CARDS: 'valthera_cards',
};

// Initial Data Seeding - Exemple de campagne Valthera
const seedData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.SERIES)) {
    const initialSeries: Series[] = [
      {
        id: 'campaign_1',
        name: 'Les Ombres de Kael\'Thar',
        description: 'La première campagne dans les terres maudites de Kael\'Thar, où nos héros ont affronté le Nécromancien Vexar.',
        setting: 'Royaume déchu de Kael\'Thar - Terres corrompues par la nécromancie',
        totalCards: 8,
        coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
        releaseDate: '2024-01-15',
        isActive: false,
      }
    ];
    localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(initialSeries));
  }

  if (!localStorage.getItem(STORAGE_KEYS.CARDS)) {
    const initialCards: Card[] = [
      // Personnages
      { 
        id: 'c1', 
        seriesId: 'campaign_1', 
        name: 'Aldric le Brave', 
        title: 'Paladin de l\'Aube',
        description: 'Un paladin dévoué qui a juré de purifier les terres de Kael\'Thar.',
        lore: 'Aldric a perdu sa famille lors de la première vague de corruption. Depuis, il voue sa vie à combattre les forces des ténèbres.',
        rarity: Rarity.RARE, 
        cardType: CardType.CHARACTER,
        attack: 5, 
        defense: 6, 
        abilities: ['Frappe Sacrée', 'Aura de Protection'],
        imageUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400' 
      },
      { 
        id: 'c2', 
        seriesId: 'campaign_1', 
        name: 'Lyra Sombreflèche', 
        title: 'Archère des Bois Perdus',
        description: 'Une elfe rôdeuse aux flèches infaillibles.',
        lore: 'Lyra a quitté sa forêt natale quand celle-ci fut détruite par les sbires de Vexar.',
        rarity: Rarity.UNCOMMON, 
        cardType: CardType.CHARACTER,
        attack: 6, 
        defense: 3, 
        abilities: ['Tir Précis', 'Camouflage'],
        imageUrl: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400' 
      },
      // Créatures
      { 
        id: 'c3', 
        seriesId: 'campaign_1', 
        name: 'Goule des Marais', 
        description: 'Une créature morte-vivante qui hante les marécages de Kael\'Thar.',
        rarity: Rarity.COMMON, 
        cardType: CardType.CREATURE,
        attack: 3, 
        defense: 2, 
        abilities: ['Griffes Venimeuses'],
        imageUrl: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400' 
      },
      { 
        id: 'c4', 
        seriesId: 'campaign_1', 
        name: 'Dragon Squelettique', 
        description: 'Un ancien dragon ressuscité par la magie noire de Vexar.',
        rarity: Rarity.EPIC, 
        cardType: CardType.CREATURE,
        attack: 8, 
        defense: 7, 
        abilities: ['Souffle de Mort', 'Vol', 'Terreur'],
        imageUrl: 'https://images.unsplash.com/photo-1577493340887-b7bfff550145?w=400' 
      },
      // Lieu
      { 
        id: 'c5', 
        seriesId: 'campaign_1', 
        name: 'Tour de Vexar', 
        title: 'Bastion des Ténèbres',
        description: 'La forteresse du Nécromancien, source de toute corruption.',
        lore: 'Autrefois tour de guet du royaume, elle fut corrompue quand Vexar y établit son sanctuaire.',
        rarity: Rarity.RARE, 
        cardType: CardType.LOCATION,
        attack: 0, 
        defense: 10, 
        abilities: ['Aura de Corruption', 'Invocation de Morts-Vivants'],
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400' 
      },
      // Objet
      { 
        id: 'c6', 
        seriesId: 'campaign_1', 
        name: 'Lame de l\'Aurore', 
        description: 'Une épée bénie capable de trancher les ténèbres.',
        lore: 'Forgée par les anciens prêtres de l\'Aube, cette lame fut perdue pendant des siècles.',
        rarity: Rarity.EPIC, 
        cardType: CardType.ITEM,
        attack: 4, 
        defense: 0, 
        abilities: ['Dégâts Sacrés +3', 'Lumière Purificatrice'],
        imageUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400' 
      },
      // Événement
      { 
        id: 'c7', 
        seriesId: 'campaign_1', 
        name: 'La Nuit des Âmes', 
        description: 'Une nuit où le voile entre les mondes s\'amincit.',
        rarity: Rarity.UNCOMMON, 
        cardType: CardType.EVENT,
        attack: 0, 
        defense: 0, 
        abilities: ['Tous les morts-vivants +2 ATK', 'Invocation gratuite'],
        imageUrl: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400' 
      },
      // Boss
      { 
        id: 'c8', 
        seriesId: 'campaign_1', 
        name: 'Vexar le Nécromancien', 
        title: 'Seigneur des Morts',
        description: 'Le maître absolu des ténèbres de Kael\'Thar.',
        lore: 'Autrefois mage royal, Vexar sombra dans la folie après la mort de sa fille, cherchant à la ressusciter par tous les moyens.',
        rarity: Rarity.LEGENDARY, 
        cardType: CardType.BOSS,
        attack: 9, 
        defense: 8, 
        abilities: ['Drain de Vie', 'Armée des Morts', 'Malédiction Éternelle'],
        imageUrl: 'https://images.unsplash.com/photo-1577493340887-b7bfff550145?w=400' 
      },
    ];
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(initialCards));
  }
};

seedData();

export const StorageService = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  
  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    const currentUser = StorageService.getCurrentUser();
    if (currentUser && currentUser.id === user.id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getSeries: (): Series[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.SERIES) || '[]'),

  saveSeries: (series: Series) => {
    const allSeries = StorageService.getSeries();
    const index = allSeries.findIndex(s => s.id === series.id);
    if (index >= 0) {
      allSeries[index] = series;
    } else {
      allSeries.push(series);
    }
    localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(allSeries));
  },

  deleteSeries: (seriesId: string) => {
    const allSeries = StorageService.getSeries().filter(s => s.id !== seriesId);
    localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(allSeries));
    // Also delete all cards from this series
    const cards = StorageService.getCards().filter(c => c.seriesId !== seriesId);
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  },

  getCards: (): Card[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.CARDS) || '[]'),

  saveCard: (card: Card) => {
    const cards = StorageService.getCards();
    const index = cards.findIndex(c => c.id === card.id);
    if (index >= 0) {
      cards[index] = card;
    } else {
      cards.push(card);
    }
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  },

  deleteCard: (cardId: string) => {
    const cards = StorageService.getCards().filter(c => c.id !== cardId);
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  },

  getBooster: (count: number = 5, seriesId?: string): Card[] => {
    let allCards = StorageService.getCards();
    if (seriesId) {
      allCards = allCards.filter(c => c.seriesId === seriesId);
    }
    
    if (allCards.length === 0) return [];
    
    // Weighted randomizer based on rarity
    const weights = {
      [Rarity.COMMON]: 50,
      [Rarity.UNCOMMON]: 30,
      [Rarity.RARE]: 15,
      [Rarity.EPIC]: 4,
      [Rarity.LEGENDARY]: 1,
    };

    const weightedCards: Card[] = [];
    allCards.forEach(card => {
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
  }
};