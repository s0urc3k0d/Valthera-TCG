import React, { useState, useEffect, useCallback } from 'react';
import { Card, Rarity, CardType } from '../types';

interface LocalCardFilters {
  search: string;
  rarities: Rarity[];
  types: CardType[];
  series: string[];
  minAttack?: number;
  maxAttack?: number;
  minDefense?: number;
  maxDefense?: number;
}

type LocalSortOption = 'name-asc' | 'name-desc' | 'rarity-asc' | 'rarity-desc' | 'attack-asc' | 'attack-desc' | 'defense-asc' | 'defense-desc' | 'recent';

interface SearchFiltersProps {
  cards: Card[];
  onFilterChange: (filteredCards: Card[]) => void;
  showSeriesFilter?: boolean;
  seriesOptions?: { id: string; name: string }[];
}

const defaultFilters: LocalCardFilters = {
  search: '',
  rarities: [],
  types: [],
  series: [],
  minAttack: undefined,
  maxAttack: undefined,
  minDefense: undefined,
  maxDefense: undefined,
};

const sortOptions: { value: LocalSortOption; label: string }[] = [
  { value: 'name-asc', label: 'Nom (A-Z)' },
  { value: 'name-desc', label: 'Nom (Z-A)' },
  { value: 'rarity-asc', label: 'Rareté (Commune → Légendaire)' },
  { value: 'rarity-desc', label: 'Rareté (Légendaire → Commune)' },
  { value: 'attack-asc', label: 'Attaque (croissant)' },
  { value: 'attack-desc', label: 'Attaque (décroissant)' },
  { value: 'defense-asc', label: 'Défense (croissant)' },
  { value: 'defense-desc', label: 'Défense (décroissant)' },
  { value: 'recent', label: 'Plus récentes' },
];

const rarityOrder: Record<Rarity, number> = {
  [Rarity.COMMON]: 1,
  [Rarity.UNCOMMON]: 2,
  [Rarity.RARE]: 3,
  [Rarity.EPIC]: 4,
  [Rarity.LEGENDARY]: 5,
};

const rarityLabels: Record<Rarity, string> = {
  [Rarity.COMMON]: 'Commune',
  [Rarity.UNCOMMON]: 'Peu commune',
  [Rarity.RARE]: 'Rare',
  [Rarity.EPIC]: 'Épique',
  [Rarity.LEGENDARY]: 'Légendaire',
};

const typeLabels: Record<CardType, string> = {
  [CardType.CHARACTER]: 'Personnage',
  [CardType.CREATURE]: 'Créature',
  [CardType.LOCATION]: 'Lieu',
  [CardType.ITEM]: 'Objet',
  [CardType.EVENT]: 'Événement',
  [CardType.BOSS]: 'Boss',
};

