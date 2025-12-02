import React, { useState, useEffect } from 'react';
import supabaseService from '../services/supabaseService';
import { CardView } from '../components/CardView';
import { Series, Card, CardType } from '../types';

export const SeriesBrowser = () => {
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [filterType, setFilterType] = useState<CardType | 'ALL'>('ALL');
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [series, cards] = await Promise.all([
          supabaseService.getSeries(),
          supabaseService.getCards(),
        ]);
        setAllSeries(series);
        setAllCards(cards);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSeriesClick = (series: Series) => {
    setSelectedSeries(series);
    setFilterType('ALL');
  };

  const handleBack = () => {
    setSelectedSeries(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valthera-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-valthera-400 font-medieval">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  if (selectedSeries) {
    const seriesCards = allCards.filter(c => {
      if (c.seriesId !== selectedSeries.id) return false;
      if (filterType !== 'ALL' && c.cardType !== filterType) return false;
      return true;
    });
    
    return (
      <div className="space-y-6 animate-fade-in">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-valthera-400 hover:text-valthera-300 transition-colors mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Retour aux campagnes
        </button>

        <div className="flex flex-col md:flex-row gap-8 items-start bg-valthera-800/50 p-6 rounded-2xl border border-valthera-700">
           <img src={selectedSeries.coverImage} alt={selectedSeries.name} className="w-full md:w-64 h-40 object-cover rounded-lg shadow-lg border border-valthera-600" />
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedSeries.isActive ? 'bg-forest-600/30 text-forest-500 border border-forest-600' : 'bg-valthera-700 text-valthera-400 border border-valthera-600'}`}>
                  {selectedSeries.isActive ? '🎭 Campagne en cours' : '📜 Campagne terminée'}
                </span>
              </div>
              <h1 className="text-4xl font-medieval font-bold text-valthera-200 mb-2">{selectedSeries.name}</h1>
              <p className="text-valthera-300 text-lg mb-2">{selectedSeries.description}</p>
              <p className="text-valthera-500 text-sm italic mb-4">{selectedSeries.setting}</p>
              <div className="inline-block bg-valthera-900 px-4 py-1 rounded-full text-sm text-valthera-300 border border-valthera-700">
                 ⚔️ {seriesCards.length} cartes dans cette campagne
              </div>
           </div>
        </div>

        {/* Filter by type */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'ALL' ? 'bg-valthera-500 text-valthera-900' : 'bg-valthera-800 text-valthera-300 hover:bg-valthera-700'}`}
          >
            Tous
          </button>
          {Object.values(CardType).map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === type ? 'bg-valthera-500 text-valthera-900' : 'bg-valthera-800 text-valthera-300 hover:bg-valthera-700'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center pt-4">
            {seriesCards.length > 0 ? (
                seriesCards.map(card => (
                    <div key={card.id} className="transition-transform hover:-translate-y-2">
                        <CardView card={card} size="md" />
                    </div>
                ))
            ) : (
                <div className="col-span-full text-valthera-500 py-10 text-center">Aucune carte disponible avec ces filtres.</div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="text-center space-y-4">
          <h1 className="text-4xl font-medieval font-bold text-valthera-200">📜 Campagnes de Valthera</h1>
          <p className="text-valthera-400 max-w-2xl mx-auto">Explorez les différentes campagnes de notre univers et découvrez les héros, créatures et artefacts qui ont marqué l'histoire de Valthera.</p>
       </div>

       {allSeries.length === 0 ? (
           <div className="text-center py-20 bg-valthera-800/30 rounded-xl border border-valthera-700 border-dashed">
               <p className="text-valthera-500">Aucune campagne n'a encore été publiée.</p>
               <p className="text-valthera-600 text-sm mt-2">Les administrateurs peuvent créer des campagnes depuis le panneau d'administration.</p>
           </div>
       ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {allSeries.map(series => {
                   const cardCount = allCards.filter(c => c.seriesId === series.id).length;
                   
                   return (
                   <div 
                     key={series.id} 
                     onClick={() => handleSeriesClick(series)}
                     className="group cursor-pointer bg-valthera-800 rounded-xl overflow-hidden border border-valthera-700 hover:border-valthera-500 hover:shadow-2xl hover:shadow-valthera-400/10 transition-all duration-300"
                   >
                       <div className="h-48 overflow-hidden relative">
                           <img src={series.coverImage} alt={series.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                           <div className="absolute inset-0 bg-gradient-to-t from-valthera-900 via-valthera-900/50 to-transparent"></div>
                           <div className="absolute top-4 right-4">
                             <span className={`px-2 py-1 rounded text-xs font-medium ${series.isActive ? 'bg-forest-600/80 text-white' : 'bg-valthera-700/80 text-valthera-300'}`}>
                               {series.isActive ? '🎭 En cours' : '📜 Terminée'}
                             </span>
                           </div>
                           <div className="absolute bottom-4 left-4 right-4">
                               <h3 className="text-2xl font-medieval font-bold text-valthera-100 group-hover:text-valthera-300 transition-colors">{series.name}</h3>
                           </div>
                       </div>
                       <div className="p-6">
                           <p className="text-valthera-400 line-clamp-2 text-sm mb-4">{series.description}</p>
                           <div className="flex justify-between items-center">
                               <span className="text-xs text-valthera-500">⚔️ {cardCount} cartes</span>
                               <span className="text-xs font-bold text-valthera-400 uppercase tracking-wider group-hover:text-valthera-300 flex items-center gap-1">
                                 Explorer
                                 <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                               </span>
                           </div>
                       </div>
                   </div>
               )})}
           </div>
       )}
    </div>
  );
};