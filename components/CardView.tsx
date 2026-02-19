import React, { useState, useRef } from 'react';
import { Card, Rarity, CardType } from '../types';

interface CardViewProps {
  card: Card;
  isRevealed?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disableEffects?: boolean;
}

const rarityColors = {
  [Rarity.COMMON]: 'border-steel-400 shadow-steel-500/20',
  [Rarity.UNCOMMON]: 'border-green-500 shadow-green-500/30',
  [Rarity.RARE]: 'border-blue-500 shadow-blue-500/40',
  [Rarity.EPIC]: 'border-purple-500 shadow-purple-500/50 card-epic',
  [Rarity.LEGENDARY]: 'border-valthera-300 shadow-valthera-400/60 card-legendary',
};

const rarityText = {
  [Rarity.COMMON]: 'text-steel-400',
  [Rarity.UNCOMMON]: 'text-green-400',
  [Rarity.RARE]: 'text-blue-400',
  [Rarity.EPIC]: 'text-purple-400',
  [Rarity.LEGENDARY]: 'text-valthera-300',
};

const rarityBg = {
  [Rarity.COMMON]: 'bg-steel-600/20',
  [Rarity.UNCOMMON]: 'bg-green-600/20',
  [Rarity.RARE]: 'bg-blue-600/20',
  [Rarity.EPIC]: 'bg-purple-600/20',
  [Rarity.LEGENDARY]: 'bg-valthera-400/20',
};

const cardTypeIcons: Record<CardType, string> = {
  [CardType.CHARACTER]: '👤',
  [CardType.CREATURE]: '🐲',
  [CardType.LOCATION]: '🏔️',
  [CardType.ITEM]: '⚔️',
  [CardType.EVENT]: '📖',
  [CardType.BOSS]: '💀',
};

