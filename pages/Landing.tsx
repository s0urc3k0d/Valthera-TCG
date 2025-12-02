import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Landing: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col space-y-20 pb-20">
      {/* Hero Section */}
      <div className="relative bg-valthera-800 rounded-3xl overflow-hidden shadow-2xl border border-valthera-700 min-h-[500px] flex items-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-valthera-950 via-valthera-900/95 to-transparent z-10"></div>
        
        <div className="relative z-20 px-8 md:px-16 max-w-2xl space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-12 bg-gradient-to-b from-valthera-400 to-valthera-600"></div>
            <span className="text-valthera-400 uppercase tracking-[0.4em] text-sm font-medium">Jeu de Cartes à Collectionner</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-medieval font-bold text-transparent bg-clip-text bg-gradient-to-r from-valthera-300 via-valthera-200 to-valthera-400 leading-tight">
            VALTHERA
          </h1>
          <p className="text-xl text-valthera-200 leading-relaxed font-body">
            Plongez dans l'univers médiéval fantastique de Valthera. Collectionnez les héros, créatures et artefacts de nos campagnes épiques. Chaque série raconte une nouvelle aventure.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            {user ? (
               <Link 
                to="/booster" 
                className="px-8 py-4 bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 font-bold rounded-lg shadow-lg hover:shadow-valthera-400/30 transition-all transform hover:-translate-y-1 border border-valthera-400/50"
              >
                ⚔️ Ouvrir mon Booster
              </Link>
            ) : (
              <>
                <Link 
                  to="/register" 
                  className="px-8 py-4 bg-gradient-to-r from-valthera-500 to-valthera-600 hover:from-valthera-400 hover:to-valthera-500 text-valthera-100 font-bold rounded-lg shadow-lg hover:shadow-valthera-400/30 transition-all transform hover:-translate-y-1 border border-valthera-400/50"
                >
                  ⚔️ Rejoindre l'Aventure
                </Link>
                <Link 
                  to="/login" 
                  className="px-8 py-4 bg-valthera-800 border border-valthera-500 hover:bg-valthera-700 text-valthera-200 font-bold rounded-lg transition-all"
                >
                  Se Connecter
                </Link>
              </>
            )}
            <Link 
              to="/series" 
              className="px-8 py-4 bg-transparent border border-valthera-600 hover:border-valthera-400 text-valthera-300 hover:text-valthera-200 font-bold rounded-lg transition-all"
            >
              📜 Explorer les Campagnes
            </Link>
          </div>
        </div>
        
        {/* Decorative cards */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full hidden lg:block opacity-70">
           <div className="w-48 h-72 bg-gradient-to-br from-valthera-700 to-valthera-900 rounded-xl transform rotate-12 absolute right-16 border-2 border-valthera-500 shadow-2xl"></div>
           <div className="w-48 h-72 bg-gradient-to-br from-valthera-600 to-valthera-800 rounded-xl transform -rotate-6 absolute right-32 top-10 border-2 border-valthera-400 shadow-2xl"></div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <div className="bg-valthera-800/50 p-6 rounded-xl border border-valthera-700 hover:border-valthera-500 transition-colors group">
          <div className="w-14 h-14 bg-valthera-900 rounded-lg flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform border border-valthera-700">📦</div>
          <h3 className="text-xl font-medieval font-bold text-valthera-200 mb-2">Booster Quotidien</h3>
          <p className="text-valthera-400 font-body">Revenez chaque jour pour ouvrir un nouveau paquet de cartes et enrichir votre collection d'artefacts légendaires.</p>
        </div>
        <div className="bg-valthera-800/50 p-6 rounded-xl border border-valthera-700 hover:border-valthera-500 transition-colors group">
          <div className="w-14 h-14 bg-valthera-900 rounded-lg flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform border border-valthera-700">🏰</div>
          <h3 className="text-xl font-medieval font-bold text-valthera-200 mb-2">Campagnes Épiques</h3>
          <p className="text-valthera-400 font-body">Chaque série correspond à une campagne unique avec ses personnages, lieux mythiques, créatures et boss légendaires.</p>
        </div>
        <div className="bg-valthera-800/50 p-6 rounded-xl border border-valthera-700 hover:border-valthera-500 transition-colors group">
          <div className="w-14 h-14 bg-valthera-900 rounded-lg flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform border border-valthera-700">🐉</div>
          <h3 className="text-xl font-medieval font-bold text-valthera-200 mb-2">Univers D&D</h3>
          <p className="text-valthera-400 font-body">Basé sur notre univers de jeu de rôle, découvrez les héros, monstres et intrigues qui ont marqué nos aventures.</p>
        </div>
      </div>

      {/* Card Types Section */}
      <div className="text-center space-y-8">
        <h2 className="text-3xl font-medieval font-bold text-valthera-200">Types de Cartes</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { icon: '👤', name: 'Personnages', color: 'from-blue-600 to-blue-800' },
            { icon: '🐲', name: 'Créatures', color: 'from-red-600 to-red-800' },
            { icon: '🏔️', name: 'Lieux', color: 'from-green-600 to-green-800' },
            { icon: '⚔️', name: 'Objets', color: 'from-yellow-600 to-yellow-800' },
            { icon: '📖', name: 'Événements', color: 'from-purple-600 to-purple-800' },
            { icon: '💀', name: 'Boss', color: 'from-gray-600 to-gray-800' },
          ].map((type) => (
            <div key={type.name} className={`px-6 py-3 bg-gradient-to-r ${type.color} rounded-full text-white font-medium flex items-center gap-2 shadow-lg`}>
              <span className="text-xl">{type.icon}</span>
              {type.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};