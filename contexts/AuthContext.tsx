import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AUTH0_CONFIG, isAdminEmail } from '../config/auth0';
import { User } from '../types';
import supabaseService from '../services/apiService';

// Initialiser le client Auth0
const auth0Client = new Auth0Client({
  domain: AUTH0_CONFIG.domain,
  clientId: AUTH0_CONFIG.clientId,
  authorizationParams: {
    redirect_uri: AUTH0_CONFIG.redirectUri,
    audience: AUTH0_CONFIG.audience || undefined,
  },
  cacheLocation: 'localstorage',
});

interface Auth0UserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  auth0User: Auth0UserInfo | null;
  needsProfileSetup: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  loginWithPopup: () => Promise<boolean>;
  completeProfile: (username: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Storage keys
const USER_KEY = 'valthera_user';
const AUTH0_USER_KEY = 'valthera_auth0_user';
const AUTH0_ACCESS_TOKEN_KEY = 'valthera_auth0_access_token';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    auth0User: null,
    needsProfileSetup: false,
    error: null,
  });

  // Gérer le callback Auth0 après login
  const handleRedirectCallback = useCallback(async () => {
    try {
      await auth0Client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    } catch (error) {
      console.error('Redirect callback error:', error);
      return false;
    }
  }, []);

  // Vérifier si l'utilisateur existe dans Supabase
  const checkUserInSupabase = useCallback(async (email: string): Promise<User | null> => {
    try {
      const user = await supabaseService.getUserByEmail(email);
      if (user) {
        void supabaseService.cleanupAllUserData(user.id).catch(() => undefined);
        const collection = await supabaseService.getUserCollection(user.id);
        return { ...user, collection };
      }
      return null;
    } catch (error) {
      console.error('Error checking user in Supabase:', error);
      return null;
    }
  }, []);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Vérifier si on revient d'un redirect Auth0
        if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
          try {
            await auth0Client.handleRedirectCallback();
            // Nettoyer l'URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (callbackError) {
            console.error('Redirect callback error:', callbackError);
          }
        }

        // Vérifier si l'utilisateur est connecté à Auth0
        const isAuthenticated = await auth0Client.isAuthenticated();
        
        if (isAuthenticated) {
          const auth0User = await auth0Client.getUser() as Auth0UserInfo | undefined;
          
          if (auth0User?.email) {
            const accessToken = await auth0Client.getTokenSilently().catch(() => null);
            if (accessToken) {
              localStorage.setItem(AUTH0_ACCESS_TOKEN_KEY, accessToken);
            }

            // Stocker l'utilisateur Auth0
            localStorage.setItem(AUTH0_USER_KEY, JSON.stringify(auth0User));
            
            // Vérifier si l'utilisateur existe dans Supabase
            const supabaseUser = await checkUserInSupabase(auth0User.email);
            
            if (supabaseUser) {
              // Utilisateur existe, connexion complète
              localStorage.setItem(USER_KEY, JSON.stringify(supabaseUser));
              setState({
                isAuthenticated: true,
                isLoading: false,
                user: supabaseUser,
                auth0User,
                needsProfileSetup: false,
                error: null,
              });
            } else {
              // Utilisateur Auth0 mais pas de profil Supabase -> besoin de setup
              setState({
                isAuthenticated: true,
                isLoading: false,
                user: null,
                auth0User,
                needsProfileSetup: true,
                error: null,
              });
            }
            return;
          }
        }

        // Pas connecté
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(AUTH0_USER_KEY);
        localStorage.removeItem(AUTH0_ACCESS_TOKEN_KEY);
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          auth0User: null,
          needsProfileSetup: false,
          error: null,
        });

      } catch (error) {
        console.error('Auth initialization error:', error);
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          auth0User: null,
          needsProfileSetup: false,
          error: 'Erreur d\'initialisation de l\'authentification',
        });
      }
    };

    initAuth();
  }, [handleRedirectCallback, checkUserInSupabase]);

  // Login avec redirection
  const login = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await auth0Client.loginWithRedirect();
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({
        ...prev,
        error: 'Erreur de connexion',
      }));
    }
  }, []);

  // Login avec popup
  const loginWithPopup = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await auth0Client.loginWithPopup();
      
      const auth0User = await auth0Client.getUser() as Auth0UserInfo | undefined;
      
      if (auth0User?.email) {
        const accessToken = await auth0Client.getTokenSilently().catch(() => null);
        if (accessToken) {
          localStorage.setItem(AUTH0_ACCESS_TOKEN_KEY, accessToken);
        }

        localStorage.setItem(AUTH0_USER_KEY, JSON.stringify(auth0User));
        
        // Vérifier si l'utilisateur existe dans Supabase
        const supabaseUser = await checkUserInSupabase(auth0User.email);
        
        if (supabaseUser) {
          localStorage.setItem(USER_KEY, JSON.stringify(supabaseUser));
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: supabaseUser,
            auth0User,
            needsProfileSetup: false,
            error: null,
          });
        } else {
          // Besoin de créer le profil
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: null,
            auth0User,
            needsProfileSetup: true,
            error: null,
          });
        }
        return true;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Impossible de récupérer l\'email',
      }));
      return false;

    } catch (error) {
      console.error('Login popup error:', error);
      const message = error instanceof Error ? error.message : 'Erreur de connexion';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return false;
    }
  }, [checkUserInSupabase]);

  // Compléter le profil (créer l'utilisateur dans Supabase)
  const completeProfile = useCallback(async (username: string): Promise<boolean> => {
    if (!state.auth0User?.email) {
      setState(prev => ({ ...prev, error: 'Pas d\'email Auth0' }));
      return false;
    }

    try {
      // Vérifier si le username est déjà pris
      const existingUsers = await supabaseService.getUsers();
      if (existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        setState(prev => ({ ...prev, error: 'Ce nom est déjà pris' }));
        return false;
      }

      // Créer l'utilisateur dans Supabase
      const newUser = await supabaseService.createUser({
        username,
        email: state.auth0User.email,
        avatar: state.auth0User.picture,
        isAdmin: isAdminEmail(state.auth0User.email),
        lastBoosterDate: null,
        collection: [],
        favoriteCards: [],
        isPublicProfile: true,
      });

      if (newUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setState(prev => ({
          ...prev,
          user: newUser,
          needsProfileSetup: false,
          error: null,
        }));
        return true;
      }

      setState(prev => ({ ...prev, error: 'Erreur lors de la création du profil' }));
      return false;

    } catch (error) {
      console.error('Complete profile error:', error);
      setState(prev => ({ ...prev, error: 'Erreur lors de la création du profil' }));
      return false;
    }
  }, [state.auth0User]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH0_USER_KEY);
    localStorage.removeItem(AUTH0_ACCESS_TOKEN_KEY);
    
    auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      auth0User: null,
      needsProfileSetup: false,
      error: null,
    });
  }, []);

  // Mettre à jour l'utilisateur
  const updateUser = useCallback(async (updatedUser: User) => {
    try {
      console.log('📝 Updating user with lastBoosterDate:', updatedUser.lastBoosterDate);
      
      // Mettre à jour les infos utilisateur de base
      const result = await supabaseService.updateUser(updatedUser.id, updatedUser);
      console.log('📝 Update result from Supabase:', result);
      
      // Sauvegarder la collection si elle a changé
      if (state.user && updatedUser.collection.length > state.user.collection.length) {
        const newCardIds = updatedUser.collection.slice(state.user.collection.length);
        console.log('🎴 Saving new cards to collection:', newCardIds);
        await supabaseService.addToCollection(updatedUser.id, newCardIds);
      }
      
      // Mettre à jour le state local avec la collection complète ET lastBoosterDate
      const userWithCollection = { 
        ...(result || updatedUser), 
        collection: updatedUser.collection,
        lastBoosterDate: updatedUser.lastBoosterDate 
      };
      console.log('📝 Saving to localStorage:', userWithCollection.lastBoosterDate);
      localStorage.setItem(USER_KEY, JSON.stringify(userWithCollection));
      setState(prev => ({ ...prev, user: userWithCollection }));
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }, [state.user]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        loginWithPopup,
        completeProfile,
        updateUser,
        loading: state.isLoading,
        error: state.error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
