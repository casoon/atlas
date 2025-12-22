/**
 * Keyboard Navigation Utilities
 *
 * Provides keyboard navigation patterns for accessible components:
 * - Roving focus for groups (tabs, menus, radio groups)
 * - Typeahead search for lists
 * - Activation handling (Enter/Space)
 *
 * @module
 */

import { isBrowser } from './dom';

/** Navigation orientation */
export type Orientation = 'horizontal' | 'vertical' | 'both';

/** Options for roving focus behavior */
export interface RovingFocusOptions {
  /** Navigation direction (default: 'horizontal') */
  orientation?: Orientation;
  /** Loop at start/end (default: true) */
  loop?: boolean;
  /** Selector for focusable items */
  itemSelector?: string;
  /** Callback when focus changes */
  onFocusChange?: (element: HTMLElement, index: number) => void;
  /** Enable Home/End keys (default: true) */
  homeEnd?: boolean;
}

/** Roving focus controller */
export interface RovingFocus {
  /** Move focus to specific index */
  setFocus: (index: number) => void;
  /** Get current focused index */
  getCurrentIndex: () => number;
  /** Update items (call after DOM changes) */
  update: () => void;
  /** Clean up event listeners */
  destroy: () => void;
}

/** Options for typeahead behavior */
export interface TypeaheadOptions {
  /** Selector for searchable items */
  itemSelector?: string;
  /** Attribute containing searchable text */
  textAttribute?: string;
  /** Timeout between keystrokes in ms (default: 500) */
  timeout?: number;
  /** Callback when match is found */
  onMatch?: (element: HTMLElement, index: number) => void;
}

/** Typeahead controller */
export interface Typeahead {
  /** Reset search string */
  reset: () => void;
  /** Clean up event listeners */
  destroy: () => void;
}

/**
 * Creates roving focus for element groups (tabs, menus, radio groups)
 *
 * Implements WAI-ARIA roving tabindex pattern:
 * - Arrow keys move focus between items
 * - Home/End jump to first/last item
 * - Only focused item has tabindex="0"
 *
 * @example
 * ```typescript
 * const rovingFocus = createRovingFocus(menuContainer, {
 *   orientation: 'vertical',
 *   onFocusChange: (el, index) => console.log('Focused:', index)
 * });
 *
 * // Later cleanup
 * rovingFocus.destroy();
 * ```
 */
export function createRovingFocus(
  container: HTMLElement,
  options: RovingFocusOptions = {}
): RovingFocus {
  // SSR guard
  if (!isBrowser()) {
    return {
      setFocus: () => {},
      getCurrentIndex: () => -1,
      update: () => {},
      destroy: () => {},
    };
  }

  const {
    orientation = 'horizontal',
    loop = true,
    itemSelector = '[role="menuitem"], [role="option"], [role="tab"], [role="radio"]',
    onFocusChange,
    homeEnd = true,
  } = options;

  let currentIndex = 0;

  function getItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(itemSelector)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true'
    );
  }

  function setFocus(index: number): void {
    const items = getItems();
    if (items.length === 0) return;

    // Handle looping or clamping
    if (loop) {
      index = ((index % items.length) + items.length) % items.length;
    } else {
      index = Math.max(0, Math.min(index, items.length - 1));
    }

    // Update tabindex on all items
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === index ? '0' : '-1');
    });

    // Focus the target item
    items[index]?.focus();
    currentIndex = index;

    onFocusChange?.(items[index], index);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const items = getItems();
    if (items.length === 0) return;

    const target = event.target as HTMLElement;
    const currentIdx = items.indexOf(target);
    if (currentIdx === -1) return;

    let handled = false;
    let nextIndex = currentIdx;

    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = currentIdx + 1;
          handled = true;
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = currentIdx - 1;
          handled = true;
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = currentIdx + 1;
          handled = true;
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = currentIdx - 1;
          handled = true;
        }
        break;

      case 'Home':
        if (homeEnd) {
          nextIndex = 0;
          handled = true;
        }
        break;

      case 'End':
        if (homeEnd) {
          nextIndex = items.length - 1;
          handled = true;
        }
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      setFocus(nextIndex);
    }
  }

  function update(): void {
    const items = getItems();
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === currentIndex ? '0' : '-1');
    });
  }

  // Initial setup
  update();

  container.addEventListener('keydown', handleKeyDown);

  return {
    setFocus,
    getCurrentIndex: () => currentIndex,
    update,
    destroy: () => {
      container.removeEventListener('keydown', handleKeyDown);
    },
  };
}

/**
 * Creates typeahead search for lists (select, menus)
 *
 * Allows users to type to search/filter items:
 * - Typing characters builds search string
 * - First matching item is focused
 * - Search resets after timeout
 *
 * @example
 * ```typescript
 * const typeahead = createTypeahead(listContainer, {
 *   onMatch: (el, index) => {
 *     el.focus();
 *   }
 * });
 *
 * // Later cleanup
 * typeahead.destroy();
 * ```
 */
export function createTypeahead(container: HTMLElement, options: TypeaheadOptions = {}): Typeahead {
  // SSR guard
  if (!isBrowser()) {
    return {
      reset: () => {},
      destroy: () => {},
    };
  }

  const {
    itemSelector = '[role="menuitem"], [role="option"]',
    textAttribute = 'data-text',
    timeout = 500,
    onMatch,
  } = options;

  let searchString = '';
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  function getItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(itemSelector)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true'
    );
  }

  function getItemText(item: HTMLElement): string {
    return (item.getAttribute(textAttribute) || item.textContent || '').toLowerCase().trim();
  }

  function search(): void {
    if (!searchString) return;

    const items = getItems();
    const query = searchString.toLowerCase();

    // Find first match starting with query
    const matchIndex = items.findIndex((item) => {
      const text = getItemText(item);
      return text.startsWith(query);
    });

    if (matchIndex !== -1) {
      onMatch?.(items[matchIndex], matchIndex);
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    // Ignore modifier keys and control characters
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length !== 1) return;

    // Only letters, numbers, and space
    if (!/^[a-zA-Z0-9 ]$/.test(event.key)) return;

    event.preventDefault();

    // Reset timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Append to search string
    searchString += event.key;

    // Search
    search();

    // Set timeout to reset
    searchTimeout = setTimeout(() => {
      searchString = '';
    }, timeout);
  }

  function reset(): void {
    searchString = '';
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  return {
    reset,
    destroy: () => {
      container.removeEventListener('keydown', handleKeyDown);
      reset();
    },
  };
}

/**
 * Handles Enter/Space activation for interactive elements
 *
 * @example
 * ```typescript
 * const cleanup = handleActivation(button, () => {
 *   console.log('Activated!');
 * });
 *
 * // Later cleanup
 * cleanup();
 * ```
 */
export function handleActivation(
  element: HTMLElement,
  onActivate: () => void,
  keys: string[] = ['Enter', ' ']
): () => void {
  // SSR guard
  if (!isBrowser()) {
    return () => {};
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (keys.includes(event.key)) {
      event.preventDefault();
      onActivate();
    }
  }

  element.addEventListener('keydown', handleKeyDown);

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Checks if an element can receive focus
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-disabled') === 'true') return false;
  if (element.getAttribute('tabindex') === '-1') return false;

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];

  if (focusableTags.includes(tagName)) {
    // Check for href on anchors
    if (tagName === 'a' && !element.hasAttribute('href')) {
      return element.hasAttribute('tabindex');
    }
    return true;
  }

  return element.hasAttribute('tabindex');
}
