import React from 'react';
import { Card, Rarity, CardType, CollectionStats as Stats } from '../types';

interface CollectionStatsProps {
  stats: Stats;
  isCompact?: boolean;
}

const rarityColors: Record<Rarity, string> = {
  [Rarity.COMMON]: 'bg-stone-500',
  [Rarity.UNCOMMON]: 'bg-emerald-500',
  [Rarity.RARE]: 'bg-blue-500',
  [Rarity.EPIC]: 'bg-purple-500',
  [Rarity.LEGENDARY]: 'bg-valthera-500',
};

const rarityLabels: Record<Rarity, string> = {
  [Rarity.COMMON]: 'Communes',
  [Rarity.UNCOMMON]: 'Peu communes',
  [Rarity.RARE]: 'Rares',
  [Rarity.EPIC]: 'Épiques',
  [Rarity.LEGENDARY]: 'Légendaires',
};

const typeLabels: Record<CardType, string> = {
  [CardType.CHARACTER]: 'Personnages',
  [CardType.CREATURE]: 'Créatures',
  [CardType.LOCATION]: 'Lieux',
  [CardType.ITEM]: 'Objets',
  [CardType.EVENT]: 'Événements',
  [CardType.BOSS]: 'Boss',
};

const typeIcons: Record<CardType, string> = {
  [CardType.CHARACTER]: '👤',
  [CardType.CREATURE]: '🐉',
  [CardType.LOCATION]: '🏰',
  [CardType.ITEM]: '⚔️',
  [CardType.EVENT]: '📜',
  [CardType.BOSS]: '💀',
};

