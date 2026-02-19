import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Notification, NotificationType } from '../types';
import { useAuth } from './AuthContext';
import supabaseService from '../services/apiService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  // Helpers pour créer des notifications spécifiques
  notifyBoosterAvailable: () => Promise<void>;
  notifyTradeReceived: (fromUsername: string, tradeId: string) => Promise<void>;
  notifyTradeAccepted: (byUsername: string, tradeId: string) => Promise<void>;
  notifyTradeRejected: (byUsername: string, tradeId: string) => Promise<void>;
  notifyRareCard: (cardName: string, rarity: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// Storage key pour les notifications locales (fallback)
const NOTIFICATIONS_KEY = 'valthera_notifications';

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Charger les notifications au démarrage
  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      // Essayer de charger depuis Supabase
      const supabaseNotifs = await supabaseService.getNotifications(user.id);
      if (supabaseNotifs.length > 0) {
        setNotifications(supabaseNotifs);
        return;
      }
    } catch (error) {
      console.error('Error loading notifications from Supabase:', error);
    }

    // Fallback: charger depuis localStorage
    try {
      const stored = localStorage.getItem(`${NOTIFICATIONS_KEY}_${user.id}`);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Sauvegarder les notifications dans localStorage
  useEffect(() => {
    if (user && notifications.length > 0) {
      localStorage.setItem(`${NOTIFICATIONS_KEY}_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user]);

  // Ajouter une notification
  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;

    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    // Ajouter localement
    setNotifications(prev => [newNotif, ...prev]);

    // Essayer de sauvegarder dans Supabase
    try {
      await supabaseService.createNotification({
        userId: user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: false,
      });
    } catch (error) {
      console.error('Error saving notification to Supabase:', error);
    }
  }, [user]);

  // Marquer comme lu
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );

    try {
      await supabaseService.markNotificationAsRead(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Marquer toutes comme lues
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    // Marquer toutes dans Supabase
    for (const notif of notifications.filter(n => !n.isRead)) {
      try {
        await supabaseService.markNotificationAsRead(notif.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  }, [notifications]);

  // Helpers pour types de notifications spécifiques
  const notifyBoosterAvailable = useCallback(async () => {
    await addNotification({
      type: NotificationType.BOOSTER_AVAILABLE,
      title: '📦 Booster disponible !',
      message: 'Votre booster quotidien est prêt à être ouvert.',
      isRead: false,
    });
  }, [addNotification]);

  const notifyTradeReceived = useCallback(async (fromUsername: string, tradeId: string) => {
    await addNotification({
      type: NotificationType.TRADE_RECEIVED,
      title: '🔄 Nouvelle proposition d\'échange',
      message: `${fromUsername} vous propose un échange.`,
      data: { tradeId },
      isRead: false,
    });
  }, [addNotification]);

  const notifyTradeAccepted = useCallback(async (byUsername: string, tradeId: string) => {
    await addNotification({
      type: NotificationType.TRADE_ACCEPTED,
      title: '✅ Échange accepté !',
      message: `${byUsername} a accepté votre échange.`,
      data: { tradeId },
      isRead: false,
    });
  }, [addNotification]);

  const notifyTradeRejected = useCallback(async (byUsername: string, tradeId: string) => {
    await addNotification({
      type: NotificationType.TRADE_REJECTED,
      title: '❌ Échange refusé',
      message: `${byUsername} a refusé votre échange.`,
      data: { tradeId },
      isRead: false,
    });
  }, [addNotification]);

  const notifyRareCard = useCallback(async (cardName: string, rarity: string) => {
    const icon = rarity === 'Légendaire' ? '🌟' : rarity === 'Épique' ? '💎' : '✨';
    await addNotification({
      type: NotificationType.RARE_CARD,
      title: `${icon} Carte ${rarity} obtenue !`,
      message: cardName,
      isRead: false,
    });
  }, [addNotification]);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        openPanel,
        closePanel,
        togglePanel,
        markAsRead,
        markAllAsRead,
        addNotification,
        refreshNotifications,
        notifyBoosterAvailable,
        notifyTradeReceived,
        notifyTradeAccepted,
        notifyTradeRejected,
        notifyRareCard,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
