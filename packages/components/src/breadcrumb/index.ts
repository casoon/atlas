/**
 * @fileoverview Breadcrumb component - navigation trail
 * @module @atlas/components/breadcrumb
 */

import { generateId } from '../shared/aria';
import { isBrowser } from '../shared/dom';

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Link URL (undefined for current page) */
  href?: string;
  /** Whether this is the current page */
  current?: boolean;
}

export interface BreadcrumbOptions {
  /** Breadcrumb items */
  items?: BreadcrumbItem[];
  /** Custom separator (HTML or text) */
  separator?: string;
  /** ARIA label for nav element */
  ariaLabel?: string;
  /** Callback when item is clicked */
  onNavigate?: (item: BreadcrumbItem, index: number) => void;
}

export interface BreadcrumbState {
  /** Get current items */
  getItems: () => BreadcrumbItem[];
  /** Set items */
  setItems: (items: BreadcrumbItem[]) => void;
  /** Set separator */
  setSeparator: (separator: string) => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  LIST: 'data-atlas-breadcrumb-list',
  ITEM: 'data-atlas-breadcrumb-item',
  LINK: 'data-atlas-breadcrumb-link',
  SEPARATOR: 'data-atlas-breadcrumb-separator',
  CURRENT: 'data-atlas-breadcrumb-current',
} as const;

const CLASSES = {
  ROOT: 'atlas-breadcrumb',
  LIST: 'atlas-breadcrumb-list',
  ITEM: 'atlas-breadcrumb-item',
  LINK: 'atlas-breadcrumb-link',
  SEPARATOR: 'atlas-breadcrumb-separator',
  CURRENT: 'atlas-breadcrumb-current',
} as const;

const DEFAULT_SEPARATOR = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a breadcrumb navigation component
 *
 * @example
 * ```ts
 * const breadcrumb = createBreadcrumb(element, {
 *   items: [
 *     { label: 'Home', href: '/' },
 *     { label: 'Products', href: '/products' },
 *     { label: 'Widget', current: true },
 *   ],
 *   onNavigate: (item) => console.log('Navigate to:', item.href)
 * });
 * ```
 */
export function createBreadcrumb(
  element: HTMLElement,
  options: BreadcrumbOptions = {}
): BreadcrumbState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    items: initialItems = [],
    separator: initialSeparator = DEFAULT_SEPARATOR,
    ariaLabel = 'Breadcrumb',
  } = options;

  // State
  let currentItems = initialItems;
  let currentSeparator = initialSeparator;

  // Elements
  const id = generateId('breadcrumb');
  let list: HTMLElement | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-breadcrumb', '');
    element.setAttribute('role', 'navigation');
    element.setAttribute('aria-label', ariaLabel);
    element.id = id;

    // Find or create list
    list = element.querySelector(`[${ATTRS.LIST}]`);
    if (!list) {
      list = document.createElement('ol');
      list.className = CLASSES.LIST;
      list.setAttribute(ATTRS.LIST, '');
      element.appendChild(list);
    }

    // Render initial items
    if (currentItems.length > 0) {
      render();
    } else {
      // Parse existing items from DOM
      parseExistingItems();
    }
  }

  function parseExistingItems(): void {
    const existingItems = element.querySelectorAll(`[${ATTRS.ITEM}]`);
    currentItems = Array.from(existingItems).map((item) => {
      const link = item.querySelector(`[${ATTRS.LINK}]`) as HTMLAnchorElement;
      const isCurrent = item.hasAttribute(ATTRS.CURRENT) || link?.hasAttribute('aria-current');

      return {
        label: link?.textContent?.trim() ?? item.textContent?.trim() ?? '',
        href: link?.getAttribute('href') ?? undefined,
        current: isCurrent,
      };
    });
  }

  function render(): void {
    if (!list) return;

    list.innerHTML = '';

    currentItems.forEach((item, index) => {
      const li = createItemElement(item, index);
      list?.appendChild(li);

      // Add separator between items (except after last)
      if (index < currentItems.length - 1) {
        const sep = createSeparatorElement();
        list?.appendChild(sep);
      }
    });
  }

  function createItemElement(item: BreadcrumbItem, index: number): HTMLElement {
    const li = document.createElement('li');
    li.className = CLASSES.ITEM;
    li.setAttribute(ATTRS.ITEM, '');

    if (item.current) {
      li.setAttribute(ATTRS.CURRENT, '');
      li.classList.add(CLASSES.CURRENT);

      const span = document.createElement('span');
      span.className = CLASSES.LINK;
      span.setAttribute('role', 'link');
      span.setAttribute('aria-current', 'page');
      span.setAttribute('aria-disabled', 'true');
      span.textContent = item.label;
      li.appendChild(span);
    } else {
      const link = document.createElement('a');
      link.className = CLASSES.LINK;
      link.setAttribute(ATTRS.LINK, '');
      link.href = item.href ?? '#';
      link.textContent = item.label;

      link.addEventListener('click', (e) => {
        if (options.onNavigate) {
          e.preventDefault();
          options.onNavigate(item, index);
        }
      });

      li.appendChild(link);
    }

    return li;
  }

  function createSeparatorElement(): HTMLElement {
    const li = document.createElement('li');
    li.className = CLASSES.SEPARATOR;
    li.setAttribute(ATTRS.SEPARATOR, '');
    li.setAttribute('role', 'presentation');
    li.setAttribute('aria-hidden', 'true');
    li.innerHTML = currentSeparator;
    return li;
  }

  function setItems(items: BreadcrumbItem[]): void {
    currentItems = items;
    render();
  }

  function setSeparator(separator: string): void {
    currentSeparator = separator;
    render();
  }

  function destroy(): void {
    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute('data-atlas-breadcrumb');
    element.removeAttribute('role');
    element.removeAttribute('aria-label');
  }

  // Initialize
  init();

  return {
    getItems: () => [...currentItems],
    setItems,
    setSeparator,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): BreadcrumbState {
  return {
    getItems: () => [],
    setItems: () => {},
    setSeparator: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initBreadcrumbs(root: Document | HTMLElement = document): BreadcrumbState[] {
  if (!isBrowser()) return [];

  const breadcrumbs: BreadcrumbState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-breadcrumb]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-breadcrumb-initialized')) return;

    const itemsAttr = element.getAttribute('data-items');
    const options: BreadcrumbOptions = {
      items: itemsAttr ? JSON.parse(itemsAttr) : undefined,
      separator: element.getAttribute('data-separator') ?? undefined,
      ariaLabel: element.getAttribute('aria-label') ?? undefined,
    };

    const breadcrumb = createBreadcrumb(element, options);
    element.setAttribute('data-atlas-breadcrumb-initialized', '');
    breadcrumbs.push(breadcrumb);
  });

  return breadcrumbs;
}
