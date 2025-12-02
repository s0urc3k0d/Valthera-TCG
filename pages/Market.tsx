import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import supabaseService from '../services/supabaseService';
import { CardView } from '../components/CardView';
import CardDetail from '../components/CardDetail';
import { Card, User, Rarity, Series, Trade, TradeStatus } from '../types';
import { Link } from 'react-router-dom';

interface MarketListing {
  user: User;
  card: Card;
  quantity: number;
}

type TabType = 'browse' | 'my-cards' | 'my-offers' | 'received' | 'history';

export const Market: React.FC = () => {
  const { user: currentUser, updateUser, isAuthenticated } = useAuth();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // Create trade modal
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [targetListing, setTargetListing] = useState<MarketListing | null>(null);
  const [selectedOfferedCards, setSelectedOfferedCards] = useState<string[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRarity, setFilterRarity] = useState<Rarity | 'ALL'>('ALL');
  const [filterSeries, setFilterSeries] = useState<string>('');

  // Data from Supabase
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [myCardsForTrade, setMyCardsForTrade] = useState<string[]>([]);
  
  // Load cards and series from Supabase
  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [cards, series] = await Promise.all([
          supabaseService.getCards(),
          supabaseService.getSeries(),
        ]);
        setAllCards(cards);
        setAllSeries(series);
      } catch (error) {
        console.error('Error loading base data:', error);
      }
    };
    loadBaseData();
  }, []);

  // Load my cards for trade
  useEffect(() => {
    const loadMyCardsForTrade = async () => {
      if (currentUser) {
        const cardsForTrade = await supabaseService.getCardsForTrade(currentUser.id);
        setMyCardsForTrade(cardsForTrade);
      }
    };
    loadMyCardsForTrade();
  }, [currentUser?.id]);

  // My tradeable cards
  const myTradeableCards = useMemo(() => {
    if (!currentUser) return [];
    // Get unique cards I own
    const ownedCardIds = new Set(currentUser.collection);
    return allCards.filter(card => ownedCardIds.has(card.id));
  }, [allCards, currentUser]);

  useEffect(() => {
    if (allCards.length > 0) {
      loadData();
    }
  }, [currentUser?.id, allCards.length]);

  const loadData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const [usersWithTrades, tradesData] = await Promise.all([
        supabaseService.getUsersWithCardsForTrade(),
        supabaseService.getTrades(currentUser.id),
      ]);
      
      // Build listings
      const allListings: MarketListing[] = [];
      for (const user of usersWithTrades) {
        if (user.id === currentUser.id) continue;
        
        const cardsForTrade = user.cardsForTrade || [];
        const cardCounts = new Map<string, number>();
        
        cardsForTrade.forEach(cardId => {
          cardCounts.set(cardId, (cardCounts.get(cardId) || 0) + 1);
        });
        
        cardCounts.forEach((quantity, cardId) => {
          const card = allCards.find(c => c.id === cardId);
          if (card) {
            allListings.push({ user, card, quantity });
          }
        });
      }
      
      setListings(allListings);
      setTrades(tradesData);
    } catch (error) {
      console.error('Error loading market data:', error);
      toast.error('Erreur', 'Impossible de charger le marché');
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      if (searchTerm && !listing.card.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterRarity !== 'ALL' && listing.card.rarity !== filterRarity) {
        return false;
      }
      if (filterSeries && listing.card.seriesId !== filterSeries) {
        return false;
      }
      return true;
    });
  }, [listings, searchTerm, filterRarity, filterSeries]);

  // Filter trades by tab
  const filteredTrades = useMemo(() => {
    if (!currentUser) return [];
    
    switch (activeTab) {
      case 'my-offers':
        return trades.filter(t => t.fromUserId === currentUser.id && t.status === TradeStatus.PENDING);
      case 'received':
        return trades.filter(t => t.toUserId === currentUser.id && t.status === TradeStatus.PENDING);
      case 'history':
        return trades.filter(t => t.status !== TradeStatus.PENDING);
      default:
        return [];
    }
  }, [trades, activeTab, currentUser]);

  const getCardById = (id: string) => allCards.find(c => c.id === id);

  const getRarityColor = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.LEGENDARY: return 'text-amber-400';
      case Rarity.EPIC: return 'text-purple-400';
      case Rarity.RARE: return 'text-blue-400';
      case Rarity.UNCOMMON: return 'text-green-400';
      default: return 'text-stone-400';
    }
  };

  // Trade actions
  const openTradeModal = (listing: MarketListing) => {
    setTargetListing(listing);
    setSelectedOfferedCards([]);
    setTradeMessage('');
    setShowTradeModal(true);
  };

  const createTrade = async () => {
    if (!currentUser || !targetListing || selectedOfferedCards.length === 0) {
      toast.warning('Attention', 'Sélectionnez au moins une carte à offrir');
      return;
    }

    try {
      const newTrade = await supabaseService.createTrade({
        fromUserId: currentUser.id,
        toUserId: targetListing.user.id,
        fromUsername: currentUser.username,
        toUsername: targetListing.user.username,
        status: TradeStatus.PENDING,
        offeredCards: selectedOfferedCards.map(id => ({ cardId: id, quantity: 1 })),
        requestedCards: [{ cardId: targetListing.card.id, quantity: 1 }],
        message: tradeMessage,
      });

      if (newTrade) {
        setTrades(prev => [...prev, newTrade]);
        toast.success('Proposition envoyée !', `${targetListing.user.username} a reçu votre offre`);
        setShowTradeModal(false);
        setTargetListing(null);
      }
    } catch (error) {
      console.error('Error creating trade:', error);
      toast.error('Erreur', 'Impossible de créer l\'échange');
    }
  };

  const acceptTrade = async (trade: Trade) => {
    if (!currentUser) return;

    try {
      await supabaseService.updateTradeStatus(trade.id, TradeStatus.ACCEPTED);

      // Exchange cards
      const myNewCollection = currentUser.collection
        .filter(id => !trade.requestedCards.some(tc => tc.cardId === id))
        .concat(trade.offeredCards.map(tc => tc.cardId));

      await updateUser({ ...currentUser, collection: myNewCollection });

      setTrades(prev => prev.map(t => 
        t.id === trade.id ? { ...t, status: TradeStatus.ACCEPTED } : t
      ));

      toast.success('Échange accepté !', 'Les cartes ont été échangées');
    } catch (error) {
      console.error('Error accepting trade:', error);
      toast.error('Erreur', 'Impossible d\'accepter l\'échange');
    }
  };

  const rejectTrade = async (trade: Trade) => {
    try {
      await supabaseService.updateTradeStatus(trade.id, TradeStatus.REJECTED);
      
      setTrades(prev => prev.map(t => 
        t.id === trade.id ? { ...t, status: TradeStatus.REJECTED } : t
      ));

      toast.info('Échange refusé', 'La proposition a été déclinée');
    } catch (error) {
      console.error('Error rejecting trade:', error);
      toast.error('Erreur', 'Impossible de refuser l\'échange');
    }
  };

  const cancelTrade = async (trade: Trade) => {
    try {
      await supabaseService.updateTradeStatus(trade.id, TradeStatus.CANCELLED);
      
      setTrades(prev => prev.map(t => 
        t.id === trade.id ? { ...t, status: TradeStatus.CANCELLED } : t
      ));

      toast.info('Échange annulé', 'Votre proposition a été annulée');
    } catch (error) {
      console.error('Error cancelling trade:', error);
      toast.error('Erreur', 'Impossible d\'annuler l\'échange');
    }
  };

  // Counts for tabs
  const pendingSentCount = trades.filter(t => t.fromUserId === currentUser?.id && t.status === TradeStatus.PENDING).length;
  const pendingReceivedCount = trades.filter(t => t.toUserId === currentUser?.id && t.status === TradeStatus.PENDING).length;
  const historyCount = trades.filter(t => t.status !== TradeStatus.PENDING).length;
  const myCardsCount = myCardsForTrade.length;

  // Remove card from trade
  const removeFromTrade = async (cardId: string) => {
    if (!currentUser) return;
    
    const newCardsForTrade = myCardsForTrade.filter(id => id !== cardId);
    setMyCardsForTrade(newCardsForTrade);
    await supabaseService.updateCardsForTrade(currentUser.id, newCardsForTrade);
    toast.success('Carte retirée', 'La carte n\'est plus disponible à l\'échange');
    // Reload market data to update listings
    loadData();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-valthera-800 p-8 rounded-2xl border border-valthera-700">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-2xl font-medieval font-bold text-valthera-200 mb-2">Marché</h2>
          <p className="text-valthera-400 mb-6">Connectez-vous pour accéder au marché</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-valthera-600 hover:bg-valthera-500 text-valthera-100 rounded-lg transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-valthera-800 to-valthera-900 rounded-2xl p-6 border border-valthera-700">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medieval font-bold text-valthera-200 flex items-center gap-3">
              🏪 Marché
            </h1>
            <p className="text-valthera-400 mt-1">
              Échangez vos cartes avec d'autres joueurs
            </p>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-valthera-300">{listings.length}</div>
              <div className="text-valthera-500 text-xs">cartes dispo</div>
            </div>
            <div className="h-10 w-px bg-valthera-700"></div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{pendingReceivedCount}</div>
              <div className="text-valthera-500 text-xs">offres reçues</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'browse' as TabType, label: '🛒 Marché', count: listings.length },
          { id: 'my-cards' as TabType, label: '🏷️ Mes cartes', count: myCardsCount },
          { id: 'my-offers' as TabType, label: '📤 Offres envoyées', count: pendingSentCount },
          { id: 'received' as TabType, label: '📥 Reçues', count: pendingReceivedCount },
          { id: 'history' as TabType, label: '📜 Historique', count: historyCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-valthera-600 text-white shadow-lg'
                : 'bg-valthera-800/50 text-valthera-400 hover:bg-valthera-700/50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-valthera-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-valthera-800 rounded-xl p-4 border border-valthera-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-valthera-400 mb-1">Rechercher</label>
                <input
                  type="text"
                  placeholder="Nom de la carte..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-2 text-valthera-100 placeholder-valthera-600"
                />
              </div>
              <div>
                <label className="block text-sm text-valthera-400 mb-1">Rareté</label>
                <select
                  value={filterRarity}
                  onChange={e => setFilterRarity(e.target.value as Rarity | 'ALL')}
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-2 text-valthera-100"
                >
                  <option value="ALL">Toutes</option>
                  {Object.values(Rarity).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-valthera-400 mb-1">Campagne</label>
                <select
                  value={filterSeries}
                  onChange={e => setFilterSeries(e.target.value)}
                  className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-2 text-valthera-100"
                >
                  <option value="">Toutes</option>
                  {allSeries.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Listings */}
          {loading ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-valthera-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-valthera-400">Chargement du marché...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-20 bg-valthera-800/30 rounded-xl border border-valthera-700 border-dashed">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-medieval text-valthera-300 mb-2">Aucune carte disponible</h3>
              <p className="text-valthera-500">
                {listings.length === 0 
                  ? "Personne n'a encore proposé de cartes à l'échange"
                  : "Aucune carte ne correspond à vos filtres"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredListings.map((listing, index) => (
                <div 
                  key={`${listing.user.id}-${listing.card.id}-${index}`}
                  className="bg-valthera-800 rounded-xl p-3 border border-valthera-700 flex flex-col items-center gap-2 hover:border-valthera-500 transition-colors group"
                >
                  <div 
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setSelectedCard(listing.card)}
                  >
                    <CardView card={listing.card} size="sm" />
                  </div>
                  
                  <div className="w-full text-center">
                    <h3 className="text-xs font-bold text-valthera-200 truncate">{listing.card.name}</h3>
                    <p className={`text-xs ${getRarityColor(listing.card.rarity)}`}>
                      {listing.card.rarity}
                    </p>
                  </div>

                  <div className="w-full pt-2 border-t border-valthera-700">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-valthera-400 truncate">
                        {listing.user.username}
                      </span>
                      <span className="bg-valthera-600/50 text-valthera-200 px-1.5 py-0.5 rounded">
                        x{listing.quantity}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => openTradeModal(listing)}
                      className="w-full px-2 py-1.5 bg-valthera-600 hover:bg-valthera-500 text-valthera-100 rounded text-xs font-medium transition-colors"
                    >
                      🔄 Proposer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info banner */}
          <div className="bg-valthera-800/50 rounded-xl p-4 border border-valthera-700 text-center">
            <p className="text-valthera-400 text-sm">
              💡 Pour proposer vos cartes, allez dans votre{' '}
              <Link to="/collection" className="text-valthera-300 hover:text-valthera-200 underline">
                collection
              </Link>
              {' '}et marquez-les comme "À échanger" (🔄)
            </p>
          </div>
        </div>
      )}

      {/* My Cards Tab */}
      {activeTab === 'my-cards' && (
        <div className="space-y-6">
          {myCardsForTrade.length === 0 ? (
            <div className="text-center py-20 bg-valthera-800/30 rounded-xl border border-valthera-700 border-dashed">
              <div className="text-5xl mb-4">🏷️</div>
              <h3 className="text-xl font-medieval text-valthera-300 mb-2">Aucune carte en vente</h3>
              <p className="text-valthera-500 mb-4">
                Vous n'avez pas encore mis de cartes à disposition pour l'échange.
              </p>
              <Link 
                to="/collection" 
                className="inline-block px-6 py-3 bg-valthera-600 hover:bg-valthera-500 text-valthera-100 rounded-lg transition-colors"
              >
                📚 Aller à ma collection
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-valthera-800/50 rounded-xl p-4 border border-valthera-700">
                <p className="text-valthera-400 text-sm text-center">
                  🔄 Vous avez <strong className="text-valthera-200">{myCardsForTrade.length}</strong> carte{myCardsForTrade.length > 1 ? 's' : ''} disponible{myCardsForTrade.length > 1 ? 's' : ''} à l'échange
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {myCardsForTrade.map((cardId, index) => {
                  const card = allCards.find(c => c.id === cardId);
                  if (!card) return null;
                  
                  return (
                    <div 
                      key={`${cardId}-${index}`}
                      className="bg-valthera-800 rounded-xl p-3 border border-valthera-700 flex flex-col items-center gap-2"
                    >
                      <div 
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setSelectedCard(card)}
                      >
                        <CardView card={card} size="sm" />
                      </div>
                      
                      <div className="w-full text-center">
                        <h3 className="text-xs font-bold text-valthera-200 truncate">{card.name}</h3>
                        <p className={`text-xs ${getRarityColor(card.rarity)}`}>
                          {card.rarity}
                        </p>
                      </div>

                      <button
                        onClick={() => removeFromTrade(cardId)}
                        className="w-full px-2 py-1.5 bg-blood-600/30 hover:bg-blood-600/50 text-blood-400 rounded text-xs font-medium transition-colors"
                      >
                        ❌ Retirer
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Trade Lists */}
      {(activeTab === 'my-offers' || activeTab === 'received' || activeTab === 'history') && (
        <div className="bg-valthera-800/30 rounded-xl border border-valthera-700/50 p-6">
          {filteredTrades.length === 0 ? (
            <p className="text-valthera-500 text-center py-8">
              {activeTab === 'my-offers' && "Vous n'avez pas d'offres en cours"}
              {activeTab === 'received' && "Aucune proposition reçue"}
              {activeTab === 'history' && "Aucun échange dans l'historique"}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredTrades.map(trade => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  currentUserId={currentUser?.id || ''}
                  getCard={getCardById}
                  onAccept={() => acceptTrade(trade)}
                  onReject={() => rejectTrade(trade)}
                  onCancel={() => cancelTrade(trade)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          ownedCount={0}
        />
      )}

      {/* Create Trade Modal */}
      {showTradeModal && targetListing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowTradeModal(false)}>
          <div 
            className="bg-valthera-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-valthera-600"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-valthera-700 flex items-center justify-between">
              <h3 className="text-xl font-medieval font-bold text-valthera-200">
                Proposer un échange
              </h3>
              <button 
                onClick={() => setShowTradeModal(false)}
                className="p-2 text-valthera-400 hover:text-valthera-200"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Target card */}
              <div className="bg-valthera-800/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-valthera-400 mb-3">Vous demandez :</p>
                <div className="flex items-center gap-4">
                  <CardView card={targetListing.card} size="sm" />
                  <div>
                    <h4 className="font-bold text-valthera-200">{targetListing.card.name}</h4>
                    <p className={`text-sm ${getRarityColor(targetListing.card.rarity)}`}>
                      {targetListing.card.rarity}
                    </p>
                    <p className="text-valthera-500 text-sm mt-1">
                      De <span className="text-valthera-300">{targetListing.user.username}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* My cards to offer */}
              <div className="mb-6">
                <p className="text-sm text-valthera-400 mb-3 flex items-center gap-2">
                  Vos cartes à offrir :
                  {selectedOfferedCards.length > 0 && (
                    <span className="bg-valthera-600 px-2 py-0.5 rounded text-xs text-white">
                      {selectedOfferedCards.length} sélectionnée{selectedOfferedCards.length > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                
                {myTradeableCards.length === 0 ? (
                  <p className="text-valthera-500 text-center py-4">Vous n'avez pas de cartes à proposer</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto bg-valthera-800/30 rounded-lg p-2">
                    {myTradeableCards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => {
                          setSelectedOfferedCards(prev => 
                            prev.includes(card.id)
                              ? prev.filter(id => id !== card.id)
                              : [...prev, card.id]
                          );
                        }}
                        className={`p-1 rounded transition-all ${
                          selectedOfferedCards.includes(card.id)
                            ? 'ring-2 ring-valthera-400 bg-valthera-700/50'
                            : 'hover:bg-valthera-700/30'
                        }`}
                      >
                        <CardView card={card} size="sm" disableEffects />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-valthera-400 mb-2">Message (optionnel)</label>
                <textarea
                  value={tradeMessage}
                  onChange={(e) => setTradeMessage(e.target.value)}
                  placeholder="Ajoutez un message..."
                  className="w-full bg-valthera-800/50 border border-valthera-700 rounded-lg p-3 text-valthera-200 placeholder-valthera-600 focus:border-valthera-500 focus:outline-none resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-4 border-t border-valthera-700 flex justify-end gap-3">
              <button
                onClick={() => setShowTradeModal(false)}
                className="px-4 py-2 bg-valthera-800 text-valthera-300 rounded-lg hover:bg-valthera-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createTrade}
                disabled={selectedOfferedCards.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-valthera-600 to-valthera-500 text-white rounded-lg hover:from-valthera-500 hover:to-valthera-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Envoyer la proposition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// TradeCard Component
interface TradeCardProps {
  trade: Trade;
  currentUserId: string;
  getCard: (id: string) => Card | undefined;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade, currentUserId, getCard, onAccept, onReject, onCancel }) => {
  const isReceived = trade.toUserId === currentUserId;
  const isPending = trade.status === TradeStatus.PENDING;

  const statusColors = {
    [TradeStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    [TradeStatus.ACCEPTED]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [TradeStatus.REJECTED]: 'bg-red-500/20 text-red-400 border-red-500/30',
    [TradeStatus.CANCELLED]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const statusLabels = {
    [TradeStatus.PENDING]: '⏳ En attente',
    [TradeStatus.ACCEPTED]: '✅ Accepté',
    [TradeStatus.REJECTED]: '❌ Refusé',
    [TradeStatus.CANCELLED]: '🚫 Annulé',
  };

  return (
    <div className="bg-valthera-900/50 rounded-lg border border-valthera-700/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isReceived ? '📥' : '📤'}</span>
          <div>
            <p className="text-valthera-200">
              {isReceived ? (
                <>De <span className="font-bold text-valthera-300">{trade.fromUsername}</span></>
              ) : (
                <>À <span className="font-bold text-valthera-300">{trade.toUsername}</span></>
              )}
            </p>
            <p className="text-xs text-valthera-500">
              {new Date(trade.createdAt).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm border ${statusColors[trade.status]}`}>
          {statusLabels[trade.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-valthera-500 mb-2">
            {isReceived ? 'Vous recevez :' : 'Vous offrez :'}
          </p>
          <div className="flex flex-wrap gap-2">
            {trade.offeredCards.map(item => {
              const card = getCard(item.cardId);
              return card ? (
                <div key={item.cardId} className="w-20">
                  <CardView card={card} size="sm" disableEffects />
                </div>
              ) : null;
            })}
          </div>
        </div>

        <div>
          <p className="text-sm text-valthera-500 mb-2">
            {isReceived ? 'Vous donnez :' : 'Vous demandez :'}
          </p>
          <div className="flex flex-wrap gap-2">
            {trade.requestedCards.map(item => {
              const card = getCard(item.cardId);
              return card ? (
                <div key={item.cardId} className="w-20">
                  <CardView card={card} size="sm" disableEffects />
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {trade.message && (
        <div className="bg-valthera-800/50 rounded p-3 mb-4">
          <p className="text-sm text-valthera-300 italic">"{trade.message}"</p>
        </div>
      )}

      {isPending && (
        <div className="flex gap-2 justify-end">
          {isReceived ? (
            <>
              <button
                onClick={onReject}
                className="px-4 py-2 bg-blood-600/30 text-blood-400 rounded hover:bg-blood-600/50 transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={onAccept}
                className="px-4 py-2 bg-forest-600 text-white rounded hover:bg-forest-500 transition-colors"
              >
                Accepter
              </button>
            </>
          ) : (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-valthera-700 text-valthera-300 rounded hover:bg-valthera-600 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Market;
