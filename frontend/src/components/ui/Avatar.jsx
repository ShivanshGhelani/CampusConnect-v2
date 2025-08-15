import React, { useState } from 'react';

function Avatar({ 
  src, 
  name, 
  size = 'md', 
  className = '', 
  showFallback = true 
}) {
  const [imageError, setImageError] = useState(false);
  
  // Get initials from name
  const getInitials = (fullname) => {
    if (!fullname) return '?';
    const names = fullname.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Size variants
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '3xl': 'w-24 h-24 text-3xl'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // If we have a valid image URL and no error, show the image
  if (src && !imageError) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={`${src}?t=${Date.now()}`} // Add timestamp to prevent browser caching
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          key={`avatar-${src}-${Date.now()}`} // Force re-render when src changes
          onError={() => setImageError(true)}
          onLoad={() => setImageError(false)}
        />
      </div>
    );
  }

  // Fallback to initials
  if (showFallback) {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
        {getInitials(name)}
      </div>
    );
  }

  // No fallback, return null
  return null;
}

export default Avatar;
