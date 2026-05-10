import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDebounceOptions {
  delay?: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Hook para debounce de valores
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook para debounce de funções
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebounceOptions = {}
): T => {
  const {
    delay = 300,
    maxWait,
    leading = false,
    trailing = true
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    const timeSinceLastInvoke = now - lastInvokeTimeRef.current;

    lastCallTimeRef.current = now;

    // Leading edge
    if (leading && (timeSinceLastInvoke >= delay || timeSinceLastInvoke < 0)) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastInvokeTimeRef.current = now;
      return callback(...args);
    }

    // Trailing edge
    if (trailing) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastInvokeTimeRef.current = Date.now();
        timeoutRef.current = null;
        callback(...args);
      }, delay);

      // Max wait
      if (maxWait && timeSinceLastInvoke >= maxWait) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        lastInvokeTimeRef.current = now;
        return callback(...args);
      }
    }
  }, [callback, delay, leading, trailing, maxWait]) as T;

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Hook para throttle de funções
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutedRef = useRef<number>(0);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecutedRef.current >= delay) {
      lastExecutedRef.current = now;
      return callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastExecutedRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastExecutedRef.current));
    }
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

/**
 * Hook para prevenir múltiplos clicks
 */
export const usePreventDoubleClick = (delay: number = 1000) => {
  const [isDisabled, setIsDisabled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const preventDoubleClick = useCallback((callback?: () => void) => {
    if (isDisabled) return;

    setIsDisabled(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsDisabled(false);
      timeoutRef.current = null;
    }, delay);

    if (callback) {
      callback();
    }
  }, [isDisabled, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isDisabled,
    preventDoubleClick
  };
};
