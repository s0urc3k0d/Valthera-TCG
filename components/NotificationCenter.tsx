import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationType } from '../types';

// Icône de cloche avec badge
export const NotificationBell: React.FC = () => {
  const { unreadCount, togglePanel } = useNotifications();

  return (
    <button
      onClick={togglePanel}
      className="relative p-2 rounded-lg text-valthera-300 hover:bg-valthera-800 hover:text-valthera-100 transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-blood-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Panneau de notifications
export const NotificationPanel: React.FC = () => {
  const { notifications, isOpen, closePanel, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  if (!isOpen) return null;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.BOOSTER_AVAILABLE:
        return '📦';
      case NotificationType.TRADE_RECEIVED:
        return '🔄';
      case NotificationType.TRADE_ACCEPTED:
        return '✅';
      case NotificationType.TRADE_REJECTED:
        return '❌';
      case NotificationType.NEW_CARD:
        return '🎴';
      case NotificationType.RARE_CARD:
        return '✨';
      case NotificationType.SYSTEM:
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={closePanel}
      />
      
      {/* Panneau */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-valthera-900 border-l border-valthera-700 z-[70] shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-valthera-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            <h2 className="font-medieval text-xl text-valthera-300">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blood-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-valthera-400 hover:text-valthera-200 transition-colors"
              >
                Tout marquer lu
              </button>
            )}
            <button
              onClick={closePanel}
              className="p-2 rounded-lg text-valthera-400 hover:bg-valthera-800 hover:text-valthera-200 transition-colors"
              aria-label="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-valthera-500">
              <span className="text-4xl mb-2">🔕</span>
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-valthera-800">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                  className={`p-4 hover:bg-valthera-800/50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-valthera-800/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${!notification.isRead ? 'text-valthera-200' : 'text-valthera-400'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-valthera-400 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-sm text-valthera-500 mt-0.5 truncate">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-valthera-600 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
