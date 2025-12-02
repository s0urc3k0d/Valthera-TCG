import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../types';
import { CardView } from './CardView';

interface CardCarouselProps {
  cards: Card[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onCardClick?: (card: Card) => void;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  cards,
  autoPlay = false,
  autoPlayInterval = 3000,
  onCardClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToNext = useCallback(() => {
    if (cards.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
      setIsTransitioning(false);
    }, 150);
  }, [cards.length]);

  const goToPrev = useCallback(() => {
    if (cards.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
      setIsTransitioning(false);
    }, 150);
  }, [cards.length]);

  const goToIndex = (index: number) => {
    if (index === currentIndex) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 150);
  };

  // Auto-play
  useEffect(() => {
    if (!isPlaying || cards.length <= 1) return;
    
    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isPlaying, autoPlayInterval, goToNext, cards.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
        setIsPlaying(false);
      } else if (e.key === 'ArrowRight') {
        goToNext();
        setIsPlaying(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 text-valthera-500">
        Aucune carte à afficher
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const prevCard = cards[(currentIndex - 1 + cards.length) % cards.length];
  const nextCard = cards[(currentIndex + 1) % cards.length];

  return (
    <div className="relative">
      {/* Main carousel container */}
      <div className="flex items-center justify-center gap-8 py-8">
        {/* Previous card (smaller) */}
        {cards.length > 2 && (
          <div 
            className="hidden lg:block opacity-40 scale-75 blur-[1px] cursor-pointer transition-all hover:opacity-60"
            onClick={goToPrev}
          >
            <CardView card={prevCard} size="md" />
          </div>
        )}

        {/* Current card */}
        <div 
          className={`transition-all duration-300 ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          <div 
            className="cursor-pointer transform hover:scale-105 transition-transform"
            onClick={() => onCardClick?.(currentCard)}
          >
            <CardView card={currentCard} size="lg" />
          </div>
          
          {/* Card info */}
          <div className="text-center mt-6">
            <h3 className="text-2xl font-medieval font-bold text-valthera-200">
              {currentCard.name}
            </h3>
            {currentCard.title && (
              <p className="text-valthera-400 italic">{currentCard.title}</p>
            )}
            <p className="text-valthera-500 text-sm mt-2">
              {currentIndex + 1} / {cards.length}
            </p>
          </div>
        </div>

        {/* Next card (smaller) */}
        {cards.length > 2 && (
          <div 
            className="hidden lg:block opacity-40 scale-75 blur-[1px] cursor-pointer transition-all hover:opacity-60"
            onClick={goToNext}
          >
            <CardView card={nextCard} size="md" />
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={() => { goToPrev(); setIsPlaying(false); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-valthera-800/80 hover:bg-valthera-700 rounded-full flex items-center justify-center text-valthera-300 hover:text-valthera-100 transition-all border border-valthera-600"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={() => { goToNext(); setIsPlaying(false); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-valthera-800/80 hover:bg-valthera-700 rounded-full flex items-center justify-center text-valthera-300 hover:text-valthera-100 transition-all border border-valthera-600"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        {/* Play/Pause button */}
        <button
          onClick={() => setIsPlaying(prev => !prev)}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            isPlaying 
              ? 'bg-valthera-500 text-valthera-900' 
              : 'bg-valthera-700 text-valthera-300 hover:bg-valthera-600'
          }`}
        >
          {isPlaying ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Lecture auto
            </>
          )}
        </button>

        {/* Speed control */}
        <div className="flex items-center gap-2 text-valthera-400 text-sm">
          <span>Vitesse:</span>
          <select
            className="bg-valthera-800 border border-valthera-600 rounded px-2 py-1 text-valthera-200"
            defaultValue={autoPlayInterval}
            onChange={(e) => {
              // This would require lifting state up for full functionality
              // For now, it's a visual placeholder
            }}
          >
            <option value={2000}>Rapide</option>
            <option value={3000}>Normal</option>
            <option value={5000}>Lent</option>
          </select>
        </div>
      </div>

      {/* Dots navigation */}
      {cards.length <= 20 && (
        <div className="flex justify-center gap-2 mt-6 flex-wrap max-w-md mx-auto">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => { goToIndex(index); setIsPlaying(false); }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-valthera-400 scale-125' 
                  : 'bg-valthera-700 hover:bg-valthera-600'
              }`}
            />
          ))}
        </div>
      )}

      {/* Keyboard hints */}
      <div className="text-center mt-4 text-valthera-600 text-xs">
        ← → pour naviguer • Espace pour play/pause
      </div>
    </div>
  );
};

export default CardCarousel;
