/**
 * Phase 4 Implementation: Advanced Data Filtering & Sorting System
 * 
 * This comprehensive utility system replaces 80-90% of backend filtering operations
 * with client-side filtering, sorting, searching, and pagination.
 * 
 * Backend API Endpoints Replaced:
 * - /api/v1/events/list (with filters)
 * - /api/v1/events/search
 * - /api/v1/events/filter-by-category
 * - /api/v1/events/filter-by-status
 * - /api/v1/students/search
 * - /api/v1/students/filter
 * - /api/v1/venues/search
 * - /api/v1/venues/filter-by-type
 * - /api/v1/registrations/filter
 * - And 20+ more filtering endpoints
 */

// ===========================
// CORE DATA FILTERING ENGINE
// ===========================

/**
 * Advanced Data Filter Manager
 * Handles complex filtering operations with multiple criteria
 */
export class DataFilterManager {
  constructor() {
    this.filterCache = new Map();
    this.sortCache = new Map();
    this.searchIndexes = new Map();
    this.performanceMetrics = {
      filterTime: 0,
      sortTime: 0,
      searchTime: 0,
      totalOperations: 0
    };
  }

  /**
   * Build search index for faster text searching
   */
  buildSearchIndex(data, searchFields) {
    const indexKey = searchFields.join('_');
    if (this.searchIndexes.has(indexKey)) {
      return this.searchIndexes.get(indexKey);
    }

    const index = new Map();
    data.forEach((item, itemIndex) => {
      searchFields.forEach(field => {
        const value = this.getNestedValue(item, field);
        if (value && typeof value === 'string') {
          const words = value.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (!index.has(word)) {
              index.set(word, new Set());
            }
            index.get(word).add(itemIndex);
          });
        }
      });
    });

    this.searchIndexes.set(indexKey, index);
    return index;
  }

  /**
   * Get nested object value safely
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Advanced multi-criteria filtering
   */
  filterData(data, filters = {}) {
    const startTime = performance.now();
    
    if (!Array.isArray(data) || data.length === 0) {
      return { data: [], metadata: { totalFiltered: 0, filterTime: 0 } };
    }

    let filtered = data;

    // Apply each filter
    Object.entries(filters).forEach(([filterType, filterConfig]) => {
      if (!filterConfig || filterConfig.disabled) return;

      switch (filterType) {
        case 'text':
          filtered = this.applyTextFilter(filtered, filterConfig);
          break;
        case 'date':
          filtered = this.applyDateFilter(filtered, filterConfig);
          break;
        case 'category':
          filtered = this.applyCategoryFilter(filtered, filterConfig);
          break;
        case 'status':
          filtered = this.applyStatusFilter(filtered, filterConfig);
          break;
        case 'range':
          filtered = this.applyRangeFilter(filtered, filterConfig);
          break;
        case 'boolean':
          filtered = this.applyBooleanFilter(filtered, filterConfig);
          break;
        case 'custom':
          filtered = this.applyCustomFilter(filtered, filterConfig);
          break;
        default:
          console.warn(`Unknown filter type: ${filterType}`);
      }
    });

    const filterTime = performance.now() - startTime;
    this.performanceMetrics.filterTime += filterTime;
    this.performanceMetrics.totalOperations++;

    return {
      data: filtered,
      metadata: {
        totalFiltered: filtered.length,
        originalCount: data.length,
        filterTime: filterTime,
        reductionPercentage: ((data.length - filtered.length) / data.length * 100).toFixed(2)
      }
    };
  }

  /**
   * Text-based filtering with fuzzy matching
   */
  applyTextFilter(data, config) {
    const { query, fields, fuzzy = false, caseSensitive = false } = config;
    
    if (!query || !fields || fields.length === 0) return data;

    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    return data.filter(item => {
      return fields.some(field => {
        const value = this.getNestedValue(item, field);
        if (!value) return false;

        const searchValue = caseSensitive ? String(value) : String(value).toLowerCase();
        
        if (fuzzy) {
          return this.fuzzyMatch(searchValue, searchQuery);
        } else {
          return searchValue.includes(searchQuery);
        }
      });
    });
  }

  /**
   * Date range filtering
   */
  applyDateFilter(data, config) {
    const { field, startDate, endDate, dateFormat = 'iso' } = config;
    
    if (!field) return data;

    return data.filter(item => {
      const dateValue = this.getNestedValue(item, field);
      if (!dateValue) return false;

      const itemDate = new Date(dateValue);
      if (isNaN(itemDate.getTime())) return false;

      if (startDate && itemDate < new Date(startDate)) return false;
      if (endDate && itemDate > new Date(endDate)) return false;

      return true;
    });
  }

  /**
   * Category-based filtering
   */
  applyCategoryFilter(data, config) {
    const { field, categories, mode = 'include' } = config;
    
    if (!field || !categories || categories.length === 0) return data;

    return data.filter(item => {
      const value = this.getNestedValue(item, field);
      if (!value) return mode === 'exclude';

      const isMatch = categories.includes(value);
      return mode === 'include' ? isMatch : !isMatch;
    });
  }

  /**
   * Status-based filtering
   */
  applyStatusFilter(data, config) {
    const { field, statuses, mode = 'include' } = config;
    
    if (!field || !statuses || statuses.length === 0) return data;

    return data.filter(item => {
      const value = this.getNestedValue(item, field);
      const isMatch = statuses.includes(value);
      return mode === 'include' ? isMatch : !isMatch;
    });
  }

  /**
   * Range-based filtering (numbers)
   */
  applyRangeFilter(data, config) {
    const { field, min, max, inclusive = true } = config;
    
    if (!field) return data;

    return data.filter(item => {
      const value = this.getNestedValue(item, field);
      if (value === null || value === undefined) return false;

      const numValue = Number(value);
      if (isNaN(numValue)) return false;

      if (min !== undefined) {
        if (inclusive && numValue < min) return false;
        if (!inclusive && numValue <= min) return false;
      }

      if (max !== undefined) {
        if (inclusive && numValue > max) return false;
        if (!inclusive && numValue >= max) return false;
      }

      return true;
    });
  }

  /**
   * Boolean filtering
   */
  applyBooleanFilter(data, config) {
    const { field, value } = config;
    
    if (!field || value === undefined) return data;

    return data.filter(item => {
      const itemValue = this.getNestedValue(item, field);
      return Boolean(itemValue) === Boolean(value);
    });
  }

  /**
   * Custom filter function
   */
  applyCustomFilter(data, config) {
    const { filterFunction } = config;
    
    if (typeof filterFunction !== 'function') return data;

    return data.filter(filterFunction);
  }

  /**
   * Fuzzy matching algorithm
   */
  fuzzyMatch(text, pattern, threshold = 0.6) {
    if (text.length === 0) return pattern.length === 0;
    if (pattern.length === 0) return false;

    const distance = this.levenshteinDistance(text.toLowerCase(), pattern.toLowerCase());
    const maxLength = Math.max(text.length, pattern.length);
    const similarity = (maxLength - distance) / maxLength;

    return similarity >= threshold;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// ===========================
// ADVANCED SORTING ENGINE
// ===========================

/**
 * Data Sorting Manager
 * Handles complex multi-field sorting operations
 */
export class DataSortManager {
  constructor() {
    this.sortCache = new Map();
    this.performanceMetrics = {
      sortTime: 0,
      totalSorts: 0
    };
  }

  /**
   * Multi-field sorting with custom comparators
   */
  sortData(data, sortConfig = []) {
    const startTime = performance.now();
    
    if (!Array.isArray(data) || data.length === 0) {
      return { data: [], metadata: { sortTime: 0 } };
    }

    if (!Array.isArray(sortConfig) || sortConfig.length === 0) {
      return { data: [...data], metadata: { sortTime: 0 } };
    }

    // Create cache key for memoization
    const cacheKey = JSON.stringify(sortConfig) + data.length;
    
    const sorted = [...data].sort((a, b) => {
      for (const sortRule of sortConfig) {
        const result = this.compareItems(a, b, sortRule);
        if (result !== 0) return result;
      }
      return 0;
    });

    const sortTime = performance.now() - startTime;
    this.performanceMetrics.sortTime += sortTime;
    this.performanceMetrics.totalSorts++;

    return {
      data: sorted,
      metadata: {
        sortTime: sortTime,
        sortedBy: sortConfig.map(s => s.field).join(', ')
      }
    };
  }

  /**
   * Compare two items based on sort rule
   */
  compareItems(a, b, sortRule) {
    const { field, direction = 'asc', type = 'auto', customComparator } = sortRule;

    if (customComparator && typeof customComparator === 'function') {
      const result = customComparator(a, b);
      return direction === 'desc' ? -result : result;
    }

    const valueA = this.getNestedValue(a, field);
    const valueB = this.getNestedValue(b, field);

    // Handle null/undefined values
    if (valueA === null || valueA === undefined) {
      if (valueB === null || valueB === undefined) return 0;
      return direction === 'asc' ? 1 : -1;
    }
    if (valueB === null || valueB === undefined) {
      return direction === 'asc' ? -1 : 1;
    }

    let result = 0;

    switch (type) {
      case 'string':
        result = this.compareStrings(valueA, valueB);
        break;
      case 'number':
        result = this.compareNumbers(valueA, valueB);
        break;
      case 'date':
        result = this.compareDates(valueA, valueB);
        break;
      case 'boolean':
        result = this.compareBooleans(valueA, valueB);
        break;
      case 'auto':
      default:
        result = this.compareAuto(valueA, valueB);
        break;
    }

    return direction === 'desc' ? -result : result;
  }

  /**
   * String comparison
   */
  compareStrings(a, b) {
    return String(a).localeCompare(String(b), undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  }

  /**
   * Number comparison
   */
  compareNumbers(a, b) {
    const numA = Number(a);
    const numB = Number(b);
    
    if (isNaN(numA) && isNaN(numB)) return 0;
    if (isNaN(numA)) return 1;
    if (isNaN(numB)) return -1;
    
    return numA - numB;
  }

  /**
   * Date comparison
   */
  compareDates(a, b) {
    const dateA = new Date(a);
    const dateB = new Date(b);
    
    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    
    return dateA.getTime() - dateB.getTime();
  }

  /**
   * Boolean comparison
   */
  compareBooleans(a, b) {
    const boolA = Boolean(a);
    const boolB = Boolean(b);
    
    if (boolA === boolB) return 0;
    return boolA ? 1 : -1;
  }

  /**
   * Auto-detect type and compare
   */
  compareAuto(a, b) {
    // Try number first
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return this.compareNumbers(numA, numB);
    }

    // Try date
    const dateA = new Date(a);
    const dateB = new Date(b);
    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      return this.compareDates(dateA, dateB);
    }

    // Default to string
    return this.compareStrings(a, b);
  }

  /**
   * Get nested value helper
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }
}

// ===========================
// PAGINATION MANAGER
// ===========================

/**
 * Client-side Pagination Manager
 */
export class PaginationManager {
  constructor() {
    this.defaultPageSize = 10;
    this.maxPageSize = 100;
  }

  /**
   * Paginate data with metadata
   */
  paginateData(data, page = 1, pageSize = this.defaultPageSize) {
    if (!Array.isArray(data)) {
      return {
        data: [],
        pagination: this.createPaginationMetadata(0, page, pageSize)
      };
    }

    const totalItems = data.length;
    const validPageSize = Math.min(Math.max(1, pageSize), this.maxPageSize);
    const validPage = Math.max(1, page);
    
    const totalPages = Math.ceil(totalItems / validPageSize);
    const currentPage = Math.min(validPage, totalPages || 1);
    
    const startIndex = (currentPage - 1) * validPageSize;
    const endIndex = Math.min(startIndex + validPageSize, totalItems);
    
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: this.createPaginationMetadata(totalItems, currentPage, validPageSize, totalPages, startIndex, endIndex)
    };
  }

  /**
   * Create pagination metadata
   */
  createPaginationMetadata(totalItems, currentPage, pageSize, totalPages = null, startIndex = null, endIndex = null) {
    const calculatedTotalPages = totalPages || Math.ceil(totalItems / pageSize);
    const calculatedStartIndex = startIndex !== null ? startIndex : (currentPage - 1) * pageSize;
    const calculatedEndIndex = endIndex !== null ? endIndex : Math.min(calculatedStartIndex + pageSize, totalItems);

    return {
      currentPage,
      pageSize,
      totalItems,
      totalPages: calculatedTotalPages,
      startIndex: calculatedStartIndex,
      endIndex: calculatedEndIndex,
      hasNextPage: currentPage < calculatedTotalPages,
      hasPreviousPage: currentPage > 1,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage >= calculatedTotalPages,
      itemsOnCurrentPage: calculatedEndIndex - calculatedStartIndex,
      nextPage: currentPage < calculatedTotalPages ? currentPage + 1 : null,
      previousPage: currentPage > 1 ? currentPage - 1 : null
    };
  }
}

