import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Optimized useState hook that prevents unnecessary re-renders
 * Only updates if the new value is actually different
 */
export const useOptimizedState = (initialValue) => {
  const [state, setState] = useState(initialValue);
  
  const setOptimizedState = useCallback((newValue) => {
    setState(prevState => {
      const nextValue = typeof newValue === 'function' ? newValue(prevState) : newValue;
      
      // Deep comparison for objects/arrays, shallow for primitives
      if (typeof nextValue === 'object' && nextValue !== null) {
        return JSON.stringify(nextValue) !== JSON.stringify(prevState) ? nextValue : prevState;
      }
      
      return nextValue !== prevState ? nextValue : prevState;
    });
  }, []);

  return [state, setOptimizedState];
};

/**
 * Debounced state hook - prevents rapid state updates
 * Useful for search inputs, API calls, etc.
 */
export const useDebouncedState = (initialValue, delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef(null);

  const setDebouncedStateValue = useCallback((newValue) => {
    setValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, debouncedValue, setDebouncedStateValue];
};

/**
 * Async operation hook with loading, error, and data states
 * Prevents common async patterns and memory leaks
 */
export const useAsyncOperation = (asyncFunction, dependencies = []) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null
  });
  
  const isMountedRef = useRef(true);
  
  const execute = useCallback(async (...args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await asyncFunction(...args);
      
      if (isMountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
      
      return result;
    } catch (error) {
      if (isMountedRef.current) {
        setState({ data: null, loading: false, error });
      }
      throw error;
    }
  }, dependencies);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { ...state, execute };
};

/**
 * Local storage hook with optimizations
 */
export const useOptimizedLocalStorage = (key, initialValue) => {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Memoized setter function
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      // Only stringify and store if value actually changed
      const currentStored = window.localStorage.getItem(key);
      const newStored = JSON.stringify(valueToStore);
      
      if (currentStored !== newStored) {
        window.localStorage.setItem(key, newStored);
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

/**
 * Previous value hook - useful for comparing with previous render
 */
export const usePrevious = (value) => {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [options]);

  return [targetRef, isIntersecting];
};

/**
 * Optimized event listener hook
 */
export const useEventListener = (eventName, handler, element = window) => {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element?.current || element;
    if (!(targetElement && targetElement.addEventListener)) return;

    const eventListener = (event) => savedHandler.current(event);
    targetElement.addEventListener(eventName, eventListener);

    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
};

/**
 * Memoized object/array hook - prevents recreation on every render
 */
export const useStableMemo = (factory, deps) => {
  const ref = useRef();
  
  return useMemo(() => {
    const newValue = factory();
    
    // Deep comparison for stability
    if (ref.current && JSON.stringify(ref.current) === JSON.stringify(newValue)) {
      return ref.current;
    }
    
    ref.current = newValue;
    return newValue;
  }, deps);
};
