import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Breadcrumb = ({
  // Basic props
  items = [],
  separator = 'chevron',
  
  // Styling props
  size = 'md',
  variant = 'default',
  className = '',
  
  // Navigation
  onItemClick,
  maxItems = 0,
  
  // Accessibility
  'aria-label': ariaLabel = 'Breadcrumb navigation',
  
  ...props
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Size variants
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Variant styles
  const variantClasses = {
    default: {
      container: 'text-gray-600',
      active: 'text-gray-900 font-medium',
      link: 'text-gray-500 hover:text-gray-700',
      separator: 'text-gray-400'
    },
    dark: {
      container: 'text-gray-300',
      active: 'text-white font-medium',
      link: 'text-gray-400 hover:text-gray-200',
      separator: 'text-gray-500'
    },
    light: {
      container: 'text-gray-700',
      active: 'text-gray-900 font-semibold',
      link: 'text-gray-600 hover:text-gray-800',
      separator: 'text-gray-300'
    }
  };

  // Separator icons
  const separatorIcons = {
    chevron: 'fas fa-chevron-right',
    arrow: 'fas fa-arrow-right',
    slash: 'fas fa-slash',
    dot: 'fas fa-circle',
    custom: null
  };

  // Get separator element
  const getSeparator = (customSeparator) => {
    if (typeof separator === 'string' && separatorIcons[separator]) {
      return (
        <i className={`${separatorIcons[separator]} ${variantClasses[variant].separator} mx-2 ${
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'
        }`}></i>
      );
    }
    
    if (separator === 'text') {
      return (
        <span className={`${variantClasses[variant].separator} mx-2`}>
          /
        </span>
      );
    }
    
    if (customSeparator) {
      return <span className="mx-2">{customSeparator}</span>;
    }
    
    return separator;
  };

  // Handle item click
  const handleItemClick = (item, index) => {
    if (onItemClick) {
      onItemClick(item, index);
    } else if (item.href && navigate) {
      navigate(item.href);
    }
  };

  // Truncate items if maxItems is set
  const getDisplayItems = () => {
    if (maxItems > 0 && items.length > maxItems) {
      const firstItem = items[0];
      const lastItems = items.slice(-(maxItems - 1));
      return [firstItem, { label: '...', truncated: true }, ...lastItems];
    }
    return items;
  };

  const displayItems = getDisplayItems();

  return (
    <nav 
      aria-label={ariaLabel}
      className={`${variantClasses[variant].container} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <ol className="flex items-center space-x-0">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isActive = item.active || isLast;
          const isTruncated = item.truncated;
          const isClickable = (item.href || onItemClick) && !isActive && !isTruncated;

          return (
            <li key={index} className="flex items-center">
              {/* Breadcrumb item */}
              <div className="flex items-center">
                {isTruncated ? (
                  <span className={`${variantClasses[variant].separator} px-1`}>
                    {item.label}
                  </span>
                ) : isClickable ? (
                  <button
                    type="button"
                    onClick={() => handleItemClick(item, index)}
                    className={`
                      ${variantClasses[variant].link} 
                      hover:underline transition-colors focus:outline-none focus:underline
                      ${item.icon ? 'flex items-center' : ''}
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon && (
                      <span className="mr-1">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </button>
                ) : (
                  <span 
                    className={`
                      ${isActive ? variantClasses[variant].active : variantClasses[variant].link}
                      ${item.icon ? 'flex items-center' : ''}
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon && (
                      <span className="mr-1">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </span>
                )}
              </div>

              {/* Separator */}
              {!isLast && !isTruncated && (
                <span className="flex items-center">
                  {getSeparator(item.separator)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Auto-generating breadcrumb from current route
export const AutoBreadcrumb = ({
  routeConfig = {},
  homeLabel = 'Home',
  homePath = '/',
  excludePaths = [],
  ...props
}) => {
  const location = useLocation();
  
  // Generate breadcrumb items from current path
  const generateBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(segment => segment);
    const items = [];
    
    // Add home item
    if (location.pathname !== homePath) {
      items.push({
        label: homeLabel,
        href: homePath,
        icon: <i className="fas fa-home"></i>
      });
    }
    
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip excluded paths
      if (excludePaths.includes(currentPath)) return;
      
      // Get label from config or format segment
      const config = routeConfig[currentPath] || {};
      const label = config.label || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const icon = config.icon;
      
      const isLast = index === pathSegments.length - 1;
      
      items.push({
        label,
        href: isLast ? undefined : currentPath,
        icon,
        active: isLast
      });
    });
    
    return items;
  };

  return <Breadcrumb items={generateBreadcrumbItems()} {...props} />;
};

// Breadcrumb with dropdown for overflow items
export const DropdownBreadcrumb = ({
  items = [],
  maxVisibleItems = 3,
  ...props
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  if (items.length <= maxVisibleItems) {
    return <Breadcrumb items={items} {...props} />;
  }
  
  const visibleItems = [
    items[0], // First item
    {
      label: (
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center px-2 py-1 text-gray-500 hover:text-gray-700 rounded"
          >
            <i className="fas fa-ellipsis-h"></i>
          </button>
          
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
              {items.slice(1, -1).map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (item.href) window.location.href = item.href;
                    setShowDropdown(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
      dropdown: true
    },
    items[items.length - 1] // Last item
  ];
  
  return <Breadcrumb items={visibleItems} {...props} />;
};

export default Breadcrumb;