const CollectionStats: React.FC<CollectionStatsProps> = ({ stats, isCompact = false }) => {
  if (isCompact) {
    return (
      <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medieval text-valthera-400">Ma Collection</h3>
          <span className="text-2xl font-bold text-valthera-300">
            {stats.completionPercentage.toFixed(1)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-3 bg-valthera-800 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-valthera-600 to-valthera-400 transition-all duration-500"
            style={{ width: `${stats.completionPercentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-stone-400">
          <span>{stats.uniqueCards} cartes uniques</span>
          <span>{stats.totalCards} au total</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-6">
        <h3 className="font-medieval text-xl text-valthera-400 mb-4">Vue d'ensemble</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            label="Cartes totales" 
            value={stats.totalCards} 
            icon="📦"
          />
          <StatCard 
            label="Cartes uniques" 
            value={stats.uniqueCards} 
            icon="🃏"
          />
          <StatCard 
            label="Collection complète" 
            value={`${stats.completionPercentage.toFixed(1)}%`} 
            icon="📊"
            highlight
          />
          <StatCard 
            label="Cartes manquantes" 
            value={stats.totalPossible - stats.uniqueCards} 
            icon="❓"
          />
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Progression globale</span>
            <span className="text-valthera-400 font-medium">
              {stats.uniqueCards} / {stats.totalPossible}
            </span>
          </div>
          <div className="h-4 bg-valthera-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-valthera-600 via-valthera-500 to-valthera-400 transition-all duration-500"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* By Rarity */}
      <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-6">
        <h3 className="font-medieval text-xl text-valthera-400 mb-4">Par Rareté</h3>
        
        <div className="space-y-4">
          {Object.values(Rarity).map(rarity => {
            const data = stats.byRarity[rarity];
            const percentage = data.total > 0 ? (data.owned / data.total) * 100 : 0;
            
            return (
              <div key={rarity} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-300">{rarityLabels[rarity]}</span>
                  <span className="text-stone-400">
                    {data.owned} / {data.total}
                  </span>
                </div>
                <div className="h-2 bg-valthera-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${rarityColors[rarity]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Type */}
      <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-6">
        <h3 className="font-medieval text-xl text-valthera-400 mb-4">Par Type</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.values(CardType).map(type => {
            const data = stats.byType[type];
            const percentage = data.total > 0 ? (data.owned / data.total) * 100 : 0;
            
            return (
              <div 
                key={type} 
                className="bg-valthera-800/50 rounded-lg p-4 border border-valthera-700/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{typeIcons[type]}</span>
                  <span className="text-stone-300 font-medium">{typeLabels[type]}</span>
                </div>
                <div className="text-2xl font-bold text-valthera-400 mb-1">
                  {data.owned}<span className="text-sm text-stone-500">/{data.total}</span>
                </div>
                <div className="h-1.5 bg-valthera-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-valthera-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Series */}
      {Object.keys(stats.bySeries).length > 0 && (
        <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-6">
          <h3 className="font-medieval text-xl text-valthera-400 mb-4">Par Campagne</h3>
          
          <div className="space-y-4">
            {Object.entries(stats.bySeries).map(([seriesId, data]) => {
              const seriesData = data as { owned: number; total: number; name: string };
              const percentage = seriesData.total > 0 ? (seriesData.owned / seriesData.total) * 100 : 0;
              
              return (
                <div key={seriesId} className="bg-valthera-800/30 rounded-lg p-4 border border-valthera-700/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-stone-200 font-medieval">{seriesData.name}</span>
                    <span className={`text-sm font-medium ${
                      percentage === 100 ? 'text-emerald-400' : 'text-valthera-400'
                    }`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-400 mb-2">
                    <span>{seriesData.owned} / {seriesData.total} cartes</span>
                    {percentage === 100 && <span className="text-emerald-400">✓ Complète</span>}
                  </div>
                  <div className="h-2 bg-valthera-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        percentage === 100 
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                          : 'bg-valthera-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Cards */}
      {stats.recentCards.length > 0 && (
        <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-6">
          <h3 className="font-medieval text-xl text-valthera-400 mb-4">Récemment obtenues</h3>
          <div className="flex flex-wrap gap-2">
            {stats.recentCards.slice(0, 5).map(card => (
              <div 
                key={card.id}
                className="bg-valthera-800/50 border border-valthera-700/30 rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <span className={`w-2 h-2 rounded-full ${rarityColors[card.rarity]}`} />
                <span className="text-stone-300 text-sm">{card.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rarest Cards */}
      {stats.rarestCards.length > 0 && (
        <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-6">
          <h3 className="font-medieval text-xl text-valthera-400 mb-4">Cartes les plus rares</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.rarestCards.slice(0, 5).map(card => (
              <div 
                key={card.id}
                className={`rounded-lg p-3 border text-center ${
                  card.rarity === Rarity.LEGENDARY 
                    ? 'bg-gradient-to-b from-valthera-900/80 to-valthera-800/50 border-valthera-500' 
                    : card.rarity === Rarity.EPIC
                    ? 'bg-gradient-to-b from-purple-900/50 to-valthera-800/50 border-purple-500'
                    : 'bg-valthera-800/50 border-valthera-700/30'
                }`}
              >
                <div className="text-3xl mb-2">
                  {card.rarity === Rarity.LEGENDARY ? '🌟' : card.rarity === Rarity.EPIC ? '💎' : '✨'}
                </div>
                <div className="text-stone-200 text-sm font-medium truncate">{card.name}</div>
                <div className={`text-xs mt-1 ${
                  card.rarity === Rarity.LEGENDARY ? 'text-valthera-400' : 'text-purple-400'
                }`}>
                  {card.rarity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for stat cards
interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, highlight }) => (
  <div className={`rounded-lg p-4 text-center ${
    highlight 
      ? 'bg-gradient-to-br from-valthera-700/50 to-valthera-800/50 border border-valthera-500/50' 
      : 'bg-valthera-800/50 border border-valthera-700/30'
  }`}>
    <div className="text-2xl mb-1">{icon}</div>
    <div className={`text-2xl font-bold ${highlight ? 'text-valthera-400' : 'text-stone-200'}`}>
      {value}
    </div>
    <div className="text-xs text-stone-500 mt-1">{label}</div>
  </div>
);

export default CollectionStats;
