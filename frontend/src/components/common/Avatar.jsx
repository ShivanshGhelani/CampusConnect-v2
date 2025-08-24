import React, { useMemo } from 'react';

function Avatar({ src, size = 'md', name, className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl',
    '3xl': 'w-24 h-24 text-2xl'
  };

  // Memoize initials to prevent recalculation
  const initials = useMemo(() => {
    if (name) {
      const names = name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return 'GU';
  }, [name]);

  // Generate stable timestamp only when src changes
  const imageUrl = useMemo(() => {
    return src ? `${src}?t=${Date.now()}` : null;
  }, [src]);
  
  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center overflow-hidden ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, hide it and show initials instead
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <span 
        className={`text-white font-bold ${imageUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
      >
        {initials}
      </span>
    </div>
  );
}

export default React.memo(Avatar);
