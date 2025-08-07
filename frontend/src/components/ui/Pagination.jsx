import React from 'react';

const Pagination = ({
  // Basic props
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  
  // Display options
  showFirstLast = true,
  showPrevNext = true,
  showPageNumbers = true,
  showInfo = true,
  showPageSizeSelector = false,
  
  // Pagination logic
  siblingCount = 1,
  boundaryCount = 1,
  
  // Page size options
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  onPageSizeChange,
  
  // Total items for info display
  totalItems = 0,
  
  // Styling props
  size = 'md',
  variant = 'default',
  className = '',
  
  // Accessibility
  'aria-label': ariaLabel = 'Pagination navigation',
  
  // Disabled state
  disabled = false,
  
  ...props
}) => {
  // Size variants
  const sizeClasses = {
    sm: {
      button: 'h-8 w-8 text-xs',
      container: 'space-x-1',
      info: 'text-xs'
    },
    md: {
      button: 'h-10 w-10 text-sm',
      container: 'space-x-2',
      info: 'text-sm'
    },
    lg: {
      button: 'h-12 w-12 text-base',
      container: 'space-x-2',
      info: 'text-base'
    }
  };

  // Variant styles
  const variantClasses = {
    default: {
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
      disabled: 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
    },
    outlined: {
      active: 'bg-blue-50 text-blue-600 border-blue-600',
      inactive: 'bg-white text-gray-700 border-gray-300 hover:border-gray-400',
      disabled: 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
    },
    minimal: {
      active: 'bg-blue-600 text-white',
      inactive: 'text-gray-700 hover:bg-gray-100',
      disabled: 'text-gray-400 cursor-not-allowed'
    }
  };

  // Generate page numbers array
  const generatePageNumbers = () => {
    const pages = [];
    
    // Calculate start and end pages
    const startPage = Math.max(1, currentPage - siblingCount);
    const endPage = Math.min(totalPages, currentPage + siblingCount);
    
    // Add first page and ellipsis if needed
    if (startPage > boundaryCount + 1) {
      for (let i = 1; i <= boundaryCount; i++) {
        pages.push(i);
      }
      if (startPage > boundaryCount + 2) {
        pages.push('...');
      }
    }
    
    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      if (i >= 1 && i <= totalPages) {
        pages.push(i);
      }
    }
    
    // Add last page and ellipsis if needed
    if (endPage < totalPages - boundaryCount) {
      if (endPage < totalPages - boundaryCount - 1) {
        pages.push('...');
      }
      for (let i = totalPages - boundaryCount + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (disabled || page === currentPage || page < 1 || page > totalPages) return;
    if (onPageChange) onPageChange(page);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    if (onPageSizeChange) onPageSizeChange(newPageSize);
  };

  // Calculate info text
  const getInfoText = () => {
    if (totalItems === 0) return 'No items';
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    
    return `Showing ${startItem}-${endItem} of ${totalItems} items`;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${className}`} {...props}>
      {/* Info text */}
      {showInfo && (
        <div className={`${sizeClasses[size].info} text-gray-700 mb-4 sm:mb-0`}>
          {getInfoText()}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        {/* Page size selector */}
        {showPageSizeSelector && (
          <div className="flex items-center space-x-2">
            <label className={`${sizeClasses[size].info} text-gray-700`}>
              Show:
            </label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className={`
                border border-gray-300 rounded-md px-2 py-1 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              `}
              disabled={disabled}
            >
              {pageSizeOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className={`${sizeClasses[size].info} text-gray-700`}>
              per page
            </span>
          </div>
        )}

        {/* Pagination controls */}
        <nav aria-label={ariaLabel}>
          <div className={`flex items-center ${sizeClasses[size].container}`}>
            {/* First page button */}
            {showFirstLast && totalPages > 5 && (
              <button
                onClick={() => handlePageChange(1)}
                disabled={disabled || currentPage === 1}
                className={`
                  ${sizeClasses[size].button}
                  border rounded-md transition-colors flex items-center justify-center
                  ${currentPage === 1 || disabled 
                    ? variantClasses[variant].disabled 
                    : variantClasses[variant].inactive}
                `}
                aria-label="Go to first page"
              >
                <i className="fas fa-angle-double-left"></i>
              </button>
            )}

            {/* Previous page button */}
            {showPrevNext && (
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={disabled || currentPage === 1}
                className={`
                  ${sizeClasses[size].button}
                  border rounded-md transition-colors flex items-center justify-center
                  ${currentPage === 1 || disabled 
                    ? variantClasses[variant].disabled 
                    : variantClasses[variant].inactive}
                `}
                aria-label="Go to previous page"
              >
                <i className="fas fa-angle-left"></i>
              </button>
            )}

            {/* Page numbers */}
            {showPageNumbers && pageNumbers.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className={`
                    ${sizeClasses[size].button}
                    flex items-center justify-center text-gray-400
                  `}>
                    ...
                  </span>
                ) : (
                  <button
                    onClick={() => handlePageChange(page)}
                    disabled={disabled}
                    className={`
                      ${sizeClasses[size].button}
                      ${variant === 'minimal' ? 'rounded-md' : 'border rounded-md'}
                      transition-colors flex items-center justify-center font-medium
                      ${page === currentPage 
                        ? variantClasses[variant].active 
                        : disabled 
                          ? variantClasses[variant].disabled
                          : variantClasses[variant].inactive}
                    `}
                    aria-label={`Go to page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}

            {/* Next page button */}
            {showPrevNext && (
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={disabled || currentPage === totalPages}
                className={`
                  ${sizeClasses[size].button}
                  border rounded-md transition-colors flex items-center justify-center
                  ${currentPage === totalPages || disabled 
                    ? variantClasses[variant].disabled 
                    : variantClasses[variant].inactive}
                `}
                aria-label="Go to next page"
              >
                <i className="fas fa-angle-right"></i>
              </button>
            )}

            {/* Last page button */}
            {showFirstLast && totalPages > 5 && (
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={disabled || currentPage === totalPages}
                className={`
                  ${sizeClasses[size].button}
                  border rounded-md transition-colors flex items-center justify-center
                  ${currentPage === totalPages || disabled 
                    ? variantClasses[variant].disabled 
                    : variantClasses[variant].inactive}
                `}
                aria-label="Go to last page"
              >
                <i className="fas fa-angle-double-right"></i>
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
};

// Simple pagination for basic use cases
export const SimplePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = false,
  ...props
}) => {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      showInfo={showInfo}
      showFirstLast={false}
      showPageNumbers={false}
      variant="minimal"
      {...props}
    />
  );
};

// Compact pagination for mobile
export const CompactPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  ...props
}) => {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i className="fas fa-angle-left mr-1"></i>
        Previous
      </button>
      
      <span className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
        <i className="fas fa-angle-right ml-1"></i>
      </button>
    </div>
  );
};

export default Pagination;
