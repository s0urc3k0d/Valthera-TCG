import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Register: React.FC = () => {
  const { login, loginWithPopup, loading, error } = useAuth();

  const handleSignup = async () => {
    // Auth0 gère l'inscription via le même flow que la connexion
    // L'utilisateur peut créer un compte depuis la popup Auth0
    await loginWithPopup();
  };

  const handleSignupRedirect = async () => {
    await login();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-valthera-800 p-8 rounded-2xl shadow-2xl border border-valthera-700">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-16 h-16">
              <defs>
                <linearGradient id="registerShield" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#C9A227'}} />
                  <stop offset="50%" style={{stopColor:'#8B6914'}} />
                  <stop offset="100%" style={{stopColor:'#D4AF37'}} />
                </linearGradient>
                <linearGradient id="registerInner" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#2D1B0E'}} />
                  <stop offset="100%" style={{stopColor:'#1A0F08'}} />
                </linearGradient>
              </defs>
              <path d="M50 5 L90 20 L90 50 Q90 80 50 95 Q10 80 10 50 L10 20 Z" fill="url(#registerShield)" stroke="#5C4A1F" strokeWidth="2"/>
              <path d="M50 12 L82 24 L82 48 Q82 74 50 87 Q18 74 18 48 L18 24 Z" fill="url(#registerInner)"/>
              <path d="M35 30 L50 70 L65 30 L58 30 L50 55 L42 30 Z" fill="url(#registerShield)"/>
              <path d="M50 22 L54 28 L50 34 L46 28 Z" fill="#D4AF37"/>
            </svg>
          </div>
          <h2 className="text-3xl font-medieval font-bold text-valthera-200">Rejoindre la Guilde</h2>
          <p className="text-valthera-500 text-sm mt-2">Créez votre compte d'aventurier</p>
        </div>
        
        {error && (
          <div className="bg-blood-600/20 text-blood-400 p-3 rounded-lg mb-6 text-sm border border-blood-600/30 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        {/* Features list */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3 text-valthera-300">
            <span className="text-xl">📦</span>
            <span className="text-sm">Booster quotidien gratuit</span>
          </div>
          <div className="flex items-center gap-3 text-valthera-300">
            <span className="text-xl">🗃️</span>
            <span className="text-sm">Collection personnelle</span>
          </div>
          <div className="flex items-center gap-3 text-valthera-300">
            <span className="text-xl">⚔️</span>
            <span className="text-sm">Cartes exclusives à collectionner</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Bouton principal - Popup */}
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] border border-valthera-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Création...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                🛡️ Créer mon Aventurier
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-valthera-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-valthera-800 text-valthera-500">ou</span>
            </div>
          </div>

          {/* Bouton alternatif - Redirection */}
          <button
            onClick={handleSignupRedirect}
            disabled={loading}
            className="w-full bg-valthera-900 border border-valthera-600 hover:border-valthera-500 text-valthera-300 hover:text-valthera-200 font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Inscription via page Auth0
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-valthera-900/50 rounded-lg border border-valthera-700/50">
          <p className="text-valthera-400 text-sm text-center">
            🛡️ Inscription sécurisée via <span className="text-valthera-300">Auth0</span>
          </p>
          <p className="text-valthera-500 text-xs text-center mt-1">
            Cliquez sur "Sign up" dans la fenêtre pour créer votre compte
          </p>
        </div>
        
        <div className="mt-6 text-center text-sm text-valthera-500">
          Déjà membre de la guilde ? <Link to="/login" className="text-valthera-300 hover:text-valthera-200 underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
};