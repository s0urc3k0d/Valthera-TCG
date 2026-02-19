import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Rarity, Series } from '../types';
import supabaseService from '../services/apiService';
import { CardView } from '../components/CardView';
import CardDetail from '../components/CardDetail';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../contexts/AuthContext';

type Stage = 'LOCKED' | 'READY' | 'OPENING' | 'PACK_BURST' | 'REVEALED';

// Configuration des boosters
const BOOSTER_CONFIG = {
  INTERVAL_HOURS: 6,      // Un booster toutes les 6h
  MAX_STORED: 2,          // Maximum 2 boosters stockés
  CARDS_PER_BOOSTER: 5,   // 5 cartes par booster
};

// Calculer le nombre de boosters accumulés depuis la dernière ouverture
const calculateAvailableBoosters = (lastBoosterDate: string | null, currentBoosters: number = 0): number => {
  if (!lastBoosterDate) {
    // Nouvel utilisateur = 1 booster de bienvenue
    return Math.min(1, BOOSTER_CONFIG.MAX_STORED);
  }
  
  const lastOpened = new Date(lastBoosterDate);
  const now = new Date();
  const hoursSinceLastBooster = (now.getTime() - lastOpened.getTime()) / (1000 * 60 * 60);
  
  // Calculer combien de nouveaux boosters ont été générés
  const newBoosters = Math.floor(hoursSinceLastBooster / BOOSTER_CONFIG.INTERVAL_HOURS);
  
  // Total = boosters actuels + nouveaux, plafonné au max
  return Math.min(currentBoosters + newBoosters, BOOSTER_CONFIG.MAX_STORED);
};

// Calculer le temps jusqu'au prochain booster
const getTimeUntilNextBooster = (lastBoosterDate: string | null): Date => {
  const now = new Date();
  
  if (!lastBoosterDate) {
    return now; // Disponible immédiatement
  }
  
  const lastOpened = new Date(lastBoosterDate);
  const nextBoosterTime = new Date(lastOpened.getTime() + BOOSTER_CONFIG.INTERVAL_HOURS * 60 * 60 * 1000);
  
  return nextBoosterTime > now ? nextBoosterTime : now;
};

