import { useState, useEffect, useCallback } from 'react';
import { pantryAPI } from '../services/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('notifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
    
    // Check for expiring items
    checkExpiringItems();
    
    // Set up periodic checks
    const interval = setInterval(checkExpiringItems, 60000 * 60); // Check every hour
    
    return () => clearInterval(interval);
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const checkExpiringItems = async () => {
    try {
      const response = await pantryAPI.getExpiring(3); // Items expiring in 3 days
      const expiringItems = response.data;
      
      expiringItems.forEach(item => {
        const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        // Only notify if not already notified today
        const notificationId = `expiring-${item.id}-${new Date().toDateString()}`;
        const exists = notifications.find(n => n.id === notificationId);
        
        if (!exists && daysLeft <= 3) {
          addNotification({
            id: notificationId,
            type: 'expiring',
            title: `${item.item_name} expiring soon!`,
            message: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Add to shopping list?`,
            time: 'Just now',
            read: false,
            action: {
              label: 'Add to List',
              onClick: () => {
                // This will be handled by the component
                window.dispatchEvent(new CustomEvent('add-to-shopping-list', { 
                  detail: { item } 
                }));
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error checking expiring items:', error);
    }
  };

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    
    // Request permission for browser notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: notification.id
      });
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    markAsRead,
    clearAll,
    requestPermission,
    checkExpiringItems
  };
};
