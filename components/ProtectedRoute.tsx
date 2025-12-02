import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Loading Spinner
const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-valthera-900">
    <div className="w-16 h-16 border-4 border-valthera-600 border-t-valthera-400 rounded-full animate-spin"></div>
    <p className="mt-4 text-valthera-400 font-medieval">Chargement...</p>
  </div>
);

/**
 * Route protégée - redirige vers /login si non authentifié
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { isAuthenticated, isLoading, user, needsProfileSetup } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Sauvegarder l'URL de destination pour redirection après login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si authentifié mais profil pas complet, rediriger vers setup
  if (needsProfileSetup) {
    return <Navigate to="/profile-setup" replace />;
  }

  if (requireAdmin && !user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Route publique uniquement - redirige vers /collection si déjà authentifié
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    // Rediriger vers la page d'origine ou la collection
    const from = (location.state as { from?: Location })?.from?.pathname || '/collection';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
