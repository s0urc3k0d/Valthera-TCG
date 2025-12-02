import React from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Collection } from './pages/Collection';
import { BoosterOpening } from './pages/BoosterOpening';
import { AdminPanel } from './pages/AdminPanel';
import { Landing } from './pages/Landing';
import { SeriesBrowser } from './pages/SeriesBrowser';
import { ProfileSetup } from './pages/ProfileSetup';
import { Market } from './pages/Market';
import { PublicCollection } from './pages/PublicCollection';
import { NotFound } from './pages/NotFound';
import { ToastProvider } from './components/ToastProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationBell, NotificationPanel } from './components/NotificationCenter';

// Logo Valthera (Shield with V)
const ValtheraLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-8 h-8">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'#C9A227'}} />
        <stop offset="50%" style={{stopColor:'#8B6914'}} />
        <stop offset="100%" style={{stopColor:'#D4AF37'}} />
      </linearGradient>
      <linearGradient id="innerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:'#2D1B0E'}} />
        <stop offset="100%" style={{stopColor:'#1A0F08'}} />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 20 L90 50 Q90 80 50 95 Q10 80 10 50 L10 20 Z" fill="url(#shieldGrad)" stroke="#5C4A1F" strokeWidth="2"/>
    <path d="M50 12 L82 24 L82 48 Q82 74 50 87 Q18 74 18 48 L18 24 Z" fill="url(#innerGrad)"/>
    <path d="M35 30 L50 70 L65 30 L58 30 L50 55 L42 30 Z" fill="url(#shieldGrad)"/>
    <path d="M50 22 L54 28 L50 34 L46 28 Z" fill="#D4AF37"/>
  </svg>
);

// Icons
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const LibraryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></svg>
);
const CollectionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
);
const BoosterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);
const AdminIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);
const LoginIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
);
const TradeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
);
const MarketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
);

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path 
    ? "bg-valthera-700 text-valthera-300 shadow-lg shadow-valthera-400/20 border border-valthera-400/30" 
    : "text-valthera-200 hover:bg-valthera-800 hover:text-valthera-100";

  return (
    <nav className="fixed top-0 w-full bg-valthera-900/95 backdrop-blur-md border-b border-valthera-700 z-50 px-4 py-3">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="transform group-hover:scale-110 transition-transform duration-300">
            <ValtheraLogo />
          </div>
          <div className="hidden sm:block">
            <span className="font-medieval font-bold text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-valthera-400 via-valthera-300 to-valthera-400">
              VALTHERA
            </span>
            <span className="text-valthera-200 text-xs tracking-[0.3em] block -mt-1">TCG</span>
          </div>
        </Link>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Link to="/" className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${isActive('/')}`}>
             <HomeIcon /> <span className="hidden md:inline">Accueil</span>
          </Link>
          <Link to="/series" className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${isActive('/series')}`}>
             <LibraryIcon /> <span className="hidden md:inline">Campagnes</span>
          </Link>

          <div className="w-px h-6 bg-valthera-700 mx-2 hidden sm:block"></div>

          {user ? (
            <>
              <Link to="/collection" className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${isActive('/collection')}`}>
                 <CollectionIcon /> <span className="hidden md:inline">Collection</span>
              </Link>
              <Link to="/booster" className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${isActive('/booster')}`}>
                 <BoosterIcon /> <span className="hidden md:inline">Booster</span>
              </Link>
              <Link to="/market" className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${isActive('/market')}`}>
                 <MarketIcon /> <span className="hidden md:inline">Marché</span>
              </Link>
              {user.isAdmin && (
                <Link to="/admin" className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${isActive('/admin')}`}>
                   <AdminIcon /> <span className="hidden md:inline">Admin</span>
                </Link>
              )}
              <NotificationBell />
              <div className="flex items-center gap-2 ml-2">
                <span className="text-valthera-400 text-sm hidden lg:block">{user.username}</span>
                <button onClick={logout} className="px-3 py-2 rounded-lg flex items-center gap-2 text-blood-400 hover:bg-blood-600/20 transition-colors">
                    <LogoutIcon />
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className={`px-4 py-2 rounded-lg flex items-center gap-2 border border-valthera-400 text-valthera-300 hover:bg-valthera-400 hover:text-valthera-900 transition-all font-medium`}>
               <LoginIcon /> <span className="hidden sm:inline">Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

// App Content with routing
const AppContent: React.FC = () => {
  const { user, loading, needsProfileSetup, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-valthera-900">
      <ValtheraLogo />
      <p className="mt-4 text-valthera-300 font-medieval tracking-widest animate-pulse">Chargement...</p>
    </div>
  );

  // Rediriger vers profile-setup si l'utilisateur est authentifié mais n'a pas de profil
  if (isAuthenticated && needsProfileSetup && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  return (
    <div className="min-h-screen pt-20 pb-10">
      <Navbar />
      <NotificationPanel />
      <div className="container mx-auto px-4">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/series" element={<SeriesBrowser />} />
          <Route path="/collection/:shareId" element={<PublicCollection />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/collection" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/collection" />} />
          <Route path="/profile-setup" element={needsProfileSetup ? <ProfileSetup /> : <Navigate to="/collection" />} />
          <Route 
            path="/collection" 
            element={
              <ProtectedRoute>
                <Collection />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/booster" 
            element={
              <ProtectedRoute>
                <BoosterOpening />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/market" 
            element={
              <ProtectedRoute>
                <Market />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
          {/* Catch-all 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
}