// Formater le temps restant
const formatTimeRemaining = (targetDate: Date): string => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) return "Disponible !";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const BoosterOpening: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [stage, setStage] = useState<Stage>('READY');
  const [cards, setCards] = useState<Card[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [availableBoosters, setAvailableBoosters] = useState<number>(0);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const isOpeningRef = useRef(false);
  const toast = useToast();

  // Data from Supabase
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Load series and cards from Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
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
        setLoadingData(false);
      }
    };
    loadData();
  }, []);
  
  const selectedSeries = useMemo(() => 
    allSeries.find(s => s.id === selectedSeriesId), 
    [allSeries, selectedSeriesId]
  );

  // Nombre de cartes disponibles pour la campagne sélectionnée
  const availableCardsCount = useMemo(() => {
    if (selectedSeriesId) {
      return allCards.filter(c => c.seriesId === selectedSeriesId).length;
    }
    return allCards.length;
  }, [allCards, selectedSeriesId]);

  // Calculer et mettre à jour les boosters disponibles
  useEffect(() => {
    if (!user) return;
    
    const updateBoosters = () => {
      const calculatedBoosters = calculateAvailableBoosters(
        user.lastBoosterDate, 
        user.availableBoosters || 0
      );
      setAvailableBoosters(calculatedBoosters);
      
      if (calculatedBoosters > 0) {
        if (stage === 'LOCKED') {
          setStage('READY');
        }
      } else {
        if (stage !== 'OPENING' && stage !== 'PACK_BURST' && stage !== 'REVEALED') {
          setStage('LOCKED');
        }
        setTimeRemaining(formatTimeRemaining(getTimeUntilNextBooster(user.lastBoosterDate)));
      }
    };
    
    updateBoosters();
    
    // Timer pour mettre à jour le countdown et vérifier les nouveaux boosters
    const interval = setInterval(updateBoosters, 1000);
    return () => clearInterval(interval);
  }, [user, stage]);

  const openBooster = async () => {
    if (stage !== 'READY' || !user || isOpeningRef.current || availableBoosters <= 0) return;
    
    // Empêcher les doubles clics
    isOpeningRef.current = true;
    
    setStage('OPENING');
    setCards([]);
    setRevealedIndices([]);
    
    // Animation d'ouverture du pack (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Générer les cartes (avec campagne si sélectionnée)
    const newCards = await supabaseService.getBooster(BOOSTER_CONFIG.CARDS_PER_BOOSTER, selectedSeriesId || undefined);
    setCards(newCards);
    setStage('PACK_BURST');
    
    // Effet d'éclatement (800ms)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setStage('REVEALED');
    
    // Révéler les cartes une par une
    for (let i = 0; i < newCards.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRevealedIndices(prev => [...prev, i]);
    }
    
    // Sauvegarder en base
    try {
      const now = new Date().toISOString();
      const newAvailableBoosters = availableBoosters - 1;
      
      const updatedUser = {
        ...user,
        lastBoosterDate: now,
        availableBoosters: newAvailableBoosters,
        collection: [...user.collection, ...newCards.map(c => c.id)]
      };
      
      await updateUser(updatedUser);
      setAvailableBoosters(newAvailableBoosters);
      
      toast.success('Booster ouvert !', `${newCards.length} nouvelles cartes ajoutées à votre collection.`);
      
      // Toasts pour les cartes rares
      const rareCards = newCards.filter(c => 
        c.rarity === Rarity.LEGENDARY || c.rarity === Rarity.EPIC || c.rarity === Rarity.RARE
      );
      
      for (let i = 0; i < rareCards.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        const card = rareCards[i];
        if (card.rarity === Rarity.LEGENDARY) {
          toast.rareCard(card.name, 'Légendaire');
        } else if (card.rarity === Rarity.EPIC) {
          toast.rareCard(card.name, 'Épique');
        } else if (card.rarity === Rarity.RARE) {
          toast.rareCard(card.name, 'Rare');
        }
      }
      
      // Si plus de boosters, le prochain sera LOCKED
    } catch (error) {
      console.error('Failed to save collection:', error);
      toast.error('Erreur', 'Impossible de sauvegarder les cartes.');
    }
    
    isOpeningRef.current = false;
  };

  const revealAll = () => {
    setRevealedIndices(cards.map((_, i) => i));
  };

  const openAnotherBooster = () => {
    if (availableBoosters > 0) {
      setStage('READY');
      setCards([]);
      setRevealedIndices([]);
    } else {
      setStage('LOCKED');
    }
  };

  // Loading state
  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-valthera-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-valthera-400 font-medieval">Chargement...</p>
        </div>
      </div>
    );
  }

  // Écran de verrouillage avec countdown
  if (stage === 'LOCKED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-40 h-40 bg-valthera-800 rounded-2xl flex flex-col items-center justify-center opacity-70 border border-valthera-700 shadow-lg">
          <svg className="w-16 h-16 text-valthera-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-2xl font-mono font-bold text-valthera-300">{timeRemaining}</span>
        </div>
        <h2 className="text-2xl font-medieval font-bold text-valthera-400">Prochain booster dans</h2>
        <p className="text-valthera-500">Un nouveau booster est disponible toutes les <strong className="text-valthera-400">{BOOSTER_CONFIG.INTERVAL_HOURS}h</strong></p>
        <div className="bg-valthera-800/50 rounded-lg p-4 border border-valthera-700/50 max-w-md space-y-2">
          <p className="text-valthera-400 text-sm">
            💡 <strong>Système de rétention :</strong> Vous pouvez accumuler jusqu'à <strong className="text-valthera-300">{BOOSTER_CONFIG.MAX_STORED} boosters</strong> maximum.
          </p>
          <p className="text-valthera-500 text-xs">
            Si vous manquez un booster, il sera mis de côté pour plus tard !
          </p>
        </div>
      </div>
    );
  }

  // Écran prêt à ouvrir
  if (stage === 'READY') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        {/* Indicateur de boosters disponibles */}
        <div className="flex items-center gap-4 bg-valthera-800/80 px-6 py-3 rounded-full border border-valthera-600">
          <span className="text-valthera-400">Boosters disponibles :</span>
          <div className="flex gap-2">
            {[...Array(BOOSTER_CONFIG.MAX_STORED)].map((_, i) => (
              <div 
                key={i}
                className={`w-8 h-10 rounded-lg border-2 transition-all ${
                  i < availableBoosters 
                    ? 'bg-gradient-to-b from-valthera-500 to-valthera-600 border-valthera-400 shadow-lg shadow-valthera-500/30' 
                    : 'bg-valthera-900 border-valthera-700 opacity-40'
                }`}
              >
                {i < availableBoosters && (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-valthera-200">
                    📦
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-2xl font-bold text-valthera-300">{availableBoosters}/{BOOSTER_CONFIG.MAX_STORED}</span>
        </div>

        {/* Sélecteur de campagne */}
        <div className="w-full max-w-md bg-valthera-800/80 rounded-xl p-6 border border-valthera-700 shadow-lg">
          <label className="block text-sm text-valthera-300 mb-2 font-medium">
            🏰 Choisir une campagne (optionnel)
          </label>
          <select
            value={selectedSeriesId}
            onChange={e => setSelectedSeriesId(e.target.value)}
            className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none"
          >
            <option value="">🎲 Toutes les campagnes (aléatoire)</option>
            {allSeries.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? '✨' : ''}
              </option>
            ))}
          </select>
          {selectedSeries && (
            <div className="mt-3 p-3 bg-valthera-900/50 rounded-lg border border-valthera-700/50">
              <p className="text-valthera-400 text-sm">{selectedSeries.description}</p>
              <p className="text-valthera-500 text-xs mt-2">
                📦 {availableCardsCount} cartes disponibles dans cette campagne
              </p>
            </div>
          )}
          {!selectedSeriesId && (
            <p className="text-valthera-500 text-xs mt-2">
              📦 {availableCardsCount} cartes disponibles au total
            </p>
          )}
        </div>

        <div 
          onClick={openBooster}
          className="relative w-64 h-96 bg-gradient-to-br from-valthera-700 via-valthera-800 to-valthera-900 rounded-xl shadow-[0_0_50px_rgba(212,175,55,0.3)] border-2 border-valthera-400 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 animate-float"
        >
           {/* Pack Design */}
           <div className="absolute inset-0 opacity-30 rounded-xl overflow-hidden">
             <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(circle, #C9A227 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
           </div>
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-valthera-400/10 to-transparent animate-shine bg-[length:200%_100%] rounded-xl"></div>
           
           {/* Shield Logo */}
           <div className="z-10 mb-2">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-20 h-20">
               <defs>
                 <linearGradient id="boosterShield" x1="0%" y1="0%" x2="100%" y2="100%">
                   <stop offset="0%" style={{stopColor:'#C9A227'}} />
                   <stop offset="100%" style={{stopColor:'#D4AF37'}} />
                 </linearGradient>
               </defs>
               <path d="M50 5 L90 20 L90 50 Q90 80 50 95 Q10 80 10 50 L10 20 Z" fill="url(#boosterShield)" opacity="0.9"/>
               <path d="M35 30 L50 70 L65 30 L58 30 L50 55 L42 30 Z" fill="#1A0F08"/>
             </svg>
           </div>
           
           <h1 className="text-3xl font-medieval font-bold text-transparent bg-clip-text bg-gradient-to-r from-valthera-300 to-valthera-400 tracking-widest drop-shadow-lg z-10">VALTHERA</h1>
           <span className="text-valthera-400 uppercase tracking-[0.3em] text-xs mt-1 z-10">Booster Pack</span>
           <div className="absolute bottom-8 text-xs text-valthera-300/70 border border-valthera-500/30 px-3 py-1 rounded-full z-10">
             ⚔️ {BOOSTER_CONFIG.CARDS_PER_BOOSTER} Cartes
           </div>
        </div>
        
        <button 
           onClick={openBooster}
           className="px-8 py-4 bg-gradient-to-r from-valthera-400 to-valthera-500 text-valthera-900 font-medieval font-bold rounded-lg text-xl shadow-lg hover:from-valthera-300 hover:to-valthera-400 transition-all"
        >
          📦 OUVRIR LE BOOSTER
        </button>

        {/* Info temps si pas encore au max */}
        {availableBoosters < BOOSTER_CONFIG.MAX_STORED && (
          <p className="text-valthera-500 text-sm">
            ⏰ Prochain booster dans : <span className="text-valthera-400 font-mono">{timeRemaining}</span>
          </p>
        )}
      </div>
    );
  }

  // Animation d'ouverture
  if (stage === 'OPENING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12">
        <div className="relative w-64 h-96 bg-gradient-to-br from-valthera-700 via-valthera-800 to-valthera-900 rounded-xl shadow-[0_0_80px_rgba(212,175,55,0.5)] border-2 border-valthera-400 flex flex-col items-center justify-center animate-shake">
           <div className="absolute inset-0 opacity-30 rounded-xl overflow-hidden">
             <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(circle, #C9A227 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
           </div>
           
           <div className="z-10 mb-2">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-20 h-20 animate-pulse">
               <defs>
                 <linearGradient id="boosterShield2" x1="0%" y1="0%" x2="100%" y2="100%">
                   <stop offset="0%" style={{stopColor:'#C9A227'}} />
                   <stop offset="100%" style={{stopColor:'#D4AF37'}} />
                 </linearGradient>
               </defs>
               <path d="M50 5 L90 20 L90 50 Q90 80 50 95 Q10 80 10 50 L10 20 Z" fill="url(#boosterShield2)" opacity="0.9"/>
               <path d="M35 30 L50 70 L65 30 L58 30 L50 55 L42 30 Z" fill="#1A0F08"/>
             </svg>
           </div>
           
           <h1 className="text-3xl font-medieval font-bold text-transparent bg-clip-text bg-gradient-to-r from-valthera-300 to-valthera-400 tracking-widest drop-shadow-lg z-10">VALTHERA</h1>
        </div>
        
        <p className="text-valthera-400 text-xl animate-pulse">⏳ Ouverture en cours...</p>
      </div>
    );
  }

  // Animation d'éclatement du pack
  if (stage === 'PACK_BURST') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="relative flex items-center justify-center">
          {/* Cercles d'éclatement */}
          <div className="absolute w-96 h-96 bg-valthera-400/20 rounded-full animate-ping"></div>
          <div className="absolute w-72 h-72 bg-valthera-300/30 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
          <div className="absolute w-48 h-48 bg-valthera-200/40 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
          
          {/* Texte central */}
          <div className="relative z-10 text-center">
            <h2 className="text-5xl font-medieval font-bold text-valthera-300 animate-pulse drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]">
              ✨ {cards.length} Cartes ! ✨
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // Révélation des cartes
  return (
    <div className="space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-medieval font-bold text-valthera-200">⚔️ Vos Nouvelles Cartes !</h2>
        <p className="text-valthera-400 text-sm">Cliquez sur une carte pour voir ses détails</p>
        {revealedIndices.length < cards.length && (
          <button 
            onClick={revealAll}
            className="text-sm text-valthera-400 hover:text-valthera-300 underline"
          >
            Tout révéler
          </button>
        )}
      </div>

      {/* Grille des 5 cartes */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8">
        {cards.map((card, index) => {
          const isRevealed = revealedIndices.includes(index);
          
          return (
            <div 
              key={`${card.id}-${index}`} 
              className={`transform transition-all duration-500 ${
                isRevealed 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-30 translate-y-4 scale-95'
              }`}
              onClick={() => isRevealed && setSelectedCard(card)}
            >
              <div className={`relative ${isRevealed ? 'cursor-pointer hover:scale-110 transition-transform duration-300' : ''}`}>
                {/* Effet de brillance pour les cartes rares */}
                {isRevealed && (card.rarity === Rarity.LEGENDARY || card.rarity === Rarity.EPIC) && (
                  <div className={`absolute -inset-3 rounded-xl blur-md animate-pulse ${
                    card.rarity === Rarity.LEGENDARY ? 'bg-amber-400/50' : 'bg-purple-500/50'
                  }`}></div>
                )}
                
                {/* La carte */}
                <div className="relative">
                  <CardView 
                    card={card} 
                    size="md"
                  />
                </div>
                
                {/* Badge de rareté */}
                {isRevealed && (
                  <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg whitespace-nowrap border ${
                    card.rarity === Rarity.LEGENDARY ? 'bg-amber-500 text-amber-900 border-amber-300' :
                    card.rarity === Rarity.EPIC ? 'bg-purple-600 text-purple-100 border-purple-400' :
                    card.rarity === Rarity.RARE ? 'bg-blue-600 text-blue-100 border-blue-400' :
                    card.rarity === Rarity.UNCOMMON ? 'bg-green-600 text-green-100 border-green-400' :
                    'bg-stone-600 text-stone-100 border-stone-400'
                  }`}>
                    {card.rarity === Rarity.LEGENDARY ? '⭐ LÉGENDAIRE' :
                     card.rarity === Rarity.EPIC ? '💎 ÉPIQUE' :
                     card.rarity === Rarity.RARE ? '💠 RARE' :
                     card.rarity === Rarity.UNCOMMON ? '🔹 PEU COMMUNE' :
                     '○ COMMUNE'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Message si pas encore de cartes */}
      {cards.length === 0 && (
        <div className="text-center py-20">
          <p className="text-valthera-500">Chargement des cartes...</p>
        </div>
      )}

      {/* Résumé après révélation complète */}
      {cards.length > 0 && revealedIndices.length === cards.length && (
        <div className="text-center mt-12 animate-fade-in">
          <div className="inline-block bg-valthera-800/90 rounded-xl p-8 border border-valthera-600 shadow-2xl">
            <p className="text-valthera-300 text-lg mb-6">
              🎉 <strong>{cards.length} cartes</strong> ajoutées à votre collection !
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {availableBoosters > 0 && (
                <button
                  onClick={openAnotherBooster}
                  className="px-8 py-4 bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 rounded-lg transition-all font-bold text-lg shadow-lg"
                >
                  📦 Ouvrir un autre booster ({availableBoosters} restant{availableBoosters > 1 ? 's' : ''})
                </button>
              )}
              <a 
                href="#/collection"
                className="inline-block px-8 py-4 bg-valthera-700 hover:bg-valthera-600 text-valthera-100 rounded-lg transition-all font-bold text-lg shadow-lg border border-valthera-600"
              >
                📚 Voir ma collection
              </a>
            </div>
            
            {availableBoosters === 0 && (
              <p className="text-valthera-500 text-sm mt-4">
                ⏰ Prochain booster dans : <span className="text-valthera-400 font-mono">{timeRemaining}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && user && (
        <CardDetail
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          ownedCount={user.collection.filter(id => id === selectedCard.id).length}
        />
      )}
    </div>
  );
};