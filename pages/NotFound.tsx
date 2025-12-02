import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-valthera-950 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Shield Icon with 404 */}
        <div className="relative inline-block mb-8">
          <svg viewBox="0 0 100 120" className="w-48 h-56 mx-auto opacity-80">
            <defs>
              <linearGradient id="shieldGrad404" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b08d57"/>
                <stop offset="50%" stopColor="#8b7355"/>
                <stop offset="100%" stopColor="#6b5a47"/>
              </linearGradient>
            </defs>
            {/* Shield shape */}
            <path 
              d="M50 5 L90 20 L90 60 Q90 100 50 115 Q10 100 10 60 L10 20 Z" 
              fill="url(#shieldGrad404)"
              stroke="#d4af37"
              strokeWidth="2"
            />
            {/* Inner decoration */}
            <path 
              d="M50 15 L80 27 L80 58 Q80 90 50 103 Q20 90 20 58 L20 27 Z" 
              fill="none"
              stroke="#d4af37"
              strokeWidth="1"
              opacity="0.5"
            />
            {/* 404 text */}
            <text 
              x="50" 
              y="70" 
              textAnchor="middle" 
              fill="#d4af37" 
              fontSize="28"
              fontFamily="Cinzel, serif"
              fontWeight="bold"
            >
              404
            </text>
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-medieval font-bold text-valthera-200 mb-4">
          Chemin Introuvable
        </h1>

        {/* Description */}
        <p className="text-valthera-400 mb-8 leading-relaxed">
          Aventurier, tu t'es égaré dans les brumes de Valthera. 
          Cette page n'existe pas ou a été engloutie par les ombres.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-valthera-500 to-valthera-600 text-white font-medium rounded-lg hover:from-valthera-400 hover:to-valthera-500 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Retour à l'accueil
          </Link>
          <Link
            to="/collection"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-valthera-800 text-valthera-200 font-medium rounded-lg border border-valthera-600 hover:bg-valthera-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Ma collection
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex justify-center gap-4 opacity-30">
          <span className="text-2xl">⚔️</span>
          <span className="text-valthera-600">•</span>
          <span className="text-2xl">🛡️</span>
          <span className="text-valthera-600">•</span>
          <span className="text-2xl">🗡️</span>
        </div>
      </div>
    </div>
  );
};
