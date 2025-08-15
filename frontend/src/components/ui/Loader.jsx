import React from 'react';

const Loader = ({ 
  size = 'md', 
  color = 'blue', 
  text = '', 
  className = '',
  fullScreen = false 
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  // Color configurations
  const colorClasses = {
    blue: 'border-blue-600 border-t-transparent',
    green: 'border-green-600 border-t-transparent',
    red: 'border-red-600 border-t-transparent',
    yellow: 'border-yellow-600 border-t-transparent',
    purple: 'border-purple-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-600 border-t-transparent'
  };

  const textColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  const LoaderComponent = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Spinner */}
      <div 
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]} 
          border-2 
          rounded-full 
          animate-spin
        `}
      />
      
      {/* Loading text */}
      {text && (
        <p className={`mt-3 text-sm font-medium ${textColorClasses[color]}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {LoaderComponent}
        </div>
      </div>
    );
  }

  return LoaderComponent;
};

// Predefined loader variants for common use cases
export const ButtonLoader = ({ text = 'Loading...' }) => (
  <Loader size="sm" color="white" text={text} />
);

export const PageLoader = ({ text = 'Loading page...' }) => (
  <Loader size="lg" color="blue" text={text} fullScreen />
);

export const ComponentLoader = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-8">
    <Loader size="md" color="blue" text={text} />
  </div>
);

export const InlineLoader = () => (
  <Loader size="sm" color="blue" />
);

export default Loader;