const SearchFilters: React.FC<SearchFiltersProps> = ({ 
  cards, 
  onFilterChange,
  showSeriesFilter = false,
  seriesOptions = []
}) => {
  const [filters, setFilters] = useState<LocalCardFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<LocalSortOption>('name-asc');
  const [isExpanded, setIsExpanded] = useState(false);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...cards];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(card => 
        card.name.toLowerCase().includes(search) ||
        card.description.toLowerCase().includes(search) ||
        card.abilities?.some(a => a.toLowerCase().includes(search))
      );
    }

    // Rarity filter
    if (filters.rarities && filters.rarities.length > 0) {
      result = result.filter(card => filters.rarities!.includes(card.rarity));
    }

    // Type filter
    if (filters.types && filters.types.length > 0) {
      result = result.filter(card => filters.types!.includes(card.cardType));
    }

    // Series filter
    if (filters.series && filters.series.length > 0) {
      result = result.filter(card => filters.series!.includes(card.seriesId));
    }

    // Attack filter
    if (filters.minAttack !== undefined) {
      result = result.filter(card => (card.attack || 0) >= filters.minAttack!);
    }
    if (filters.maxAttack !== undefined) {
      result = result.filter(card => (card.attack || 0) <= filters.maxAttack!);
    }

    // Defense filter
    if (filters.minDefense !== undefined) {
      result = result.filter(card => (card.defense || 0) >= filters.minDefense!);
    }
    if (filters.maxDefense !== undefined) {
      result = result.filter(card => (card.defense || 0) <= filters.maxDefense!);
    }

    // Sorting
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
        case 'recent':
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          break;
        default:
          comparison = 0;
      }

      return direction === 'desc' ? -comparison : comparison;
    });

    onFilterChange(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, filters, sortBy]);

  const toggleRarity = (rarity: Rarity) => {
    setFilters(prev => ({
      ...prev,
      rarities: prev.rarities?.includes(rarity)
        ? prev.rarities.filter(r => r !== rarity)
        : [...(prev.rarities || []), rarity]
    }));
  };

  const toggleType = (type: CardType) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types?.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...(prev.types || []), type]
    }));
  };

  const toggleSeries = (seriesId: string) => {
    setFilters(prev => ({
      ...prev,
      series: prev.series?.includes(seriesId)
        ? prev.series.filter(s => s !== seriesId)
        : [...(prev.series || []), seriesId]
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSortBy('name-asc');
  };

  const hasActiveFilters = 
    filters.search ||
    (filters.rarities && filters.rarities.length > 0) ||
    (filters.types && filters.types.length > 0) ||
    (filters.series && filters.series.length > 0) ||
    filters.minAttack !== undefined ||
    filters.maxAttack !== undefined ||
    filters.minDefense !== undefined ||
    filters.maxDefense !== undefined;

  return (
    <div className="bg-valthera-900/50 border border-valthera-700/50 rounded-lg p-4 mb-6">
      {/* Search and Sort Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Rechercher une carte..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full bg-valthera-800 border border-valthera-600 rounded-lg px-4 py-2 pl-10 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-valthera-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as LocalSortOption)}
            className="bg-valthera-800 border border-valthera-600 rounded-lg px-4 py-2 text-stone-200 focus:outline-none focus:border-valthera-500"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              isExpanded || hasActiveFilters
                ? 'bg-valthera-600 border-valthera-500 text-white'
                : 'bg-valthera-800 border-valthera-600 text-stone-300 hover:bg-valthera-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtres
            {hasActiveFilters && (
              <span className="bg-valthera-400 text-valthera-900 text-xs font-bold px-1.5 rounded">
                {(filters.rarities?.length || 0) + (filters.types?.length || 0) + (filters.series?.length || 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="border-t border-valthera-700/50 pt-4 space-y-4 animate-fade-in">
          {/* Rarity Filter */}
          <div>
            <label className="block text-sm font-medieval text-valthera-400 mb-2">Raretés</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(Rarity).map(rarity => (
                <button
                  key={rarity}
                  onClick={() => toggleRarity(rarity)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.rarities?.includes(rarity)
                      ? 'bg-valthera-500 text-white'
                      : 'bg-valthera-800 text-stone-400 hover:bg-valthera-700'
                  }`}
                >
                  {rarityLabels[rarity]}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medieval text-valthera-400 mb-2">Types</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(CardType).map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.types?.includes(type)
                      ? 'bg-valthera-500 text-white'
                      : 'bg-valthera-800 text-stone-400 hover:bg-valthera-700'
                  }`}
                >
                  {typeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Series Filter */}
          {showSeriesFilter && seriesOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medieval text-valthera-400 mb-2">Campagnes</label>
              <div className="flex flex-wrap gap-2">
                {seriesOptions.map(series => (
                  <button
                    key={series.id}
                    onClick={() => toggleSeries(series.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.series?.includes(series.id)
                        ? 'bg-valthera-500 text-white'
                        : 'bg-valthera-800 text-stone-400 hover:bg-valthera-700'
                    }`}
                  >
                    {series.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stat Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attack */}
            <div>
              <label className="block text-sm font-medieval text-valthera-400 mb-2">Attaque</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.minAttack ?? ''}
                  onChange={e => setFilters(prev => ({ ...prev, minAttack: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-20 bg-valthera-800 border border-valthera-600 rounded px-2 py-1 text-stone-200 text-sm"
                />
                <span className="text-stone-500">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.maxAttack ?? ''}
                  onChange={e => setFilters(prev => ({ ...prev, maxAttack: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-20 bg-valthera-800 border border-valthera-600 rounded px-2 py-1 text-stone-200 text-sm"
                />
              </div>
            </div>

            {/* Defense */}
            <div>
              <label className="block text-sm font-medieval text-valthera-400 mb-2">Défense</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.minDefense ?? ''}
                  onChange={e => setFilters(prev => ({ ...prev, minDefense: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-20 bg-valthera-800 border border-valthera-600 rounded px-2 py-1 text-stone-200 text-sm"
                />
                <span className="text-stone-500">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.maxDefense ?? ''}
                  onChange={e => setFilters(prev => ({ ...prev, maxDefense: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-20 bg-valthera-800 border border-valthera-600 rounded px-2 py-1 text-stone-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={resetFilters}
                className="text-valthera-400 hover:text-valthera-300 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
