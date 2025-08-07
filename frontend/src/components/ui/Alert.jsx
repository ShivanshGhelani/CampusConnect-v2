import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Individual Alert component
const Alert = ({
  // Basic props
  type = 'info',
  title,
  message,
  children,
  
  // Styling props
  size = 'md',
  variant = 'filled',
  className = '',
  
  // Behavior props
  dismissible = false,
  onDismiss,
  autoClose = false,
  autoCloseDelay = 5000,
  
  // Icon props
  showIcon = true,
  customIcon,
  
  // Animation props
  animate = true,
  
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Type configurations
  const typeConfig = {
    success: {
      icon: 'fas fa-check-circle',
      colors: {
        filled: 'bg-green-50 text-green-800 border-green-200',
        outlined: 'bg-white text-green-800 border-green-300',
        solid: 'bg-green-600 text-white border-green-600'
      }
    },
    error: {
      icon: 'fas fa-exclamation-circle',
      colors: {
        filled: 'bg-red-50 text-red-800 border-red-200',
        outlined: 'bg-white text-red-800 border-red-300',
        solid: 'bg-red-600 text-white border-red-600'
      }
    },
    warning: {
      icon: 'fas fa-exclamation-triangle',
      colors: {
        filled: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        outlined: 'bg-white text-yellow-800 border-yellow-300',
        solid: 'bg-yellow-600 text-white border-yellow-600'
      }
    },
    info: {
      icon: 'fas fa-info-circle',
      colors: {
        filled: 'bg-blue-50 text-blue-800 border-blue-200',
        outlined: 'bg-white text-blue-800 border-blue-300',
        solid: 'bg-blue-600 text-white border-blue-600'
      }
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-sm',
    lg: 'p-5 text-base'
  };

  // Auto close effect
  useEffect(() => {
    if (autoClose && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, animate ? 300 : 0);
  };

  if (!isVisible) return null;

  const config = typeConfig[type];
  const iconClass = customIcon || config.icon;
  const colorClass = config.colors[variant];

  return (
    <div
      className={`
        border rounded-lg flex items-start space-x-3 transition-all duration-300
        ${animate ? 'animate-in slide-in-from-top-2 fade-in-0' : ''}
        ${sizeClasses[size]}
        ${colorClass}
        ${className}
      `}
      role="alert"
      {...props}
    >
      {/* Icon */}
      {showIcon && (
        <div className="flex-shrink-0">
          <i className={`${iconClass} ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}></i>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold ${size === 'sm' ? 'text-sm' : 'text-base'} mb-1`}>
            {title}
          </h4>
        )}
        {message && (
          <p className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
        )}
        {children}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 ml-3 transition-colors ${
            variant === 'solid' ? 'text-white hover:text-gray-200' : 'hover:opacity-70'
          }`}
          aria-label="Dismiss alert"
        >
          <i className="fas fa-times text-sm"></i>
        </button>
      )}
    </div>
  );
};

// Toast component for floating notifications
const Toast = ({
  id,
  type = 'info',
  title,
  message,
  position = 'top-right',
  duration = 5000,
  onRemove,
  showProgress = true,
  ...props
}) => {
  const [progress, setProgress] = useState(100);
  const [isRemoving, setIsRemoving] = useState(false);

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  // Auto-remove effect
  useEffect(() => {
    if (duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            handleRemove();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      if (onRemove) onRemove(id);
    }, 300);
  };

  return (
    <div
      className={`
        fixed z-50 w-80 max-w-sm transform transition-all duration-300
        ${positionClasses[position]}
        ${isRemoving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <Alert
          type={type}
          title={title}
          message={message}
          dismissible
          onDismiss={handleRemove}
          className="border-0 rounded-none"
          {...props}
        />
        
        {/* Progress bar */}
        {showProgress && duration > 0 && (
          <div className="h-1 bg-gray-100">
            <div
              className={`h-full transition-all duration-100 ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Toast container for managing multiple toasts
const ToastContainer = ({ toasts = [], position = 'top-right', onRemove }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 - index
          }}
        >
          <Toast
            {...toast}
            position={position}
            onRemove={onRemove}
          />
        </div>
      ))}
    </div>,
    document.body
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message, options = {}) => addToast({ type: 'success', message, ...options });
  const error = (message, options = {}) => addToast({ type: 'error', message, ...options });
  const warning = (message, options = {}) => addToast({ type: 'warning', message, ...options });
  const info = (message, options = {}) => addToast({ type: 'info', message, ...options });

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    ToastContainer: (props) => <ToastContainer {...props} toasts={toasts} onRemove={removeToast} />
  };
};

// Context for providing toast functionality throughout the app
export const ToastContext = React.createContext(null);

export const ToastProvider = ({ children, position = 'top-right' }) => {
  const toastMethods = useToast();

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <toastMethods.ToastContainer position={position} />
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

export { Alert, Toast, ToastContainer };
export default Alert;
