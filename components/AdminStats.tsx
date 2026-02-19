import React, { useMemo, useState, useEffect } from 'react';
import supabaseService from '../services/apiService';
import { Rarity, CardType, User, Card, Series } from '../types';

interface AdminStatsProps {
  users: User[];
}

export const AdminStats: React.FC<AdminStatsProps> = ({ users }) => {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [userCollections, setUserCollections] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Load cards, series and real user collections
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [cards, series, collections] = await Promise.all([
          supabaseService.getCards(),
          supabaseService.getSeries(),
          Promise.all(
            users.map(async (user) => {
              const collection = await supabaseService.getUserCollection(user.id);
              return [user.id, collection] as const;
            })
          ),
        ]);

        const mappedCollections = collections.reduce<Record<string, string[]>>((acc, [userId, collection]) => {
          acc[userId] = collection;
          return acc;
        }, {});

        setAllCards(cards);
        setAllSeries(series);
        setUserCollections(mappedCollections);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [users]);

  // Statistiques globales
  const stats = useMemo(() => {
    // Cartes les plus collectionnées
    const cardPopularity = new Map<string, number>();
    users.forEach(user => {
      const collection = userCollections[user.id] || [];
      collection.forEach(cardId => {
        cardPopularity.set(cardId, (cardPopularity.get(cardId) || 0) + 1);
      });
    });

    const popularCards = [...cardPopularity.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cardId, count]) => ({
        card: allCards.find(c => c.id === cardId),
        count,
      }))
      .filter(item => item.card);

    // Cartes les plus rares (moins collectionnées parmi les légendaires/épiques)
    const rareCards = allCards
      .filter(c => c.rarity === Rarity.LEGENDARY || c.rarity === Rarity.EPIC)
      .map(card => ({
        card,
        count: cardPopularity.get(card.id) || 0,
      }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 5);

    // Campagnes par popularité
    const seriesPopularity = allSeries.map(series => {
      const seriesCards = allCards.filter(c => c.seriesId === series.id);
      let totalCollected = 0;
      seriesCards.forEach(card => {
        totalCollected += cardPopularity.get(card.id) || 0;
      });
      return {
        series,
        cardsCount: seriesCards.length,
        totalCollected,
        avgPerUser: users.length > 0 ? (totalCollected / users.length).toFixed(1) : '0',
      };
    }).sort((a, b) => b.totalCollected - a.totalCollected);

    // Répartition par rareté dans les collections
    const rarityDistribution: Record<Rarity, number> = {
      [Rarity.COMMON]: 0,
      [Rarity.UNCOMMON]: 0,
      [Rarity.RARE]: 0,
      [Rarity.EPIC]: 0,
      [Rarity.LEGENDARY]: 0,
    };

    users.forEach(user => {
      const collection = userCollections[user.id] || [];
      collection.forEach(cardId => {
        const card = allCards.find(c => c.id === cardId);
        if (card) {
          rarityDistribution[card.rarity]++;
        }
      });
    });

    // Activité récente (utilisateurs actifs cette semaine)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const activeUsers = users.filter(u => {
      if (!u.lastBoosterDate) return false;
      return new Date(u.lastBoosterDate) > oneWeekAgo;
    }).length;

    // Total cartes dans toutes les collections
    const totalCardsCollected = users.reduce((sum, user) => sum + (userCollections[user.id]?.length || 0), 0);

    // Moyenne de cartes par utilisateur
    const avgCardsPerUser = users.length > 0 
      ? (totalCardsCollected / users.length).toFixed(1) 
      : '0';

    return {
      totalUsers: users.length,
      activeUsers,
      totalCards: allCards.length,
      totalSeries: allSeries.length,
      totalCardsCollected,
      avgCardsPerUser,
      popularCards,
      rareCards,
      seriesPopularity,
      rarityDistribution,
    };
  }, [users, allCards, allSeries, userCollections]);

  const getRarityColor = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.LEGENDARY: return 'text-amber-400 bg-amber-600/20 border-amber-600/30';
      case Rarity.EPIC: return 'text-purple-400 bg-purple-600/20 border-purple-600/30';
      case Rarity.RARE: return 'text-blue-400 bg-blue-600/20 border-blue-600/30';
      case Rarity.UNCOMMON: return 'text-green-400 bg-green-600/20 border-green-600/30';
      default: return 'text-stone-400 bg-stone-600/20 border-stone-600/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-valthera-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-valthera-400">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <div className="text-3xl font-bold text-valthera-200">{stats.totalUsers}</div>
          <div className="text-valthera-400 text-sm mt-1">Joueurs inscrits</div>
          <div className="text-forest-400 text-xs mt-2">
            🟢 {stats.activeUsers} actifs cette semaine
          </div>
        </div>
        
        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <div className="text-3xl font-bold text-valthera-300">{stats.totalCardsCollected}</div>
          <div className="text-valthera-400 text-sm mt-1">Cartes collectionnées</div>
          <div className="text-valthera-500 text-xs mt-2">
            📊 Moyenne: {stats.avgCardsPerUser}/joueur
          </div>
        </div>

        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <div className="text-3xl font-bold text-valthera-400">{stats.totalCards}</div>
          <div className="text-valthera-400 text-sm mt-1">Cartes disponibles</div>
          <div className="text-valthera-500 text-xs mt-2">
            🃏 Dans {stats.totalSeries} campagne(s)
          </div>
        </div>

        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <div className="text-3xl font-bold text-amber-400">
            {stats.rarityDistribution[Rarity.LEGENDARY]}
          </div>
          <div className="text-valthera-400 text-sm mt-1">Légendaires obtenues</div>
          <div className="text-purple-400 text-xs mt-2">
            💎 {stats.rarityDistribution[Rarity.EPIC]} Épiques
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par rareté */}
        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <h3 className="text-lg font-bold text-valthera-200 mb-4">📊 Répartition par rareté</h3>
          <div className="space-y-3">
            {Object.entries(stats.rarityDistribution).map(([rarity, count]) => {
              const total = (Object.values(stats.rarityDistribution) as number[]).reduce((a, b) => a + b, 0);
              const countNum = count as number;
              const percentage = total > 0 ? (countNum / total) * 100 : 0;
              
              return (
                <div key={rarity}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={getRarityColor(rarity as Rarity).split(' ')[0]}>{rarity}</span>
                    <span className="text-valthera-400">{countNum} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-valthera-900 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        rarity === Rarity.LEGENDARY ? 'bg-amber-500' :
                        rarity === Rarity.EPIC ? 'bg-purple-500' :
                        rarity === Rarity.RARE ? 'bg-blue-500' :
                        rarity === Rarity.UNCOMMON ? 'bg-green-500' :
                        'bg-stone-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campagnes populaires */}
        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <h3 className="text-lg font-bold text-valthera-200 mb-4">🏰 Campagnes populaires</h3>
          <div className="space-y-3">
            {stats.seriesPopularity.map((item, index) => (
              <div 
                key={item.series.id}
                className="flex items-center gap-3 p-3 bg-valthera-900/50 rounded-lg border border-valthera-700"
              >
                <div className="text-xl font-bold text-valthera-500 w-6">#{index + 1}</div>
                <div className="flex-1">
                  <div className="font-medium text-valthera-200">{item.series.name}</div>
                  <div className="text-xs text-valthera-500">
                    {item.cardsCount} cartes • {item.totalCollected} collectées
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-valthera-300 font-medium">{item.avgPerUser}</div>
                  <div className="text-xs text-valthera-500">moy./joueur</div>
                </div>
              </div>
            ))}
            {stats.seriesPopularity.length === 0 && (
              <p className="text-valthera-500 text-center py-4">Aucune campagne</p>
            )}
          </div>
        </div>
      </div>

      {/* Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartes les plus populaires */}
        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <h3 className="text-lg font-bold text-valthera-200 mb-4">🔥 Cartes les plus collectionnées</h3>
          <div className="space-y-2">
            {stats.popularCards.map((item, index) => (
              <div 
                key={item.card?.id}
                className="flex items-center gap-3 p-3 bg-valthera-900/50 rounded-lg border border-valthera-700"
              >
                <div className="text-lg font-bold text-valthera-500 w-6">#{index + 1}</div>
                <img 
                  src={item.card?.imageUrl} 
                  alt={item.card?.name} 
                  className="w-10 h-14 object-cover rounded border border-valthera-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-valthera-200">{item.card?.name}</div>
                  <div className={`text-xs ${getRarityColor(item.card?.rarity as Rarity).split(' ')[0]}`}>
                    {item.card?.rarity}
                  </div>
                </div>
                <div className="bg-valthera-600 text-valthera-100 px-3 py-1 rounded-full text-sm font-bold">
                  {item.count}x
                </div>
              </div>
            ))}
            {stats.popularCards.length === 0 && (
              <p className="text-valthera-500 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>

        {/* Cartes les plus rares */}
        <div className="bg-valthera-800 rounded-xl p-6 border border-valthera-700">
          <h3 className="text-lg font-bold text-valthera-200 mb-4">💎 Cartes les plus rares (moins collectionnées)</h3>
          <div className="space-y-2">
            {stats.rareCards.map((item, index) => (
              <div 
                key={item.card.id}
                className="flex items-center gap-3 p-3 bg-valthera-900/50 rounded-lg border border-valthera-700"
              >
                <div className="text-lg font-bold text-valthera-500 w-6">#{index + 1}</div>
                <img 
                  src={item.card.imageUrl} 
                  alt={item.card.name} 
                  className="w-10 h-14 object-cover rounded border border-valthera-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-valthera-200">{item.card.name}</div>
                  <div className={`text-xs ${getRarityColor(item.card.rarity).split(' ')[0]}`}>
                    {item.card.rarity}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  item.count === 0 
                    ? 'bg-blood-600/20 text-blood-400' 
                    : 'bg-valthera-700 text-valthera-300'
                }`}>
                  {item.count === 0 ? 'Aucun' : `${item.count}x`}
                </div>
              </div>
            ))}
            {stats.rareCards.length === 0 && (
              <p className="text-valthera-500 text-center py-4">Aucune carte rare/légendaire</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
