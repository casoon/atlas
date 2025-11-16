/**
 * Creates a throttled version of a function that only executes once per specified interval.
 * Useful for limiting the rate of expensive operations like scroll or mousemove handlers.
 *
 * @param func - The function to throttle
 * @param limit - The minimum time between executions in milliseconds
 * @returns A throttled version of the function with a cancel method
 *
 * @example
 * ```typescript
 * const handleMouseMove = throttle((e: MouseEvent) => {
 *   console.log(e.clientX, e.clientY);
 * }, 16); // ~60fps
 *
 * element.addEventListener('mousemove', handleMouseMove);
 * ```
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T & { cancel: () => void } {
  let inThrottle: boolean = false;
  let lastResult: any;

  const throttled = function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    inThrottle = false;
  };

  return throttled;
}

/**
 * Creates a debounced version of a function that delays execution until after
 * a specified wait time has elapsed since the last invocation.
 *
 * @param func - The function to debounce
 * @param wait - The delay in milliseconds
 * @returns A debounced version of the function with cancel and flush methods
 *
 * @example
 * ```typescript
 * const handleResize = debounce(() => {
 *   console.log('Window resized!');
 * }, 250);
 *
 * window.addEventListener('resize', handleResize);
 *
 * // Cancel pending execution
 * handleResize.cancel();
 *
 * // Execute immediately
 * handleResize.flush();
 * ```
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(lastThis, lastArgs!);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }, wait);
  } as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  debounced.flush = () => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId);
      func.apply(lastThis, lastArgs);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return debounced;
}

/**
 * Creates a rate-limited version using requestAnimationFrame.
 * Ensures the function is called at most once per animation frame.
 * Ideal for handlers that update visual elements.
 *
 * @param func - The function to throttle
 * @returns A throttled version of the function with a cancel method
 *
 * @example
 * ```typescript
 * const updatePosition = rafThrottle((x: number, y: number) => {
 *   element.style.transform = `translate(${x}px, ${y}px)`;
 * });
 *
 * element.addEventListener('mousemove', (e) => {
 *   updatePosition(e.clientX, e.clientY);
 * });
 * ```
 */
export function rafThrottle<T extends (...args: any[]) => void>(
  func: T
): T & { cancel: () => void } {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(lastThis, lastArgs!);
        rafId = null;
        lastArgs = null;
        lastThis = null;
      });
    }
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return throttled;
}

/**
 * Checks if the user prefers reduced motion.
 * This should be used to disable or reduce animations for accessibility.
 *
 * @returns True if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Creates a performance observer to track long tasks.
 * Useful for debugging performance issues.
 *
 * @param callback - Called when a long task is detected
 * @param threshold - Minimum duration in ms to consider a task "long" (default: 50ms)
 * @returns A cleanup function to disconnect the observer
 */
export function observeLongTasks(
  callback: (duration: number) => void,
  threshold: number = 50
): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {}; // No-op for SSR or unsupported browsers
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > threshold) {
          callback(entry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => observer.disconnect();
  } catch (error) {
    // PerformanceObserver might not support 'longtask' in all browsers
    return () => {};
  }
}
