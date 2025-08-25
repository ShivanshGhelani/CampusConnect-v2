import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 5000, onClose, className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Start animation on mount
    setIsAnimating(true);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300); // Wait for animation to complete
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-500',
          textColor: 'text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-500',
          textColor: 'text-red-800',
          icon: XCircle,
          iconColor: 'text-red-600'
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-500',
          textColor: 'text-yellow-800',
          icon: AlertCircle,
          iconColor: 'text-yellow-600'
        };
      default: // info
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-500',
          textColor: 'text-blue-800',
          icon: Info,
          iconColor: 'text-blue-600'
        };
    }
  };

  if (!isVisible) return null;

  const config = getToastConfig();
  const Icon = config.icon;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`max-w-sm w-full ${config.bgColor} ${config.borderColor} border-l-4 rounded-lg shadow-lg p-4 ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className={`inline-flex ${config.textColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current rounded-md`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component to manage multiple toasts
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;
export { ToastContainer };