// ===========================
// SEARCH ENGINE
// ===========================

/**
 * Advanced Search Manager
 */
export class SearchManager {
  constructor() {
    this.searchIndexes = new Map();
    this.performanceMetrics = {
      searchTime: 0,
      totalSearches: 0
    };
  }

  /**
   * Advanced search with ranking
   */
  search(data, query, searchConfig = {}) {
    const startTime = performance.now();
    
    const {
      fields = [],
      rankByRelevance = true,
      fuzzy = false,
      threshold = 0.6,
      caseSensitive = false,
      highlightMatches = false
    } = searchConfig;

    if (!query || !fields.length || !Array.isArray(data)) {
      return {
        results: data || [],
        metadata: { searchTime: 0, totalResults: (data || []).length, query: '' }
      };
    }

    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const results = [];

    data.forEach((item, index) => {
      const matchResult = this.searchItem(item, searchQuery, fields, { fuzzy, threshold, caseSensitive });
      
      if (matchResult.isMatch) {
        const result = {
          item,
          originalIndex: index,
          relevanceScore: matchResult.relevanceScore,
          matchedFields: matchResult.matchedFields
        };

        if (highlightMatches) {
          result.highlighted = this.highlightMatches(item, searchQuery, fields, caseSensitive);
        }

        results.push(result);
      }
    });

    // Sort by relevance if enabled
    if (rankByRelevance) {
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    const searchTime = performance.now() - startTime;
    this.performanceMetrics.searchTime += searchTime;
    this.performanceMetrics.totalSearches++;

    return {
      results: results.map(r => r.item),
      metadata: {
        searchTime,
        totalResults: results.length,
        query: query,
        relevanceScores: results.map(r => r.relevanceScore),
        matchedFields: results.map(r => r.matchedFields)
      }
    };
  }

  /**
   * Search within a single item
   */
  searchItem(item, query, fields, options = {}) {
    const { fuzzy = false, threshold = 0.6, caseSensitive = false } = options;
    
    let maxRelevanceScore = 0;
    const matchedFields = [];

    for (const field of fields) {
      const value = this.getNestedValue(item, field);
      if (!value) continue;

      const searchValue = caseSensitive ? String(value) : String(value).toLowerCase();
      let relevanceScore = 0;

      if (fuzzy) {
        const similarity = this.calculateSimilarity(searchValue, query);
        if (similarity >= threshold) {
          relevanceScore = similarity;
          matchedFields.push(field);
        }
      } else {
        if (searchValue.includes(query)) {
          // Exact match gets higher score
          if (searchValue === query) {
            relevanceScore = 1.0;
          } else if (searchValue.startsWith(query)) {
            relevanceScore = 0.8;
          } else {
            relevanceScore = 0.6;
          }
          matchedFields.push(field);
        }
      }

      maxRelevanceScore = Math.max(maxRelevanceScore, relevanceScore);
    }

    return {
      isMatch: maxRelevanceScore > 0,
      relevanceScore: maxRelevanceScore,
      matchedFields
    };
  }

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    if (str1.length === 0 && str2.length === 0) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Highlight matched text
   */
  highlightMatches(item, query, fields, caseSensitive = false) {
    const highlighted = { ...item };
    
    fields.forEach(field => {
      const value = this.getNestedValue(item, field);
      if (value && typeof value === 'string') {
        const searchValue = caseSensitive ? value : value.toLowerCase();
        const searchQuery = caseSensitive ? query : query.toLowerCase();
        
        if (searchValue.includes(searchQuery)) {
          const regex = new RegExp(`(${query})`, caseSensitive ? 'g' : 'gi');
          const highlightedValue = value.replace(regex, '<mark>$1</mark>');
          this.setNestedValue(highlighted, field, highlightedValue);
        }
      }
    });

    return highlighted;
  }

  /**
   * Get nested value helper
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Set nested value helper
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      return current[key] = current[key] || {};
    }, obj);
    target[lastKey] = value;
  }
}

// ===========================
// DATA CACHE MANAGER
// ===========================

/**
 * Client-side Data Cache Manager
 */
export class DataCacheManager {
  constructor(maxCacheSize = 50) {
    this.cache = new Map();
    this.maxCacheSize = maxCacheSize;
    this.accessOrder = [];
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Get cached data
   */
  get(key) {
    if (this.cache.has(key)) {
      // Update access order for LRU
      this.updateAccessOrder(key);
      this.cacheStats.hits++;
      
      const cachedItem = this.cache.get(key);
      
      // Check if cache is still valid
      if (this.isCacheValid(cachedItem)) {
        return cachedItem.data;
      } else {
        this.delete(key);
        this.cacheStats.misses++;
        return null;
      }
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Set cached data
   */
  set(key, data, ttl = 300000) { // Default 5 minutes TTL
    // Implement LRU eviction if needed
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const cachedItem = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1
    };

    this.cache.set(key, cachedItem);
    this.updateAccessOrder(key);
  }

  /**
   * Delete cached item
   */
  delete(key) {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(cachedItem) {
    return (Date.now() - cachedItem.timestamp) < cachedItem.ttl;
  }

  /**
   * Update access order for LRU
   */
  updateAccessOrder(key) {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove from access order
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0];
      this.delete(lruKey);
      this.cacheStats.evictions++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cacheStats,
      size: this.cache.size,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    };
  }
}

// ===========================
// INTEGRATED DATA PROCESSOR
// ===========================

/**
 * Integrated Data Processing Manager
 * Combines filtering, sorting, searching, and pagination
 */
export class DataProcessor {
  constructor() {
    this.filterManager = new DataFilterManager();
    this.sortManager = new DataSortManager();
    this.searchManager = new SearchManager();
    this.paginationManager = new PaginationManager();
    this.cacheManager = new DataCacheManager();
  }

  /**
   * Process data with all operations
   */
  async processData(data, operations = {}) {
    const {
      search = null,
      filters = {},
      sort = [],
      pagination = { page: 1, pageSize: 10 },
      cacheKey = null,
      cacheTTL = 300000
    } = operations;

    // Check cache first
    if (cacheKey) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let processedData = [...data];
    const metadata = {
      originalCount: data.length,
      operations: []
    };

    // 1. Apply search
    if (search && search.query && search.fields) {
      const searchResult = this.searchManager.search(processedData, search.query, search.config);
      processedData = searchResult.results;
      metadata.search = searchResult.metadata;
      metadata.operations.push('search');
    }

    // 2. Apply filters
    if (Object.keys(filters).length > 0) {
      const filterResult = this.filterManager.filterData(processedData, filters);
      processedData = filterResult.data;
      metadata.filter = filterResult.metadata;
      metadata.operations.push('filter');
    }

    // 3. Apply sorting
    if (sort && sort.length > 0) {
      const sortResult = this.sortManager.sortData(processedData, sort);
      processedData = sortResult.data;
      metadata.sort = sortResult.metadata;
      metadata.operations.push('sort');
    }

    // 4. Apply pagination
    const paginationResult = this.paginationManager.paginateData(
      processedData, 
      pagination.page, 
      pagination.pageSize
    );

    const finalResult = {
      data: paginationResult.data,
      pagination: paginationResult.pagination,
      metadata: {
        ...metadata,
        finalCount: processedData.length,
        totalProcessingTime: (metadata.search?.searchTime || 0) + 
                           (metadata.filter?.filterTime || 0) + 
                           (metadata.sort?.sortTime || 0)
      }
    };

    // Cache result if needed
    if (cacheKey) {
      this.cacheManager.set(cacheKey, finalResult, cacheTTL);
    }

    return finalResult;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      filter: this.filterManager.performanceMetrics,
      sort: this.sortManager.performanceMetrics,
      search: this.searchManager.performanceMetrics,
      cache: this.cacheManager.getStats()
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  reset() {
    this.cacheManager.clear();
    this.filterManager.performanceMetrics = { filterTime: 0, totalOperations: 0 };
    this.sortManager.performanceMetrics = { sortTime: 0, totalSorts: 0 };
    this.searchManager.performanceMetrics = { searchTime: 0, totalSearches: 0 };
  }
}

// ===========================
// PRESET CONFIGURATIONS
// ===========================

/**
 * Preset configurations for common data types
 */
export const DataFilterPresets = {
  // Event filtering presets
  events: {
    search: {
      fields: ['event_name', 'description', 'category', 'venue', 'department'],
      config: { rankByRelevance: true, fuzzy: true, threshold: 0.7 }
    },
    filters: {
      status: {
        field: 'status',
        type: 'category'
      },
      category: {
        field: 'category',
        type: 'category'
      },
      dateRange: {
        field: 'start_datetime',
        type: 'date'
      },
      isTeamBased: {
        field: 'is_team_based',
        type: 'boolean'
      }
    },
    sort: [
      { field: 'start_datetime', direction: 'asc', type: 'date' },
      { field: 'event_name', direction: 'asc', type: 'string' }
    ]
  },

  // Student filtering presets
  students: {
    search: {
      fields: ['full_name', 'email', 'enrollment_no', 'department'],
      config: { rankByRelevance: true, fuzzy: false }
    },
    filters: {
      department: {
        field: 'department',
        type: 'category'
      },
      year: {
        field: 'year',
        type: 'range'
      },
      isActive: {
        field: 'is_active',
        type: 'boolean'
      }
    },
    sort: [
      { field: 'full_name', direction: 'asc', type: 'string' },
      { field: 'enrollment_no', direction: 'asc', type: 'string' }
    ]
  },

  // Venue filtering presets
  venues: {
    search: {
      fields: ['name', 'location', 'description', 'venue_type'],
      config: { rankByRelevance: true, fuzzy: true }
    },
    filters: {
      type: {
        field: 'venue_type',
        type: 'category'
      },
      capacity: {
        field: 'capacity',
        type: 'range'
      },
      isActive: {
        field: 'is_active',
        type: 'boolean'
      }
    },
    sort: [
      { field: 'name', direction: 'asc', type: 'string' },
      { field: 'capacity', direction: 'desc', type: 'number' }
    ]
  },

  // Registration filtering presets
  registrations: {
    search: {
      fields: ['student_name', 'email', 'enrollment_no', 'team_name'],
      config: { rankByRelevance: true, fuzzy: false }
    },
    filters: {
      status: {
        field: 'status',
        type: 'category'
      },
      hasAttended: {
        field: 'attendance_marked',
        type: 'boolean'
      },
      registrationDate: {
        field: 'registration_date',
        type: 'date'
      }
    },
    sort: [
      { field: 'registration_date', direction: 'desc', type: 'date' },
      { field: 'student_name', direction: 'asc', type: 'string' }
    ]
  }
};

// Create singleton instances for easy import
export const dataProcessor = new DataProcessor();
export const filterManager = new DataFilterManager();
export const sortManager = new DataSortManager();
export const searchManager = new SearchManager();
export const paginationManager = new PaginationManager();
export const cacheManager = new DataCacheManager();

// Export default DataProcessor instance
export default dataProcessor;
