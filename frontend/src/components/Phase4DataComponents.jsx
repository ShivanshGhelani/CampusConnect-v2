/**
 * Phase 4 React Components: Advanced Data Filtering & Management UI
 * 
 * Comprehensive React components that provide user interfaces for 
 * advanced data filtering, sorting, searching, and pagination.
 * 
 * These components work seamlessly with Phase 4 hooks to replace
 * backend filtering operations with client-side processing.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  useDataProcessor, 
  useEventFiltering, 
  useStudentFiltering, 
  useVenueFiltering,
  useSearch,
  useFilters,
  usePagination,
  useSorting,
  useDataPerformance 
} from '../hooks/useDataFiltering';

// ===========================
// ADVANCED SEARCH COMPONENT
// ===========================

/**
 * Advanced Search Component with filters and suggestions
 */
export const AdvancedSearchBox = ({ 
  data = [], 
  searchFields = [], 
  onResults = () => {}, 
  placeholder = "Search...",
  showFilters = true,
  fuzzySearch = false,
  showSuggestions = true,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  const {
    query,
    setQuery,
    clearSearch,
    results,
    isSearching,
    metadata
  } = useSearch(data, searchFields, {
    fuzzy: fuzzySearch,
    debounceMs: 300,
    rankByRelevance: true
  });

  // Generate search suggestions
  useEffect(() => {
    if (query.length > 1 && showSuggestions) {
      const uniqueValues = new Set();
      searchFields.forEach(field => {
        data.forEach(item => {
          const value = field.split('.').reduce((obj, key) => obj?.[key], item);
          if (value && typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())) {
            uniqueValues.add(value);
          }
        });
      });
      setSuggestions(Array.from(uniqueValues).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [query, data, searchFields, showSuggestions]);

  // Notify parent of results
  useEffect(() => {
    onResults(results, metadata);
  }, [results, metadata, onResults]);

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          type="text"
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
        />
        
        {/* Loading Indicator */}
        {isSearching && (
          <div className="absolute inset-y-0 right-8 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Clear Button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Suggestions */}
      {suggestions.length > 0 && isExpanded && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 text-sm"
              onClick={() => {
                setQuery(suggestion);
                setIsExpanded(false);
              }}
            >
              <span className="text-gray-900">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search Results Summary */}
      {query && (
        <div className="mt-2 text-xs text-gray-500">
          Found {results.length} results
          {metadata.searchTime && (
            <span> in {Math.round(metadata.searchTime)}ms</span>
          )}
        </div>
      )}
    </div>
  );
};

// ===========================
// FILTER PANEL COMPONENT
// ===========================

/**
 * Advanced Filter Panel with multiple filter types
 */
export const FilterPanel = ({ 
  data = [], 
  filterConfig = {},
  onFiltersChange = () => {},
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  const {
    data: filteredData,
    filters,
    setFilter,
    removeFilter,
    clearAllFilters,
    metadata,
    hasActiveFilters
  } = useFilters(data, activeFilters);

  // Notify parent of filtered data
  useEffect(() => {
    onFiltersChange(filteredData, filters, metadata);
  }, [filteredData, filters, metadata, onFiltersChange]);

  const handleFilterChange = useCallback((filterKey, filterValue) => {
    if (filterValue === null || filterValue === undefined || filterValue === '') {
      removeFilter(filterKey);
    } else {
      setFilter(filterKey, filterValue);
    }
  }, [setFilter, removeFilter]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Filter Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Object.keys(filters).length} active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg 
                className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {Object.entries(filterConfig).map(([filterKey, config]) => (
            <FilterControl
              key={filterKey}
              filterKey={filterKey}
              config={config}
              data={data}
              value={filters[filterKey]}
              onChange={(value) => handleFilterChange(filterKey, value)}
            />
          ))}
        </div>
      )}

      {/* Filter Results Summary */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600">
          Showing {filteredData.length} of {data.length} items
          {metadata.filterTime && (
            <span> (filtered in {Math.round(metadata.filterTime)}ms)</span>
          )}
        </div>
      )}
    </div>
  );
};

// ===========================
// INDIVIDUAL FILTER CONTROLS
// ===========================

/**
 * Individual filter control component
 */
const FilterControl = ({ filterKey, config, data, value, onChange }) => {
  const { type, label, field, options } = config;

  // Generate options for category filters
  const categoryOptions = useMemo(() => {
    if (type === 'category' && !options) {
      const uniqueValues = [...new Set(
        data.map(item => field.split('.').reduce((obj, key) => obj?.[key], item))
          .filter(val => val !== null && val !== undefined)
      )];
      return uniqueValues.map(val => ({ label: val, value: val }));
    }
    return options || [];
  }, [type, options, data, field]);

  switch (type) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label || filterKey}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value?.query || ''}
            onChange={(e) => onChange({
              query: e.target.value,
              fields: [field],
              fuzzy: false
            })}
            placeholder={`Search ${label?.toLowerCase() || filterKey}`}
          />
        </div>
      );

    case 'category':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label || filterKey}
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={value?.categories?.[0] || ''}
            onChange={(e) => onChange(e.target.value ? {
              field,
              categories: [e.target.value],
              mode: 'include'
            } : null)}
          >
            <option value="">All {label?.toLowerCase() || filterKey}</option>
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'boolean':
      return (
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={value?.value || false}
              onChange={(e) => onChange(e.target.checked ? {
                field,
                value: true
              } : null)}
            />
            <span className="ml-2 text-sm text-gray-700">
              {label || filterKey}
            </span>
          </label>
        </div>
      );

    case 'date':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label || filterKey}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={value?.startDate || ''}
              onChange={(e) => onChange({
                field,
                startDate: e.target.value,
                endDate: value?.endDate
              })}
              placeholder="Start date"
            />
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={value?.endDate || ''}
              onChange={(e) => onChange({
                field,
                startDate: value?.startDate,
                endDate: e.target.value
              })}
              placeholder="End date"
            />
          </div>
        </div>
      );

    case 'range':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label || filterKey}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={value?.min || ''}
              onChange={(e) => onChange({
                field,
                min: e.target.value ? Number(e.target.value) : undefined,
                max: value?.max
              })}
              placeholder="Min"
            />
            <input
              type="number"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={value?.max || ''}
              onChange={(e) => onChange({
                field,
                min: value?.min,
                max: e.target.value ? Number(e.target.value) : undefined
              })}
              placeholder="Max"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