export const CardView: React.FC<CardViewProps> = ({ card, isRevealed = true, onClick, size = 'md', disableEffects = false }) => {
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    xs: 'w-24 h-36 text-[8px]',
    sm: 'w-36 h-52 text-xs',
    md: 'w-52 h-80',
    lg: 'w-72 h-[430px]',
  };

  const isSpecialRarity = card.rarity === Rarity.EPIC || card.rarity === Rarity.LEGENDARY;

  const handleMouseEnter = () => {
    if (!disableEffects && isSpecialRarity) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div 
      ref={cardRef}
      className={`relative group perspective-1000 cursor-pointer ${sizeClasses[size]}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`relative w-full h-full duration-700 card-preserve-3d transition-all ${isRevealed ? '' : 'rotate-y-180'}`}>
        {/* Front of Card */}
        <div className={`absolute w-full h-full bg-gradient-to-b from-valthera-800 to-valthera-900 border-2 rounded-xl overflow-hidden card-backface-hidden flex flex-col ${rarityColors[card.rarity]} shadow-xl`}>
          
          {/* Holographic overlay for Legendary */}
          {card.rarity === Rarity.LEGENDARY && !disableEffects && isHovering && (
            <div className="absolute inset-0 z-10 pointer-events-none holographic-overlay" />
          )}

          {/* Shimmer overlay for Epic */}
          {card.rarity === Rarity.EPIC && !disableEffects && isHovering && (
            <div className="absolute inset-0 z-10 pointer-events-none epic-shimmer" />
          )}

          {/* Rainbow sparkle effect for Legendary */}
          {card.rarity === Rarity.LEGENDARY && !disableEffects && isHovering && (
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
              <div className="sparkle-container">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="sparkle"
                    style={{
                      left: `${10 + (i * 12)}%`,
                      top: `${15 + ((i % 3) * 30)}%`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Card Header */}
          <div className="relative h-[45%] overflow-hidden border-b border-valthera-700">
             <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
             <div className="absolute inset-0 bg-gradient-to-t from-valthera-900/80 to-transparent"></div>
             
             {/* Type Badge */}
             <div className="absolute top-2 left-2 bg-valthera-900/80 px-2 py-1 rounded text-xs font-medium border border-valthera-700 flex items-center gap-1">
                <span>{cardTypeIcons[card.cardType]}</span>
                <span className="hidden sm:inline text-valthera-200">{card.cardType}</span>
             </div>
             
             {/* Stats Badge */}
             <div className="absolute top-2 right-2 bg-valthera-900/90 px-2 py-1 rounded text-xs font-bold border border-valthera-600 flex items-center gap-2">
                <span className="text-red-400">⚔️ {card.attack}</span>
                <span className="text-blue-400">🛡️ {card.defense}</span>
             </div>
          </div>
          
          {/* Card Body */}
          <div className={`flex-1 flex flex-col justify-between relative z-30 ${size === 'xs' ? 'p-1.5' : 'p-3'}`}>
            <div>
                <h3 className={`font-medieval font-bold uppercase tracking-wider line-clamp-2 ${rarityText[card.rarity]} ${
                size === 'xs' ? 'text-[8px] leading-tight' :
                size === 'sm' ? 'text-xs' : 'text-base'
              }`}>
                {card.name}
              </h3>
                {size !== 'xs' && (
                  <p className={`italic text-valthera-400 min-h-[16px] ${size === 'sm' ? 'text-[10px] line-clamp-1' : 'text-xs line-clamp-1'}`}>
                    {card.title || ' '}
                  </p>
                )}
              {size !== 'xs' && (
                <div className={`mt-1 ${rarityBg[card.rarity]} rounded px-2 py-0.5 inline-block`}>
                  <span className={`text-[10px] font-medium ${rarityText[card.rarity]}`}>{card.rarity}</span>
                </div>
              )}
              {size !== 'xs' && (
                  <p className={`text-valthera-200 mt-2 font-body leading-relaxed min-h-[38px] ${size === 'sm' ? 'text-[9px] leading-tight line-clamp-2' : 'text-xs line-clamp-3'}`}>
                  {card.description}
                </p>
              )}
              
              {/* Abilities */}
              {card.abilities && card.abilities.length > 0 && size !== 'sm' && size !== 'xs' && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.abilities.slice(0, 2).map((ability, idx) => (
                    <span key={idx} className="text-[10px] bg-valthera-700/50 text-valthera-300 px-2 py-0.5 rounded border border-valthera-600">
                      {ability}
                    </span>
                  ))}
                  {card.abilities.length > 2 && (
                    <span className="text-[10px] text-valthera-500">+{card.abilities.length - 2}</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {size !== 'xs' && (
              <div className="flex justify-between items-center text-[10px] text-valthera-500 border-t border-valthera-700 pt-2 mt-2">
                 <span className="truncate max-w-[60%]">#{card.id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Back of Card */}
        <div className="absolute w-full h-full bg-gradient-to-br from-valthera-800 to-valthera-900 rounded-xl card-backface-hidden rotate-y-180 border-2 border-valthera-400 flex items-center justify-center shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(circle, #C9A227 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
          </div>
          <div className="absolute inset-3 border-2 border-dashed border-valthera-500/30 rounded-lg"></div>
          <div className="text-center z-10">
            <div className="w-16 h-16 mx-auto mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="backShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#C9A227'}} />
                    <stop offset="100%" style={{stopColor:'#D4AF37'}} />
                  </linearGradient>
                </defs>
                <path d="M50 5 L90 20 L90 50 Q90 80 50 95 Q10 80 10 50 L10 20 Z" fill="url(#backShieldGrad)" opacity="0.8"/>
                <path d="M35 30 L50 70 L65 30 L58 30 L50 55 L42 30 Z" fill="#1A0F08"/>
              </svg>
            </div>
            <h2 className="text-xl font-medieval font-bold text-transparent bg-clip-text bg-gradient-to-r from-valthera-400 to-valthera-300 tracking-widest">VALTHERA</h2>
            <div className="w-12 h-0.5 bg-valthera-500 mx-auto mt-1 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};