/**
 * Checks if the user prefers reduced motion based on their system settings.
 * This should be used to disable or reduce animations for accessibility.
 *
 * @returns True if the user prefers reduced motion
 *
 * @example
 * ```typescript
 * if (shouldReduceMotion()) {
 *   // Skip animations or use simplified versions
 *   return;
 * }
 * ```
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') {
    return false; // SSR default
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Listens for changes to the user's motion preferences.
 *
 * @param callback - Called when the preference changes
 * @returns A cleanup function to stop listening
 *
 * @example
 * ```typescript
 * const cleanup = onMotionPreferenceChange((prefersReduced) => {
 *   if (prefersReduced) {
 *     // Disable animations
 *   } else {
 *     // Enable animations
 *   }
 * });
 *
 * // Later, when done:
 * cleanup();
 * ```
 */
export function onMotionPreferenceChange(callback: (prefersReduced: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handler = (event: MediaQueryListEvent | MediaQueryList) => {
    callback(event.matches);
  };

  // Initial call
  handler(mediaQuery);

  // Listen for changes
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }
}

/**
 * Announces a message to screen readers using an ARIA live region.
 *
 * @param message - The message to announce
 * @param priority - The priority level ('polite' or 'assertive')
 *
 * @example
 * ```typescript
 * announceToScreenReader('Loading complete', 'polite');
 * announceToScreenReader('Error occurred!', 'assertive');
 * ```
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof document === 'undefined') return;

  // Find or create a live region
  let liveRegion = document.getElementById('atlas-a11y-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'atlas-a11y-live-region';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  } else {
    liveRegion.setAttribute('aria-live', priority);
  }

  // Clear previous message
  liveRegion.textContent = '';

  // Set new message after a brief delay to ensure screen readers pick it up
  const region = liveRegion;
  setTimeout(() => {
    if (region) {
      region.textContent = message;
    }
  }, 100);
}

/**
 * Checks if keyboard navigation is being used.
 * Useful for showing focus indicators only for keyboard users.
 *
 * @returns An object with methods to check and listen for keyboard usage
 *
 * @example
 * ```typescript
 * const keyboardNav = detectKeyboardNavigation();
 *
 * if (keyboardNav.isUsingKeyboard()) {
 *   element.classList.add('keyboard-focus');
 * }
 *
 * const cleanup = keyboardNav.onChange((usingKeyboard) => {
 *   element.classList.toggle('keyboard-focus', usingKeyboard);
 * });
 * ```
 */
export function detectKeyboardNavigation(): {
  isUsingKeyboard: () => boolean;
  onChange: (callback: (usingKeyboard: boolean) => void) => () => void;
} {
  let usingKeyboard = false;
  const listeners: Array<(usingKeyboard: boolean) => void> = [];

  const setKeyboardMode = (value: boolean) => {
    if (usingKeyboard !== value) {
      usingKeyboard = value;
      listeners.forEach((cb) => cb(value));
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      setKeyboardMode(true);
    }
  };

  const handleMouseDown = () => {
    setKeyboardMode(false);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleMouseDown, true);
  }

  return {
    isUsingKeyboard: () => usingKeyboard,
    onChange: (callback) => {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}

/**
 * Ensures an element has proper focus management attributes.
 *
 * @param element - The element to make focusable
 * @param options - Configuration options
 * @returns A cleanup function to restore original attributes
 */
export function makeFocusable(
  element: HTMLElement,
  options: {
    tabIndex?: number;
    role?: string;
    ariaLabel?: string;
  } = {}
): () => void {
  const originalTabIndex = element.getAttribute('tabindex');
  const originalRole = element.getAttribute('role');
  const originalAriaLabel = element.getAttribute('aria-label');

  if (options.tabIndex !== undefined) {
    element.setAttribute('tabindex', String(options.tabIndex));
  }
  if (options.role) {
    element.setAttribute('role', options.role);
  }
  if (options.ariaLabel) {
    element.setAttribute('aria-label', options.ariaLabel);
  }

  return () => {
    if (originalTabIndex !== null) {
      element.setAttribute('tabindex', originalTabIndex);
    } else if (options.tabIndex !== undefined) {
      element.removeAttribute('tabindex');
    }

    if (originalRole !== null) {
      element.setAttribute('role', originalRole);
    } else if (options.role) {
      element.removeAttribute('role');
    }

    if (originalAriaLabel !== null) {
      element.setAttribute('aria-label', originalAriaLabel);
    } else if (options.ariaLabel) {
      element.removeAttribute('aria-label');
    }
  };
}
