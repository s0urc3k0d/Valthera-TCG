import React, { useState, useEffect } from 'react';
import { Card, Rarity, CardType } from '../types';

interface CardDetailProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  ownedCount?: number;
  onAddToFavorites?: (cardId: string) => void;
  onMarkForTrade?: (cardId: string) => void;
  isFavorite?: boolean;
  isForTrade?: boolean;
}

const rarityColors: Record<Rarity, { bg: string; border: string; text: string; glow: string }> = {
  [Rarity.COMMON]: { 
    bg: 'from-stone-700 to-stone-800', 
    border: 'border-stone-500',
    text: 'text-stone-400',
    glow: ''
  },
  [Rarity.UNCOMMON]: { 
    bg: 'from-emerald-800 to-emerald-900', 
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20'
  },
  [Rarity.RARE]: { 
    bg: 'from-blue-800 to-blue-900', 
    border: 'border-blue-500',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/30'
  },
  [Rarity.EPIC]: { 
    bg: 'from-purple-800 to-purple-900', 
    border: 'border-purple-500',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/40'
  },
  [Rarity.LEGENDARY]: { 
    bg: 'from-valthera-700 to-valthera-900', 
    border: 'border-valthera-400',
    text: 'text-valthera-400',
    glow: 'shadow-valthera-500/50'
  },
};

const typeIcons: Record<CardType, string> = {
  [CardType.CHARACTER]: '👤',
  [CardType.CREATURE]: '🐉',
  [CardType.LOCATION]: '🏰',
  [CardType.ITEM]: '⚔️',
  [CardType.EVENT]: '📜',
  [CardType.BOSS]: '💀',
};

const CardDetail: React.FC<CardDetailProps> = ({ 
  card, 
  isOpen, 
  onClose,
  ownedCount = 1,
  onAddToFavorites,
  onMarkForTrade,
  isFavorite = false,
  isForTrade = false
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsFlipped(false);
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const colors = rarityColors[card.rarity];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div 
        className={`relative max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl border ${colors.border} bg-gradient-to-b ${colors.bg} shadow-2xl ${colors.glow} ${isAnimating ? 'animate-card-reveal' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Card Image Side */}
          <div className="relative">
            {/* Card with flip animation */}
            <div 
              className={`relative aspect-[2.5/3.5] rounded-lg overflow-hidden cursor-pointer transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div 
                className="absolute inset-0 backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <img 
                  src={card.imageUrl || 'https://placehold.co/400x560/1a1a2e/d4af37?text=Valthera+TCG'} 
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
                {/* Overlay Effects */}
                {card.rarity === Rarity.LEGENDARY && (
                  <div className="absolute inset-0 bg-gradient-to-t from-valthera-600/20 via-transparent to-valthera-400/10 animate-pulse" />
                )}
              </div>
              
              {/* Back (Lore) */}
              <div 
                className="absolute inset-0 backface-hidden bg-valthera-900 flex items-center justify-center p-6 rotate-y-180"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-center">
                  <h4 className="font-medieval text-valthera-400 text-lg mb-4">Histoire</h4>
                  <p className="text-stone-300 italic leading-relaxed">
                    {card.lore || card.description}
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-center text-stone-500 text-sm mt-2">
              Cliquez sur la carte pour la retourner
            </p>

            {/* Rarity Badge */}
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full ${colors.text} bg-black/50 backdrop-blur-sm font-medieval text-sm`}>
              {card.rarity}
            </div>
          </div>

          {/* Card Info Side */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-stone-400 text-sm mb-1">
                <span>{typeIcons[card.cardType]}</span>
                <span>{card.cardType}</span>
              </div>
              <h2 className="font-medieval text-3xl text-stone-100">{card.name}</h2>
              {card.title && (
                <p className="text-valthera-400 italic mt-1">{card.title}</p>
              )}
            </div>

            {/* Stats */}
            {(card.attack > 0 || card.defense > 0) && (
              <div className="flex gap-4">
                <div className="bg-blood-900/50 border border-blood-700 rounded-lg px-4 py-3 text-center flex-1">
                  <div className="text-3xl font-bold text-blood-400">⚔️ {card.attack}</div>
                  <div className="text-xs text-stone-400 mt-1">Attaque</div>
                </div>
                <div className="bg-blue-900/50 border border-blue-700 rounded-lg px-4 py-3 text-center flex-1">
                  <div className="text-3xl font-bold text-blue-400">🛡️ {card.defense}</div>
                  <div className="text-xs text-stone-400 mt-1">Défense</div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-medieval text-valthera-400 text-lg mb-2">Description</h3>
              <p className="text-stone-300 leading-relaxed">{card.description}</p>
            </div>

            {/* Abilities */}
            {card.abilities && card.abilities.length > 0 && (
              <div>
                <h3 className="font-medieval text-valthera-400 text-lg mb-2">Capacités</h3>
                <div className="space-y-2">
                  {card.abilities.map((ability, index) => (
                    <div 
                      key={index}
                      className="bg-valthera-800/50 border border-valthera-700/30 rounded-lg px-4 py-2"
                    >
                      <span className="text-stone-300">{ability}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ownership Info */}
            <div className="bg-valthera-800/30 border border-valthera-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Exemplaires possédés</span>
                <span className="text-2xl font-bold text-valthera-400">{ownedCount}x</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {onAddToFavorites && (
                <button
                  onClick={() => onAddToFavorites(card.id)}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                    isFavorite
                      ? 'bg-valthera-600 border-valthera-500 text-white'
                      : 'bg-valthera-800 border-valthera-600 text-stone-300 hover:bg-valthera-700'
                  }`}
                >
                  <span>{isFavorite ? '❤️' : '🤍'}</span>
                  {isFavorite ? 'Favori' : 'Ajouter aux favoris'}
                </button>
              )}
              
              {onMarkForTrade && ownedCount > 1 && (
                <button
                  onClick={() => onMarkForTrade(card.id)}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                    isForTrade
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-valthera-800 border-valthera-600 text-stone-300 hover:bg-valthera-700'
                  }`}
                >
                  <span>🔄</span>
                  {isForTrade ? 'Proposé à l\'échange' : 'Proposer à l\'échange'}
                </button>
              )}
            </div>

            {/* Card ID */}
            <div className="text-center text-stone-600 text-xs font-mono">
              ID: {card.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
