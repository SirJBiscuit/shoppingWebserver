import { useState } from 'react';

/**
 * useNotification Hook
 * 
 * Simplified notification management for CustomNotification component
 * 
 * @returns {Object} Notification state and helper functions
 */
export const useNotification = () => {
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    position: 'top-right',
    duration: 5000,
    showProgress: true,
    actions: [],
    dismissible: true
  });

  /**
   * Show a notification with custom configuration
   */
  const showNotification = (config) => {
    setNotification({
      ...notification,
      ...config,
      isOpen: true
    });
  };

  /**
   * Hide the current notification
   */
  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  /**
   * Show a success notification
   */
  const success = (message, title = 'Success', options = {}) => {
    showNotification({
      type: 'success',
      title,
      message,
      position: 'bottom-right',
      duration: 3000,
      ...options
    });
  };

  /**
   * Show an error notification
   */
  const error = (message, title = 'Error', options = {}) => {
    showNotification({
      type: 'error',
      title,
      message,
      position: 'top',
      duration: 0, // No auto-dismiss for errors
      ...options
    });
  };

  /**
   * Show an info notification
   */
  const info = (message, title = 'Info', options = {}) => {
    showNotification({
      type: 'info',
      title,
      message,
      position: 'top-right',
      duration: 5000,
      ...options
    });
  };

  /**
   * Show a warning notification
   */
  const warning = (message, title = 'Warning', options = {}) => {
    showNotification({
      type: 'warning',
      title,
      message,
      position: 'top',
      duration: 7000,
      ...options
    });
  };

  /**
   * Ask a question with action buttons
   */
  const ask = (message, actions, title = 'Confirm', options = {}) => {
    showNotification({
      type: 'question',
      title,
      message,
      position: 'center',
      duration: 0,
      actions,
      ...options
    });
  };

  /**
   * Show a confirmation dialog
   */
  const confirm = (message, onConfirm, onCancel, title = 'Confirm', options = {}) => {
    showNotification({
      type: 'question',
      title,
      message,
      position: 'center',
      duration: 0,
      actions: [
        {
          label: 'Confirm',
          onClick: () => {
            onConfirm?.();
            hideNotification();
          },
          color: 'bg-blue-500 hover:bg-blue-600 text-white'
        },
        {
          label: 'Cancel',
          onClick: () => {
            onCancel?.();
            hideNotification();
          },
          variant: 'outline'
        }
      ],
      ...options
    });
  };

  /**
   * Show a delete confirmation dialog
   */
  const confirmDelete = (itemName, onDelete, onCancel, options = {}) => {
    showNotification({
      type: 'question',
      title: 'Delete Item?',
      message: `Are you sure you want to delete ${itemName}?`,
      position: 'center',
      duration: 0,
      actions: [
        {
          label: 'Delete',
          onClick: () => {
            onDelete?.();
            hideNotification();
          },
          color: 'bg-red-500 hover:bg-red-600 text-white'
        },
        {
          label: 'Cancel',
          onClick: () => {
            onCancel?.();
            hideNotification();
          },
          variant: 'outline'
        }
      ],
      ...options
    });
  };

  return {
    notification,
    showNotification,
    hideNotification,
    success,
    error,
    info,
    warning,
    ask,
    confirm,
    confirmDelete
  };
};

export default useNotification;
