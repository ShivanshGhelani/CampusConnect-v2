import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Performance monitoring hook for React components
 * Tracks render performance, memory usage, and component lifecycle
 */
export const usePerformanceMonitor = (componentName = 'Unknown') => {
  const renderStartTime = useRef(Date.now());
  const renderCount = useRef(0);
  const [performanceData, setPerformanceData] = useState({
    averageRenderTime: 0,
    totalRenders: 0,
    lastRenderTime: 0,
    memoryUsage: 0
  });

  // Track render performance
  useEffect(() => {
    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime.current;
    renderCount.current += 1;

    // Calculate average render time
    const avgRenderTime = renderCount.current === 1 
      ? renderTime 
      : ((performanceData.averageRenderTime * (renderCount.current - 1)) + renderTime) / renderCount.current;

    // Get memory usage if available
    const memoryUsage = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;

    setPerformanceData({
      averageRenderTime: Math.round(avgRenderTime * 100) / 100,
      totalRenders: renderCount.current,
      lastRenderTime: renderTime,
      memoryUsage: Math.round(memoryUsage * 100) / 100
    });

    // Reset for next render
    renderStartTime.current = Date.now();
  });

  // Log performance issues
  useEffect(() => {
    if (performanceData.lastRenderTime > 100) {
      console.warn(`⚠️ Slow render detected in ${componentName}: ${performanceData.lastRenderTime}ms`);
    }
    if (performanceData.totalRenders > 0 && performanceData.totalRenders % 50 === 0) {
      console.info(`📊 ${componentName} Performance Stats:`, performanceData);
    }
  }, [performanceData, componentName]);

  // Performance optimization suggestions
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions = [];
    
    if (performanceData.averageRenderTime > 50) {
      suggestions.push('Consider using React.memo() or useMemo() for expensive calculations');
    }
    
    if (performanceData.totalRenders > 20) {
      suggestions.push('High render count detected - check for unnecessary re-renders');
    }
    
    if (performanceData.memoryUsage > 50) {
      suggestions.push('High memory usage - consider lazy loading or component optimization');
    }
    
    return suggestions;
  }, [performanceData]);

  return {
    ...performanceData,
    getOptimizationSuggestions,
    isPerformant: performanceData.averageRenderTime < 16 && performanceData.memoryUsage < 30
  };
};

/**
 * Network performance monitoring hook
 * Tracks API call performance and suggests optimizations
 */
export const useNetworkMonitor = () => {
  const [networkStats, setNetworkStats] = useState({
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0
  });

  const trackRequest = useCallback((url, responseTime, isSuccess = true) => {
    setNetworkStats(prev => {
      const newTotal = prev.totalRequests + 1;
      const newFailed = isSuccess ? prev.failedRequests : prev.failedRequests + 1;
      const newSlow = responseTime > 1000 ? prev.slowRequests + 1 : prev.slowRequests;
      const newAverage = ((prev.averageResponseTime * prev.totalRequests) + responseTime) / newTotal;

      // Log slow requests
      if (responseTime > 1000) {
        console.warn(`🐌 Slow API request detected: ${url} took ${responseTime}ms`);
      }

      return {
        totalRequests: newTotal,
        failedRequests: newFailed,
        averageResponseTime: Math.round(newAverage),
        slowRequests: newSlow
      };
    });
  }, []);

  const getNetworkHealth = useCallback(() => {
    const failureRate = networkStats.totalRequests > 0 ? networkStats.failedRequests / networkStats.totalRequests : 0;
    const slowRate = networkStats.totalRequests > 0 ? networkStats.slowRequests / networkStats.totalRequests : 0;
    
    if (failureRate > 0.1 || slowRate > 0.2) {
      return 'poor';
    } else if (failureRate > 0.05 || slowRate > 0.1) {
      return 'fair';
    }
    return 'good';
  }, [networkStats]);

  return {
    ...networkStats,
    trackRequest,
    getNetworkHealth,
    failureRate: networkStats.totalRequests > 0 ? (networkStats.failedRequests / networkStats.totalRequests * 100).toFixed(1) : 0,
    slowRate: networkStats.totalRequests > 0 ? (networkStats.slowRequests / networkStats.totalRequests * 100).toFixed(1) : 0
  };
};

/**
 * Bundle size monitoring utility
 */
export const useBundleMonitor = () => {
  const [bundleStats, setBundleStats] = useState({
    estimatedSize: 0,
    loadTime: 0,
    isOptimal: false
  });

  useEffect(() => {
    // Estimate bundle size based on navigation timing
    if (performance.navigation && performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      const transferSize = performance.getEntriesByType('navigation')[0]?.transferSize || 0;
      
      setBundleStats({
        estimatedSize: Math.round(transferSize / 1024), // KB
        loadTime,
        isOptimal: loadTime < 3000 && transferSize < 500000 // < 3s and < 500KB
      });
    }
  }, []);

  return bundleStats;
};

/**
 * Development-only performance logger
 */
export const useDevPerformanceLogger = (enabled = process.env.NODE_ENV === 'development') => {
  useEffect(() => {
    if (!enabled) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          console.log(`📏 Performance measure: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, [enabled]);

  const markStart = useCallback((name) => {
    if (enabled) performance.mark(`${name}-start`);
  }, [enabled]);

  const markEnd = useCallback((name) => {
    if (enabled) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  }, [enabled]);

  return { markStart, markEnd };
};
