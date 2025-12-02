import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import supabaseService from '../services/supabaseService';
import { CardView } from '../components/CardView';
import { Card, Rarity, Series, User } from '../types';
import CardDetail from '../components/CardDetail';

export const PublicCollection: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Load from Supabase
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cards, series] = await Promise.all([
          supabaseService.getCards(),
          supabaseService.getSeries(),
        ]);
        setAllCards(cards);
        setAllSeries(series);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadUserCollection = async () => {
      if (!shareId) {
        setError('Lien de partage invalide');
        setLoading(false);
        return;
      }

      try {
        // Décoder l'ID utilisateur depuis le shareId
        const userId = atob(shareId.replace(/-/g, '+').replace(/_/g, '/'));
        
        // Charger l'utilisateur depuis Supabase
        const foundUser = await supabaseService.getUserById(userId);
        
        if (foundUser) {
          // Charger la collection de l'utilisateur
          const collection = await supabaseService.getUserCollection(userId);
          setUser({ ...foundUser, collection });
        } else {
          setError('Collection introuvable');
        }
      } catch (err) {
        console.error('Error loading collection:', err);
        setError('Lien de partage invalide');
      }
      
      setLoading(false);
    };

    loadUserCollection();
  }, [shareId]);

  const ownedCardsMap = useMemo(() => {
    if (!user) return new Map<string, number>();
    const map = new Map<string, number>();
    user.collection.forEach(cardId => {
      map.set(cardId, (map.get(cardId) || 0) + 1);
    });
    return map;
  }, [user]);

  const ownedCards = useMemo(() => {
    return allCards.filter(c => ownedCardsMap.has(c.id));
  }, [allCards, ownedCardsMap]);

  const stats = useMemo(() => {
    if (!user) return null;
    
    const byRarity: Record<Rarity, number> = {
      [Rarity.COMMON]: 0,
      [Rarity.UNCOMMON]: 0,
      [Rarity.RARE]: 0,
      [Rarity.EPIC]: 0,
      [Rarity.LEGENDARY]: 0,
    };
    
    ownedCards.forEach(card => {
      byRarity[card.rarity]++;
    });

    return {
      total: user.collection.length,
      unique: ownedCardsMap.size,
      completion: Math.round((ownedCardsMap.size / allCards.length) * 100),
      byRarity,
    };
  }, [user, ownedCards, ownedCardsMap, allCards.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valthera-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-valthera-400">Chargement de la collection...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-valthera-800 p-8 rounded-2xl border border-valthera-700">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-medieval font-bold text-valthera-200 mb-2">Collection introuvable</h2>
          <p className="text-valthera-400">{error || 'Cette collection n\'existe pas ou a été supprimée.'}</p>
          <a
            href="#/"
            className="inline-block mt-6 px-6 py-3 bg-valthera-600 hover:bg-valthera-500 text-valthera-100 rounded-lg transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-valthera-800 to-valthera-900 rounded-2xl p-8 border border-valthera-700 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar - On affiche uniquement l'initiale du pseudo pour l'anonymat */}
          <div className="w-24 h-24 bg-gradient-to-br from-valthera-600 to-valthera-700 rounded-full flex items-center justify-center text-4xl font-medieval font-bold text-valthera-200 border-4 border-valthera-500 shadow-lg">
            {user.username?.charAt(0).toUpperCase() || '?'}
          </div>
          
          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-medieval font-bold text-valthera-200">
              Collection de {user.username}
            </h1>
            <p className="text-valthera-400 mt-1">
              Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-center">
            <div className="bg-valthera-900/50 px-6 py-4 rounded-xl border border-valthera-700">
              <div className="text-3xl font-bold text-valthera-200">{stats.unique}</div>
              <div className="text-xs text-valthera-500 uppercase tracking-wider">Cartes</div>
            </div>
            <div className="bg-valthera-900/50 px-6 py-4 rounded-xl border border-valthera-700">
              <div className="text-3xl font-bold text-valthera-300">{stats.completion}%</div>
              <div className="text-xs text-valthera-500 uppercase tracking-wider">Complétion</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-valthera-900 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-valthera-500 to-valthera-400 h-3 rounded-full transition-all duration-1000"
              style={{ width: `${stats.completion}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Rarity Stats */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(stats.byRarity).map(([rarity, count]) => {
          const colorClass = {
            [Rarity.COMMON]: 'border-stone-600 text-stone-400',
            [Rarity.UNCOMMON]: 'border-green-600 text-green-400',
            [Rarity.RARE]: 'border-blue-600 text-blue-400',
            [Rarity.EPIC]: 'border-purple-600 text-purple-400',
            [Rarity.LEGENDARY]: 'border-amber-500 text-amber-400',
          }[rarity as Rarity];

          return (
            <div key={rarity} className={`bg-valthera-800 rounded-xl p-4 border ${colorClass} text-center`}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs uppercase tracking-wider opacity-70">{rarity}</div>
            </div>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div>
        <h2 className="text-xl font-medieval font-bold text-valthera-200 mb-6">
          🃏 Cartes collectionnées ({stats.unique})
        </h2>
        
        {ownedCards.length === 0 ? (
          <div className="text-center py-20 bg-valthera-800/30 rounded-xl border border-valthera-700 border-dashed">
            <p className="text-valthera-500">Cette collection est vide pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
            {ownedCards.map(card => {
              const count = ownedCardsMap.get(card.id) || 0;

              return (
                <div key={card.id} className="relative flex flex-col items-center gap-2">
                  <div 
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setSelectedCard(card)}
                  >
                    <CardView card={card} size="md" />
                  </div>
                  <div className="bg-valthera-500 text-valthera-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-valthera-400">
                    x{count}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          ownedCount={ownedCardsMap.get(selectedCard.id) || 0}
        />
      )}

      {/* Footer CTA */}
      <div className="text-center py-8">
        <p className="text-valthera-400 mb-4">Envie de créer votre propre collection ?</p>
        <a
          href="#/"
          className="inline-block px-8 py-4 bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 rounded-lg font-bold transition-all shadow-lg"
        >
          🏰 Rejoindre Valthera TCG
        </a>
      </div>
    </div>
  );
};

export default PublicCollection;
