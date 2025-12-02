import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProfileSetup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { completeProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError("Votre nom d'aventurier doit contenir au moins 3 caractères.");
      return;
    }

    if (username.length > 20) {
      setError("Votre nom d'aventurier ne peut pas dépasser 20 caractères.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError("Seuls les lettres, chiffres, tirets et underscores sont autorisés.");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await completeProfile(username);
      if (success) {
        navigate('/collection');
      } else {
        setError("Ce nom est déjà pris ou une erreur est survenue.");
      }
    } catch (err) {
      setError("Erreur lors de la création du profil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-valthera-800 p-8 rounded-2xl shadow-2xl border border-valthera-700">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-16 h-16">
              <defs>
                <linearGradient id="setupShield" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#C9A227'}} />
                  <stop offset="50%" style={{stopColor:'#8B6914'}} />
                  <stop offset="100%" style={{stopColor:'#D4AF37'}} />
                </linearGradient>
                <linearGradient id="setupInner" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#2D1B0E'}} />
                  <stop offset="100%" style={{stopColor:'#1A0F08'}} />
                </linearGradient>
              </defs>
              <path d="M50 5 L90 20 L90 50 Q90 80 50 95 Q10 80 10 50 L10 20 Z" fill="url(#setupShield)" stroke="#5C4A1F" strokeWidth="2"/>
              <path d="M50 12 L82 24 L82 48 Q82 74 50 87 Q18 74 18 48 L18 24 Z" fill="url(#setupInner)"/>
              <path d="M35 30 L50 70 L65 30 L58 30 L50 55 L42 30 Z" fill="url(#setupShield)"/>
              <path d="M50 22 L54 28 L50 34 L46 28 Z" fill="#D4AF37"/>
            </svg>
          </div>
          <h2 className="text-3xl font-medieval font-bold text-valthera-200">Bienvenue, Aventurier !</h2>
          <p className="text-valthera-500 text-sm mt-2">Choisissez votre nom pour commencer l'aventure</p>
        </div>

        {error && (
          <div className="bg-blood-600/20 text-blood-400 p-3 rounded-lg mb-6 text-sm border border-blood-600/30 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-valthera-300 mb-2">
              Nom d'aventurier
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600"
              placeholder="Ex: DragonSlayer, Arthas, ..."
              required
              disabled={isSubmitting}
              autoFocus
              minLength={3}
              maxLength={20}
            />
            <p className="text-xs text-valthera-500 mt-2">
              3-20 caractères, lettres, chiffres, tirets et underscores uniquement
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || username.length < 3}
            className="w-full bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] border border-valthera-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Création...
              </>
            ) : (
              <>
                🛡️ Commencer l'aventure
              </>
            )}
          </button>
        </form>

        <div className="mt-8 p-4 bg-valthera-900/50 rounded-lg border border-valthera-700/50">
          <p className="text-valthera-400 text-sm text-center">
            ⚔️ Vous recevrez un <span className="text-valthera-300">booster gratuit</span> chaque jour !
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
