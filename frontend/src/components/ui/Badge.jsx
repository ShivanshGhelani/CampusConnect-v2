import React from 'react';

const Badge = ({
  // Basic props
  children,
  variant = 'default',
  size = 'md',
  
  // Styling props
  color,
  className = '',
  
  // Content props
  icon,
  dot = false,
  count,
  maxCount = 99,
  
  // Behavior props
  interactive = false,
  onClick,
  onRemove,
  removable = false,
  
  // Shape and style
  rounded = true,
  outline = false,
  
  ...props
}) => {
  // Predefined color variants
  const colorVariants = {
    default: {
      filled: 'bg-gray-100 text-gray-800 border-gray-200',
      outline: 'bg-white text-gray-700 border-gray-300',
      dot: 'bg-gray-500'
    },
    primary: {
      filled: 'bg-blue-100 text-blue-800 border-blue-200',
      outline: 'bg-white text-blue-700 border-blue-300',
      dot: 'bg-blue-500'
    },
    success: {
      filled: 'bg-green-100 text-green-800 border-green-200',
      outline: 'bg-white text-green-700 border-green-300',
      dot: 'bg-green-500'
    },
    warning: {
      filled: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      outline: 'bg-white text-yellow-700 border-yellow-300',
      dot: 'bg-yellow-500'
    },
    error: {
      filled: 'bg-red-100 text-red-800 border-red-200',
      outline: 'bg-white text-red-700 border-red-300',
      dot: 'bg-red-500'
    },
    info: {
      filled: 'bg-blue-100 text-blue-800 border-blue-200',
      outline: 'bg-white text-blue-700 border-blue-300',
      dot: 'bg-blue-500'
    },
    purple: {
      filled: 'bg-purple-100 text-purple-800 border-purple-200',
      outline: 'bg-white text-purple-700 border-purple-300',
      dot: 'bg-purple-500'
    },
    pink: {
      filled: 'bg-pink-100 text-pink-800 border-pink-200',
      outline: 'bg-white text-pink-700 border-pink-300',
      dot: 'bg-pink-500'
    },
    indigo: {
      filled: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      outline: 'bg-white text-indigo-700 border-indigo-300',
      dot: 'bg-indigo-500'
    },
    teal: {
      filled: 'bg-teal-100 text-teal-800 border-teal-200',
      outline: 'bg-white text-teal-700 border-teal-300',
      dot: 'bg-teal-500'
    }
  };

  // Size variants
  const sizeClasses = {
    xs: {
      base: 'px-1.5 py-0.5 text-xs',
      icon: 'text-xs',
      dot: 'w-1.5 h-1.5'
    },
    sm: {
      base: 'px-2 py-0.5 text-xs',
      icon: 'text-xs',
      dot: 'w-2 h-2'
    },
    md: {
      base: 'px-2.5 py-0.5 text-sm',
      icon: 'text-xs',
      dot: 'w-2.5 h-2.5'
    },
    lg: {
      base: 'px-3 py-1 text-sm',
      icon: 'text-sm',
      dot: 'w-3 h-3'
    },
    xl: {
      base: 'px-4 py-1 text-base',
      icon: 'text-sm',
      dot: 'w-4 h-4'
    }
  };

  // Get color classes
  const getColorClasses = () => {
    if (color && !colorVariants[color]) {
      // Custom color provided
      return color;
    }
    
    const colorConfig = colorVariants[color || variant] || colorVariants.default;
    return outline ? colorConfig.outline : colorConfig.filled;
  };

  // Handle count display
  const getDisplayCount = () => {
    if (typeof count !== 'number') return count;
    return count > maxCount ? `${maxCount}+` : count;
  };

  // Handle click
  const handleClick = (e) => {
    if (interactive && onClick) {
      onClick(e);
    }
  };

  // Handle remove
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  // If it's just a dot
  if (dot) {
    const dotColorConfig = colorVariants[color || variant] || colorVariants.default;
    return (
      <span
        className={`
          inline-block rounded-full border-2 border-white
          ${sizeClasses[size].dot}
          ${dotColorConfig.dot}
          ${className}
        `}
        {...props}
      />
    );
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium border
        ${rounded ? 'rounded-full' : 'rounded-md'}
        ${sizeClasses[size].base}
        ${getColorClasses()}
        ${interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `}
      onClick={handleClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {/* Leading icon */}
      {icon && (
        <span className={`mr-1 ${sizeClasses[size].icon}`}>
          {icon}
        </span>
      )}

      {/* Content */}
      {count !== undefined ? getDisplayCount() : children}

      {/* Trailing remove button */}
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          className={`
            ml-1 rounded-full hover:bg-black hover:bg-opacity-10 p-0.5
            transition-colors focus:outline-none focus:ring-1 focus:ring-current
          `}
          aria-label="Remove"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      )}
    </span>
  );
};

// Status Badge - specific for status indicators
export const StatusBadge = ({ 
  status, 
  statusConfig = {},
  ...props 
}) => {
  const defaultStatusConfig = {
    active: { variant: 'success', icon: <i className="fas fa-check-circle"></i>, label: 'Active' },
    inactive: { variant: 'error', icon: <i className="fas fa-times-circle"></i>, label: 'Inactive' },
    pending: { variant: 'warning', icon: <i className="fas fa-clock"></i>, label: 'Pending' },
    draft: { variant: 'default', icon: <i className="fas fa-edit"></i>, label: 'Draft' },
    published: { variant: 'success', icon: <i className="fas fa-globe"></i>, label: 'Published' },
    archived: { variant: 'default', icon: <i className="fas fa-archive"></i>, label: 'Archived' }
  };

  const config = { ...defaultStatusConfig, ...statusConfig };
  const statusData = config[status] || { variant: 'default', label: status };

  return (
    <Badge
      variant={statusData.variant}
      icon={statusData.icon}
      {...props}
    >
      {statusData.label}
    </Badge>
  );
};

// Role Badge - specific for role indicators
export const RoleBadge = ({ 
  role, 
  roleConfig = {},
  ...props 
}) => {
  const defaultRoleConfig = {
    super_admin: { 
      variant: 'error', 
      icon: <i className="fas fa-crown"></i>, 
      label: 'Super Admin' 
    },
    executive_admin: { 
      variant: 'primary', 
      icon: <i className="fas fa-user-shield"></i>, 
      label: 'Executive Admin' 
    },
    content_admin: { 
      variant: 'info', 
      icon: <i className="fas fa-edit"></i>, 
      label: 'Content Admin' 
    },
    event_admin: { 
      variant: 'purple', 
      icon: <i className="fas fa-calendar"></i>, 
      label: 'Event Admin' 
    },
    moderator: { 
      variant: 'warning', 
      icon: <i className="fas fa-gavel"></i>, 
      label: 'Moderator' 
    },
    user: { 
      variant: 'default', 
      icon: <i className="fas fa-user"></i>, 
      label: 'User' 
    }
  };

  const config = { ...defaultRoleConfig, ...roleConfig };
  const roleData = config[role] || { variant: 'default', label: role };

  return (
    <Badge
      variant={roleData.variant}
      icon={roleData.icon}
      {...props}
    >
      {roleData.label}
    </Badge>
  );
};

// Count Badge - for notification counts
export const CountBadge = ({ 
  count, 
  showZero = false, 
  maxCount = 99,
  variant = 'error',
  size = 'sm',
  ...props 
}) => {
  if (!showZero && (!count || count === 0)) {
    return null;
  }

  return (
    <Badge
      variant={variant}
      size={size}
      count={count}
      maxCount={maxCount}
      className="absolute -top-1 -right-1"
      {...props}
    />
  );
};

// Notification Badge - combines element with count badge
export const NotificationBadge = ({ 
  children, 
  count, 
  showZero = false,
  badgeProps = {},
  className = '',
  ...props 
}) => {
  return (
    <div className={`relative inline-block ${className}`} {...props}>
      {children}
      <CountBadge
        count={count}
        showZero={showZero}
        {...badgeProps}
      />
    </div>
  );
};

export default Badge;