// ===========================
// SORTABLE TABLE HEADER
// ===========================

/**
 * Sortable table header component
 */
export const SortableTableHeader = ({ 
  columns = [], 
  sortConfig = [], 
  onSortChange = () => {},
  className = ""
}) => {
  const { getSortDirection, toggleSort } = useSorting([], sortConfig);

  return (
    <thead className={`bg-gray-50 ${className}`}>
      <tr>
        {columns.map((column) => (
          <th
            key={column.field}
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
              column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
            }`}
            onClick={() => {
              if (column.sortable) {
                toggleSort(column.field, column.type);
                onSortChange(column.field, getSortDirection(column.field));
              }
            }}
          >
            <div className="flex items-center space-x-1">
              <span>{column.label}</span>
              {column.sortable && (
                <div className="flex flex-col">
                  <svg 
                    className={`w-3 h-3 ${
                      getSortDirection(column.field) === 'asc' ? 'text-blue-600' : 'text-gray-400'
                    }`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <svg 
                    className={`w-3 h-3 -mt-1 ${
                      getSortDirection(column.field) === 'desc' ? 'text-blue-600' : 'text-gray-400'
                    }`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
};

// ===========================
// PAGINATION COMPONENT
// ===========================

/**
 * Advanced pagination component
 */
export const PaginationControls = ({ 
  pagination = {}, 
  onPageChange = () => {},
  onPageSizeChange = () => {},
  className = ""
}) => {
  const {
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 10,
    hasNextPage = false,
    hasPreviousPage = false,
    startIndex = 0,
    endIndex = 0
  } = pagination;

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    
    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Results Summary */}
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
        <span className="font-medium">{endIndex}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>

      {/* Page Size Selector */}
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-700">Show:</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Pagination Buttons */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {pageNumbers.map((pageNumber, index) => (
          <button
            key={index}
            onClick={() => typeof pageNumber === 'number' && onPageChange(pageNumber)}
            disabled={pageNumber === '...'}
            className={`px-3 py-2 text-sm font-medium border ${
              pageNumber === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : pageNumber === '...'
                ? 'bg-white text-gray-400 border-gray-300 cursor-default'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// ===========================
// DATA TABLE COMPONENT
// ===========================

/**
 * Complete data table with filtering, sorting, and pagination
 */
export const DataTable = ({ 
  data = [], 
  columns = [], 
  searchFields = [],
  filterConfig = {},
  defaultSort = [],
  pageSize = 10,
  className = "",
  onRowClick = () => {},
  renderCell = null
}) => {
  const {
    data: processedData,
    loading,
    searchQuery,
    setSearch,
    activeFilters,
    setFilter,
    removeFilter,
    clearFilters,
    sortConfig,
    setSort,
    pagination,
    setPage,
    setPageSize: updatePageSize,
    metadata
  } = useDataProcessor(data, {
    defaultPageSize: pageSize,
    presetType: null
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdvancedSearchBox
            data={data}
            searchFields={searchFields}
            placeholder="Search..."
            onResults={() => {}} // Already handled by useDataProcessor
          />
        </div>
        <div>
          <FilterPanel
            data={data}
            filterConfig={filterConfig}
            onFiltersChange={() => {}} // Already handled by useDataProcessor
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <SortableTableHeader
              columns={columns}
              sortConfig={sortConfig}
              onSortChange={setSort}
            />
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-gray-500">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : processedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                processedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onRowClick(row, rowIndex)}
                  >
                    {columns.map((column) => (
                      <td key={column.field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderCell ? 
                          renderCell(row, column, rowIndex) : 
                          column.field.split('.').reduce((obj, key) => obj?.[key], row) || '-'
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <PaginationControls
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={updatePageSize}
            />
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {metadata.totalProcessingTime && (
        <div className="text-xs text-gray-500 text-right">
          Processed in {Math.round(metadata.totalProcessingTime)}ms
        </div>
      )}
    </div>
  );
};

// ===========================
// PERFORMANCE DASHBOARD
// ===========================

/**
 * Performance monitoring dashboard
 */
export const PerformanceDashboard = ({ className = "" }) => {
  const { metrics, refreshMetrics, resetMetrics } = useDataPerformance();

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
        <div className="space-x-2">
          <button
            onClick={refreshMetrics}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Refresh
          </button>
          <button
            onClick={resetMetrics}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filter Performance */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(metrics.filter?.filterTime || 0)}ms
          </div>
          <div className="text-sm text-gray-500">Avg Filter Time</div>
          <div className="text-xs text-gray-400">
            {metrics.filter?.totalOperations || 0} operations
          </div>
        </div>

        {/* Sort Performance */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {Math.round(metrics.sort?.sortTime || 0)}ms
          </div>
          <div className="text-sm text-gray-500">Avg Sort Time</div>
          <div className="text-xs text-gray-400">
            {metrics.sort?.totalSorts || 0} sorts
          </div>
        </div>

        {/* Search Performance */}
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(metrics.search?.searchTime || 0)}ms
          </div>
          <div className="text-sm text-gray-500">Avg Search Time</div>
          <div className="text-xs text-gray-400">
            {metrics.search?.totalSearches || 0} searches
          </div>
        </div>

        {/* Cache Performance */}
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {Math.round((metrics.cache?.hitRate || 0) * 100)}%
          </div>
          <div className="text-sm text-gray-500">Cache Hit Rate</div>
          <div className="text-xs text-gray-400">
            {metrics.cache?.hits || 0}/{(metrics.cache?.hits || 0) + (metrics.cache?.misses || 0)} hits
          </div>
        </div>
      </div>
    </div>
  );
};

// Export all components
export default {
  AdvancedSearchBox,
  FilterPanel,
  SortableTableHeader,
  PaginationControls,
  DataTable,
  PerformanceDashboard
};
