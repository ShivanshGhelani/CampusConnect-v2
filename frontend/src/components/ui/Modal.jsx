import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({
  // Basic props
  isOpen = false,
  onClose,
  title,
  children,
  
  // Styling props
  size = 'md',
  variant = 'default',
  className = '',
  
  // Header props
  showHeader = true,
  showCloseButton = true,
  headerIcon,
  headerActions,
  
  // Footer props
  showFooter = false,
  footerContent,
  
  // Behavior props
  closeOnBackdropClick = true,
  closeOnEscapeKey = true,
  preventScroll = true,
  
  // Animation props
  animationDuration = 300,
  backdrop = 'blur',
  
  // Accessibility props
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  role = 'dialog',
  
  // Advanced props
  persistent = false,
  fullscreen = false,
  centered = true,
  
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Size variants
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  // Variant styles
  const variantClasses = {
    default: 'bg-white border-gray-200',
    danger: 'bg-white border-red-200',
    warning: 'bg-white border-yellow-200',
    success: 'bg-white border-green-200',
    info: 'bg-white border-blue-200'
  };

  // Backdrop styles
  const backdropClasses = {
    blur: 'backdrop-blur-sm bg-black bg-opacity-50',
    dark: 'bg-black bg-opacity-75',
    light: 'bg-black bg-opacity-25',
    none: 'bg-transparent'
  };

  // Handle close
  const handleClose = () => {
    if (!persistent && onClose) {
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && closeOnEscapeKey && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen, closeOnEscapeKey]);

  // Handle scroll prevention
  useEffect(() => {
    if (isOpen && preventScroll) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        // Restore scrolling
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, preventScroll]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus the modal
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    } else {
      // Restore focus to previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-50 flex ${
        centered ? 'items-center justify-center' : 'items-start justify-center pt-16'
      } p-4 transition-all duration-${animationDuration} ${backdropClasses[backdrop]}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`
          relative w-full transform transition-all duration-${animationDuration}
          ${fullscreen ? 'h-full max-w-none' : sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg shadow-2xl border
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          ${className}
        `}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-modal="true"
        tabIndex="-1"
        {...props}
      >
        {/* Header */}
        {showHeader && (title || headerIcon || showCloseButton || headerActions) && (
          <div className={`
            flex items-center justify-between p-6 border-b border-gray-200
            ${variant === 'danger' ? 'border-red-200' : ''}
            ${variant === 'warning' ? 'border-yellow-200' : ''}
            ${variant === 'success' ? 'border-green-200' : ''}
            ${variant === 'info' ? 'border-blue-200' : ''}
          `}>
            <div className="flex items-center">
              {headerIcon && (
                <div className={`mr-3 ${
                  variant === 'danger' ? 'text-red-500' :
                  variant === 'warning' ? 'text-yellow-500' :
                  variant === 'success' ? 'text-green-500' :
                  variant === 'info' ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  {headerIcon}
                </div>
              )}
              {title && (
                <h3
                  id={ariaLabelledBy || 'modal-title'}
                  className={`text-lg font-semibold ${
                    variant === 'danger' ? 'text-red-900' :
                    variant === 'warning' ? 'text-yellow-900' :
                    variant === 'success' ? 'text-green-900' :
                    variant === 'info' ? 'text-blue-900' : 'text-gray-900'
                  }`}
                >
                  {title}
                </h3>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {headerActions}
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label="Close modal"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`
          ${fullscreen ? 'flex-1 overflow-auto' : ''}
          ${showHeader ? 'p-6' : 'p-6 pt-6'}
          ${showFooter ? 'pb-0' : ''}
        `}>
          {children}
        </div>

        {/* Footer */}
        {showFooter && footerContent && (
          <div className={`
            px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg
            ${variant === 'danger' ? 'border-red-200 bg-red-50' : ''}
            ${variant === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}
            ${variant === 'success' ? 'border-green-200 bg-green-50' : ''}
            ${variant === 'info' ? 'border-blue-200 bg-blue-50' : ''}
          `}>
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Preset modal variants for common use cases
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  ...props 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      size="sm"
      showFooter
      headerIcon={
        variant === 'danger' ? <i className="fas fa-exclamation-triangle"></i> :
        variant === 'warning' ? <i className="fas fa-exclamation-circle"></i> :
        variant === 'info' ? <i className="fas fa-info-circle"></i> :
        <i className="fas fa-question-circle"></i>
      }
      footerContent={
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
              variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Loading...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      }
      {...props}
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
};

export default Modal;
