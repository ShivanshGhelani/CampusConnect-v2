/**
 * Phase 4 React Hooks: Advanced Data Filtering & Operations
 * 
 * Custom React hooks for seamless integration of Phase 4 data filtering,
 * sorting, searching, and pagination with React components.
 * 
 * These hooks replace multiple backend API calls with client-side operations,
 * providing instant filtering and improved user experience.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  dataProcessor, 
  filterManager, 
  sortManager, 
  searchManager, 
  paginationManager,
  cacheManager,
  DataFilterPresets 
} from '../utils/dataFilteringUtils';

// ===========================
// CORE DATA PROCESSING HOOK
// ===========================

/**
 * Main data processing hook
 * Provides comprehensive data filtering, sorting, searching, and pagination
 */
export const useDataProcessor = (initialData = [], options = {}) => {
  const {
    defaultPageSize = 10,
    cachePrefix = 'data_',
    enableCaching = true,
    presetType = null
  } = options;

  // State management
  const [data, setData] = useState(initialData);
  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Processing configuration state
  const [searchConfig, setSearchConfig] = useState({
    query: '',
    fields: [],
    config: { rankByRelevance: true, fuzzy: false }
  });

  const [filterConfig, setFilterConfig] = useState({});
  const [sortConfig, setSortConfig] = useState([]);
  const [paginationConfig, setPaginationConfig] = useState({
    page: 1,
    pageSize: defaultPageSize
  });

  // Metadata and performance tracking
  const [metadata, setMetadata] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // Use preset configuration if specified
  const presetConfig = useMemo(() => {
    if (presetType && DataFilterPresets[presetType]) {
      return DataFilterPresets[presetType];
    }
    return null;
  }, [presetType]);

  // Initialize with preset if available
  useEffect(() => {
    if (presetConfig) {
      if (presetConfig.search) {
        setSearchConfig(prev => ({ ...prev, ...presetConfig.search }));
      }
      if (presetConfig.sort) {
        setSortConfig(presetConfig.sort);
      }
    }
  }, [presetConfig]);

  // Process data whenever configuration changes
  const processData = useCallback(async () => {
    if (!Array.isArray(data) || data.length === 0) {
      setProcessedData([]);
      setMetadata({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = enableCaching ? 
        `${cachePrefix}${JSON.stringify({ searchConfig, filterConfig, sortConfig, paginationConfig })}` : 
        null;

      const operations = {
        search: searchConfig.query ? searchConfig : null,
        filters: filterConfig,
        sort: sortConfig,
        pagination: paginationConfig,
        cacheKey,
        cacheTTL: 300000 // 5 minutes
      };

      const result = await dataProcessor.processData(data, operations);
      
      setProcessedData(result.data);
      setMetadata(result.metadata);
      setPerformanceMetrics(dataProcessor.getPerformanceMetrics());

    } catch (err) {
      setError(err.message);
      
    } finally {
      setLoading(false);
    }
  }, [data, searchConfig, filterConfig, sortConfig, paginationConfig, enableCaching, cachePrefix]);

  // Auto-process when dependencies change
  useEffect(() => {
    processData();
  }, [processData]);

  // Update source data
  const updateData = useCallback((newData) => {
    setData(Array.isArray(newData) ? newData : []);
  }, []);

  // Search functions
  const setSearch = useCallback((query, fields = null) => {
    setSearchConfig(prev => ({
      ...prev,
      query: query || '',
      fields: fields || prev.fields
    }));
    setPaginationConfig(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const clearSearch = useCallback(() => {
    setSearchConfig(prev => ({ ...prev, query: '' }));
  }, []);

  // Filter functions
  const setFilter = useCallback((filterKey, filterValue) => {
    setFilterConfig(prev => ({
      ...prev,
      [filterKey]: filterValue
    }));
    setPaginationConfig(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const removeFilter = useCallback((filterKey) => {
    setFilterConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig[filterKey];
      return newConfig;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilterConfig({});
    setPaginationConfig(prev => ({ ...prev, page: 1 }));
  }, []);

  // Sort functions
  const setSort = useCallback((field, direction = 'asc', type = 'auto') => {
    setSortConfig([{ field, direction, type }]);
  }, []);

  const addSort = useCallback((field, direction = 'asc', type = 'auto') => {
    setSortConfig(prev => [...prev, { field, direction, type }]);
  }, []);

  const clearSort = useCallback(() => {
    setSortConfig([]);
  }, []);

  // Pagination functions
  const setPage = useCallback((page) => {
    setPaginationConfig(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize) => {
    setPaginationConfig(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const nextPage = useCallback(() => {
    setPaginationConfig(prev => ({
      ...prev,
      page: prev.page + 1
    }));
  }, []);

  const previousPage = useCallback(() => {
    setPaginationConfig(prev => ({
      ...prev,
      page: Math.max(1, prev.page - 1)
    }));
  }, []);

  // Reset all configurations
  const reset = useCallback(() => {
    setSearchConfig({
      query: '',
      fields: presetConfig?.search?.fields || [],
      config: presetConfig?.search?.config || { rankByRelevance: true, fuzzy: false }
    });
    setFilterConfig({});
    setSortConfig(presetConfig?.sort || []);
    setPaginationConfig({ page: 1, pageSize: defaultPageSize });
    setError(null);
  }, [presetConfig, defaultPageSize]);

  return {
    // Data
    data: processedData,
    originalData: data,
    updateData,
    
    // Loading and error states
    loading,
    error,
    
    // Search
    searchQuery: searchConfig.query,
    setSearch,
    clearSearch,
    
    // Filters
    activeFilters: filterConfig,
    setFilter,
    removeFilter,
    clearFilters,
    
    // Sorting
    sortConfig,
    setSort,
    addSort,
    clearSort,
    
    // Pagination
    pagination: metadata.pagination || {},
    currentPage: paginationConfig.page,
    pageSize: paginationConfig.pageSize,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    
    // Metadata and performance
    metadata,
    performanceMetrics,
    
    // Utility functions
    reset,
    refresh: processData
  };
};

// ===========================
// SPECIALIZED HOOKS
// ===========================

/**
 * Hook for event data processing
 */
export const useEventFiltering = (events = []) => {
  return useDataProcessor(events, {
    presetType: 'events',
    defaultPageSize: 12,
    cachePrefix: 'events_'
  });
};

/**
 * Hook for student data processing
 */
export const useStudentFiltering = (students = []) => {
  return useDataProcessor(students, {
    presetType: 'students',
    defaultPageSize: 20,
    cachePrefix: 'students_'
  });
};

/**
 * Hook for venue data processing
 */
export const useVenueFiltering = (venues = []) => {
  return useDataProcessor(venues, {
    presetType: 'venues',
    defaultPageSize: 15,
    cachePrefix: 'venues_'
  });
};

/**
 * Hook for registration data processing
 */
export const useRegistrationFiltering = (registrations = []) => {
  return useDataProcessor(registrations, {
    presetType: 'registrations',
    defaultPageSize: 25,
    cachePrefix: 'registrations_'
  });
};

// ===========================
// SEARCH-SPECIFIC HOOKS
// ===========================

/**
 * Dedicated search hook with debouncing
 */
export const useSearch = (data = [], searchFields = [], options = {}) => {
  const {
    debounceMs = 300,
    fuzzy = false,
    threshold = 0.6,
    rankByRelevance = true
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(data);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState({});

  const debounceRef = useRef(null);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults(data);
      setSearchMetadata({});
      return;
    }

    setIsSearching(true);

    try {
      const searchResult = searchManager.search(data, searchQuery, {
        fields: searchFields,
        fuzzy,
        threshold,
        rankByRelevance,
        highlightMatches: true
      });

      setResults(searchResult.results);
      setSearchMetadata(searchResult.metadata);
    } catch (error) {
      
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [data, searchFields, fuzzy, threshold, rankByRelevance]);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  // Update query and trigger debounced search
  const updateQuery = useCallback((newQuery) => {
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(data);
    setSearchMetadata({});
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, [data]);

  // Update results when data changes
  useEffect(() => {
    if (!query) {
      setResults(data);
    } else {
      debouncedSearch(query);
    }
  }, [data, query, debouncedSearch]);

  return {
    query,
    setQuery: updateQuery,
    clearSearch,
    results,
    isSearching,
    metadata: searchMetadata,
    resultCount: results.length
  };
};

// ===========================
// FILTER-SPECIFIC HOOKS
// ===========================

/**
 * Multi-filter management hook
 */
export const useFilters = (data = [], initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [filteredData, setFilteredData] = useState(data);
  const [filterMetadata, setFilterMetadata] = useState({});

  // Apply filters whenever data or filters change
  useEffect(() => {
    if (!Array.isArray(data) || Object.keys(filters).length === 0) {
      setFilteredData(data);
      setFilterMetadata({});
      return;
    }

    const result = filterManager.filterData(data, filters);
    setFilteredData(result.data);
    setFilterMetadata(result.metadata);
  }, [data, filters]);

  // Filter management functions
  const setFilter = useCallback((key, config) => {
    setFilters(prev => ({ ...prev, [key]: config }));
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const toggleFilter = useCallback((key, config) => {
    setFilters(prev => {
      if (prev[key]) {
        const newFilters = { ...prev };
        delete newFilters[key];
        return newFilters;
      } else {
        return { ...prev, [key]: config };
      }
    });
  }, []);

  return {
    data: filteredData,
    filters,
    setFilter,
    removeFilter,
    clearAllFilters,
    toggleFilter,
    metadata: filterMetadata,
    hasActiveFilters: Object.keys(filters).length > 0
  };
};

// ===========================
// PAGINATION-SPECIFIC HOOKS
// ===========================

/**
 * Client-side pagination hook
 */
export const usePagination = (data = [], defaultPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Calculate pagination
  const paginationResult = useMemo(() => {
    return paginationManager.paginateData(data, currentPage, pageSize);
  }, [data, currentPage, pageSize]);

  // Navigation functions
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, paginationResult.pagination.totalPages)));
  }, [paginationResult.pagination.totalPages]);

  const nextPage = useCallback(() => {
    if (paginationResult.pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [paginationResult.pagination.hasNextPage]);

  const previousPage = useCallback(() => {
    if (paginationResult.pagination.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [paginationResult.pagination.hasPreviousPage]);

  const changePageSize = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Reset pagination when data changes significantly
  useEffect(() => {
    if (currentPage > paginationResult.pagination.totalPages && paginationResult.pagination.totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, currentPage, paginationResult.pagination.totalPages]);

  return {
    data: paginationResult.data,
    pagination: paginationResult.pagination,
    currentPage,
    pageSize,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    setPage: goToPage,
    setPageSize: changePageSize
  };
};

// ===========================
// SORT-SPECIFIC HOOKS
// ===========================

/**
 * Multi-column sorting hook
 */
export const useSorting = (data = [], initialSort = []) => {
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [sortedData, setSortedData] = useState(data);
  const [sortMetadata, setSortMetadata] = useState({});

  // Apply sorting whenever data or sort config changes
  useEffect(() => {
    if (!Array.isArray(data) || sortConfig.length === 0) {
      setSortedData([...data]);
      setSortMetadata({});
      return;
    }

    const result = sortManager.sortData(data, sortConfig);
    setSortedData(result.data);
    setSortMetadata(result.metadata);
  }, [data, sortConfig]);

  // Sort management functions
  const setSort = useCallback((field, direction = 'asc', type = 'auto') => {
    setSortConfig([{ field, direction, type }]);
  }, []);

  const addSort = useCallback((field, direction = 'asc', type = 'auto') => {
    setSortConfig(prev => [...prev, { field, direction, type }]);
  }, []);

  const toggleSort = useCallback((field, type = 'auto') => {
    setSortConfig(prev => {
      const existingIndex = prev.findIndex(sort => sort.field === field);
      
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.direction === 'asc') {
          // Change to desc
          const newConfig = [...prev];
          newConfig[existingIndex] = { ...existing, direction: 'desc' };
          return newConfig;
        } else {
          // Remove sort
          return prev.filter((_, index) => index !== existingIndex);
        }
      } else {
        // Add new sort
        return [...prev, { field, direction: 'asc', type }];
      }
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortConfig([]);
  }, []);

  const getSortDirection = useCallback((field) => {
    const sort = sortConfig.find(s => s.field === field);
    return sort ? sort.direction : null;
  }, [sortConfig]);

  return {
    data: sortedData,
    sortConfig,
    setSort,
    addSort,
    toggleSort,
    clearSort,
    getSortDirection,
    metadata: sortMetadata,
    hasActiveSort: sortConfig.length > 0
  };
};

// ===========================
// PERFORMANCE MONITORING HOOK
// ===========================

/**
 * Hook for monitoring data processing performance
 */
export const useDataPerformance = () => {
  const [metrics, setMetrics] = useState({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  const refreshMetrics = useCallback(() => {
    const performanceMetrics = dataProcessor.getPerformanceMetrics();
    setMetrics(performanceMetrics);
  }, []);

  const startMonitoring = useCallback((intervalMs = 5000) => {
    setIsMonitoring(true);
    const interval = setInterval(refreshMetrics, intervalMs);
    
    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [refreshMetrics]);

  const resetMetrics = useCallback(() => {
    dataProcessor.reset();
    refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return {
    metrics,
    refreshMetrics,
    startMonitoring,
    resetMetrics,
    isMonitoring
  };
};

// ===========================
// CACHE MANAGEMENT HOOK
// ===========================

/**
 * Hook for managing client-side data cache
 */
export const useDataCache = () => {
  const [cacheStats, setCacheStats] = useState({});

  const refreshStats = useCallback(() => {
    setCacheStats(cacheManager.getStats());
  }, []);

  const clearCache = useCallback(() => {
    cacheManager.clear();
    refreshStats();
  }, [refreshStats]);

  const getCachedData = useCallback((key) => {
    return cacheManager.get(key);
  }, []);

  const setCachedData = useCallback((key, data, ttl) => {
    cacheManager.set(key, data, ttl);
    refreshStats();
  }, [refreshStats]);

  const deleteCachedData = useCallback((key) => {
    cacheManager.delete(key);
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats: cacheStats,
    refreshStats,
    clearCache,
    getCachedData,
    setCachedData,
    deleteCachedData
  };
};

// Export all hooks
export default {
  useDataProcessor,
  useEventFiltering,
  useStudentFiltering,
  useVenueFiltering,
  useRegistrationFiltering,
  useSearch,
  useFilters,
  usePagination,
  useSorting,
  useDataPerformance,
  useDataCache
};
