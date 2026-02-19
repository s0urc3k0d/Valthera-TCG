import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardType, Rarity, Series, CollectionStats as Stats } from '../types';
import supabaseService from '../services/apiService';
import { CardView } from '../components/CardView';
import CollectionStats from '../components/CollectionStats';
import CardDetail from '../components/CardDetail';
import { QRCodeShare } from '../components/QRCodeShare';
import { CardCarousel } from '../components/CardCarousel';
import { useAuth } from '../contexts/AuthContext';

type ViewMode = 'grid' | 'list' | 'carousel';

export const Collection: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  // Load from Supabase
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [cards, series] = await Promise.all([
          supabaseService.getCards(),
          supabaseService.getSeries(),
        ]);
        setAllCards(cards);
        setAllSeries(series);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);
  
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(user?.favoriteCards || []);
  const [forTrade, setForTrade] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Filter state lifted up
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<CardType[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Load forTrade from Supabase on mount
  useEffect(() => {
    const loadForTrade = async () => {
      if (user) {
        const cardsForTrade = await supabaseService.getCardsForTrade(user.id);
        setForTrade(cardsForTrade);
      }
    };
    loadForTrade();
  }, [user?.id]);

  // Save forTrade to Supabase when it changes
  const updateForTrade = async (newForTrade: string[]) => {
    setForTrade(newForTrade);
    if (user) {
      await supabaseService.updateCardsForTrade(user.id, newForTrade);
    }
  };
  
  const userCollection = user?.collection || [];
  
  const ownedCardsMap = useMemo(() => {
    const map = new Map<string, number>();
    userCollection.forEach(cardId => {
      map.set(cardId, (map.get(cardId) || 0) + 1);
    });
    return map;
  }, [userCollection]);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let result = [...allCards];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(card => 
        card.name.toLowerCase().includes(search) ||
        card.description.toLowerCase().includes(search) ||
        card.abilities?.some(a => a.toLowerCase().includes(search))
      );
    }

    // Rarity filter
    if (selectedRarities.length > 0) {
      result = result.filter(card => selectedRarities.includes(card.rarity));
    }

    // Type filter
    if (selectedTypes.length > 0) {
      result = result.filter(card => selectedTypes.includes(card.cardType));
    }

    // Series filter
    if (selectedSeries.length > 0) {
      result = result.filter(card => selectedSeries.includes(card.seriesId));
    }

    // Sorting
    const rarityOrder: Record<Rarity, number> = {
      [Rarity.COMMON]: 1,
      [Rarity.UNCOMMON]: 2,
      [Rarity.RARE]: 3,
      [Rarity.EPIC]: 4,
      [Rarity.LEGENDARY]: 5,
    };

    const [field, direction] = sortBy.split('-') as [string, 'asc' | 'desc'];
    result.sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rarity':
          comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
          break;
        case 'attack':
          comparison = (a.attack || 0) - (b.attack || 0);
          break;
        case 'defense':
          comparison = (a.defense || 0) - (b.defense || 0);
          break;
        default:
          comparison = 0;
      }
      return direction === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [allCards, searchTerm, selectedRarities, selectedTypes, selectedSeries, sortBy]);

  const toggleFavorite = (cardId: string) => {
    setFavorites(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const toggleForTrade = (cardId: string) => {
    const newForTrade = forTrade.includes(cardId)
      ? forTrade.filter(id => id !== cardId)
      : [...forTrade, cardId];
    updateForTrade(newForTrade);
  };

  // Calculate collection stats
  const collectionStats: Stats = useMemo(() => {
    const ownedCards = allCards.filter(c => ownedCardsMap.has(c.id));
    
    const byRarity: Record<Rarity, { owned: number; total: number }> = {
      [Rarity.COMMON]: { owned: 0, total: 0 },
      [Rarity.UNCOMMON]: { owned: 0, total: 0 },
      [Rarity.RARE]: { owned: 0, total: 0 },
      [Rarity.EPIC]: { owned: 0, total: 0 },
      [Rarity.LEGENDARY]: { owned: 0, total: 0 },
    };
    
    const byType: Record<CardType, { owned: number; total: number }> = {
      [CardType.CHARACTER]: { owned: 0, total: 0 },
      [CardType.CREATURE]: { owned: 0, total: 0 },
      [CardType.LOCATION]: { owned: 0, total: 0 },
      [CardType.ITEM]: { owned: 0, total: 0 },
      [CardType.EVENT]: { owned: 0, total: 0 },
      [CardType.BOSS]: { owned: 0, total: 0 },
    };
    
    const bySeries: Record<string, { owned: number; total: number; name: string }> = {};
    
    allSeries.forEach(s => {
      bySeries[s.id] = { owned: 0, total: 0, name: s.name };
    });
    
    allCards.forEach(card => {
      const isOwned = ownedCardsMap.has(card.id);
      
      byRarity[card.rarity].total++;
      if (isOwned) byRarity[card.rarity].owned++;
      
      byType[card.cardType].total++;
      if (isOwned) byType[card.cardType].owned++;
      
      if (bySeries[card.seriesId]) {
        bySeries[card.seriesId].total++;
        if (isOwned) bySeries[card.seriesId].owned++;
      }
    });
    
    const rarestCards = ownedCards
      .filter(c => c.rarity === Rarity.LEGENDARY || c.rarity === Rarity.EPIC)
      .slice(0, 5);
    
    const recentCards = ownedCards.slice(-5).reverse();
    
    return {
      totalCards: userCollection.length,
      uniqueCards: ownedCardsMap.size,
      totalPossible: allCards.length,
      completionPercentage: allCards.length > 0 ? (ownedCardsMap.size / allCards.length) * 100 : 0,
      byRarity,
      byType,
      bySeries,
      rarestCards,
      recentCards,
    };
  }, [allCards, allSeries, ownedCardsMap, userCollection.length]);

  const uniqueOwnedCount = ownedCardsMap.size;
  const totalPossible = allCards.length;
  const completionPercentage = totalPossible > 0 ? Math.round((uniqueOwnedCount / totalPossible) * 100) : 0;

  // Loading state
  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valthera-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-valthera-400 font-medieval">Chargement de la collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="bg-valthera-800 rounded-2xl p-6 border border-valthera-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-medieval font-bold text-valthera-200">Collection de {user?.username || 'Aventurier'}</h1>
            <p className="text-valthera-400">Gérez vos cartes et suivez votre quête de collection.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-valthera-900 rounded-lg p-1 border border-valthera-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-valthera-600 text-white'
                    : 'text-valthera-400 hover:text-valthera-200'
                }`}
                title="Grille"
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-valthera-600 text-white'
                    : 'text-valthera-400 hover:text-valthera-200'
                }`}
                title="Liste"
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode('carousel')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'carousel'
                    ? 'bg-valthera-600 text-white'
                    : 'text-valthera-400 hover:text-valthera-200'
                }`}
                title="Carrousel"
              >
                🎠
              </button>
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showStats
                  ? 'bg-valthera-600 border-valthera-500 text-white'
                  : 'bg-valthera-800 border-valthera-600 text-stone-300 hover:bg-valthera-700'
              }`}
            >
              📊 {showStats ? 'Masquer Stats' : 'Voir Stats'}
            </button>
            <button
              onClick={() => setShowQRCode(true)}
              className="px-4 py-2 rounded-lg border border-valthera-600 text-stone-300 hover:bg-valthera-700 transition-colors flex items-center gap-2"
            >
              📱 Partager
            </button>
            <div className="flex items-center gap-6">
               <div className="text-center">
                  <div className="text-3xl font-bold text-valthera-300">{uniqueOwnedCount} / {totalPossible}</div>
                  <div className="text-xs text-valthera-500 uppercase tracking-wider">Cartes Uniques</div>
               </div>
               <div className="w-px h-12 bg-valthera-700"></div>
               <div className="text-center">
                  <div className="text-3xl font-bold text-valthera-400">{userCollection.length}</div>
                  <div className="text-xs text-valthera-500 uppercase tracking-wider">Total Cartes</div>
               </div>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-valthera-400 mb-1">
            <span>Progression de la collection</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-valthera-900 rounded-full h-2.5 overflow-hidden">
            <div className="bg-gradient-to-r from-valthera-500 to-valthera-400 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="animate-fade-in">
          <CollectionStats stats={collectionStats} />
        </div>
      )}

      {/* Search and Filters - Inline */}
      <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Rechercher une carte..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-valthera-800 border border-valthera-600 rounded-lg px-4 py-2 pl-10 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-valthera-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-valthera-800 border border-valthera-600 rounded-lg px-4 py-2 text-stone-200 focus:outline-none focus:border-valthera-500"
          >
            <option value="name-asc">Nom (A-Z)</option>
            <option value="name-desc">Nom (Z-A)</option>
            <option value="rarity-asc">Rareté ↑</option>
            <option value="rarity-desc">Rareté ↓</option>
            <option value="attack-desc">Attaque ↓</option>
            <option value="defense-desc">Défense ↓</option>
          </select>
        </div>

        {/* Quick Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.values(Rarity).map(rarity => (
            <button
              key={rarity}
              onClick={() => setSelectedRarities(prev => 
                prev.includes(rarity) ? prev.filter(r => r !== rarity) : [...prev, rarity]
              )}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                selectedRarities.includes(rarity)
                  ? 'bg-valthera-500 text-white'
                  : 'bg-valthera-800 text-stone-400 hover:bg-valthera-700'
              }`}
            >
              {rarity}
            </button>
          ))}
          
          {(selectedRarities.length > 0 || selectedTypes.length > 0 || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRarities([]);
                setSelectedTypes([]);
                setSelectedSeries([]);
              }}
              className="px-3 py-1 rounded-full text-xs bg-blood-600/30 text-blood-400 hover:bg-blood-600/50"
            >
              ✕ Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredCards.length === 0 ? (
         <div className="text-center py-20 text-valthera-500 bg-valthera-800/30 rounded-xl border border-valthera-700 border-dashed">
            Aucune carte ne correspond à ces critères.
         </div>
      ) : viewMode === 'carousel' ? (
        // Carousel View
        <CardCarousel
          cards={filteredCards.filter(card => ownedCardsMap.has(card.id))}
          onCardClick={(card) => setSelectedCard(card)}
        />
      ) : viewMode === 'list' ? (
        // List View
        <div className="space-y-3">
          {filteredCards.map(card => {
            const count = ownedCardsMap.get(card.id) || 0;
            const isOwned = count > 0;
            const series = allSeries.find(s => s.id === card.seriesId);

            return (
              <div 
                key={card.id} 
                className={`bg-valthera-800 rounded-xl p-4 border border-valthera-700 flex items-center gap-4 ${
                  isOwned ? 'cursor-pointer hover:bg-valthera-750 transition-colors' : 'opacity-40 grayscale'
                }`}
                onClick={() => isOwned && setSelectedCard(card)}
              >
                <div className="shrink-0 w-16 h-20 rounded-lg overflow-hidden border border-valthera-600">
                  <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-valthera-200 truncate">{card.name}</h3>
                    {card.title && <span className="text-valthera-400 text-sm">- {card.title}</span>}
                  </div>
                  <p className="text-valthera-500 text-sm truncate">{card.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-medium ${
                      card.rarity === Rarity.LEGENDARY ? 'text-amber-400' :
                      card.rarity === Rarity.EPIC ? 'text-purple-400' :
                      card.rarity === Rarity.RARE ? 'text-blue-400' :
                      card.rarity === Rarity.UNCOMMON ? 'text-green-400' :
                      'text-stone-400'
                    }`}>{card.rarity}</span>
                    <span className="text-valthera-600">•</span>
                    <span className="text-valthera-500 text-xs">{series?.name}</span>
                    <span className="text-valthera-600">•</span>
                    <span className="text-valthera-400 text-xs">⚔️ {card.attack} 🛡️ {card.defense}</span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {isOwned ? (
                    <>
                      <span className="bg-valthera-500 text-valthera-900 text-sm font-bold px-3 py-1 rounded-full">x{count}</span>
                      {favorites.includes(card.id) && <span className="text-red-400">❤️</span>}
                      {forTrade.includes(card.id) && <span className="text-emerald-400">🔄</span>}
                    </>
                  ) : (
                    <span className="text-valthera-600 text-sm">🔒</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Grid View
        <div className="grid gap-6 justify-items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredCards.map(card => {
            const count = ownedCardsMap.get(card.id) || 0;
            const isOwned = count > 0;

            return (
              <div key={card.id} className="relative flex flex-col items-center gap-2 h-full">
                <div 
                  className={`${isOwned ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-40 grayscale pointer-events-none'}`}
                  onClick={() => isOwned && setSelectedCard(card)}
                >
                   <CardView card={card} size="md" />
                </div>
                <div className="h-7 flex items-center justify-center">
                {isOwned ? (
                    <div className="flex items-center gap-2 min-w-[72px] justify-center">
                      <div className="bg-valthera-500 text-valthera-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-valthera-400">
                          x{count}
                      </div>
                      {favorites.includes(card.id) && <span className="text-red-400">❤️</span>}
                      {forTrade.includes(card.id) && <span className="text-emerald-400">🔄</span>}
                    </div>
                ) : (
                    <div className="text-xs text-valthera-600 font-medium py-1">🔒 Non acquise</div>
                )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          ownedCount={ownedCardsMap.get(selectedCard.id) || 0}
          onAddToFavorites={toggleFavorite}
          onMarkForTrade={toggleForTrade}
          isFavorite={favorites.includes(selectedCard.id)}
          isForTrade={forTrade.includes(selectedCard.id)}
        />
      )}

      {/* QR Code Share Modal */}
      <QRCodeShare isOpen={showQRCode} onClose={() => setShowQRCode(false)} />
    </div>
  );
};