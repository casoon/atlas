/**
 * @fileoverview Pagination component - page navigation with prev/next and page numbers
 * @module @atlas/components/pagination
 */

import { generateId } from '../shared/aria.js';
import { isBrowser } from '../shared/dom.js';

// ============================================================================
// Types
// ============================================================================

export interface PaginationOptions {
  /** Current page (1-indexed) */
  page?: number;
  /** Total number of pages */
  total?: number;
  /** Number of sibling pages to show around current */
  siblings?: number;
  /** Show first/last page buttons */
  showEdges?: boolean;
  /** Show prev/next buttons */
  showPrevNext?: boolean;
  /** Callback when page changes */
  onChange?: (page: number) => void;
}

export interface PaginationState {
  /** Get current page */
  getPage: () => number;
  /** Set current page */
  setPage: (page: number) => void;
  /** Get total pages */
  getTotal: () => number;
  /** Set total pages */
  setTotal: (total: number) => void;
  /** Go to next page */
  next: () => void;
  /** Go to previous page */
  prev: () => void;
  /** Go to first page */
  first: () => void;
  /** Go to last page */
  last: () => void;
  /** Check if can go to previous page */
  canPrev: () => boolean;
  /** Check if can go to next page */
  canNext: () => boolean;
  /** Refresh rendering */
  refresh: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  NAV: 'data-atlas-pagination-nav',
  LIST: 'data-atlas-pagination-list',
  ITEM: 'data-atlas-pagination-item',
  PREV: 'data-atlas-pagination-prev',
  NEXT: 'data-atlas-pagination-next',
  FIRST: 'data-atlas-pagination-first',
  LAST: 'data-atlas-pagination-last',
  PAGE: 'data-atlas-pagination-page',
  ELLIPSIS: 'data-atlas-pagination-ellipsis',
} as const;

const CLASSES = {
  ROOT: 'atlas-pagination',
  NAV: 'atlas-pagination-nav',
  LIST: 'atlas-pagination-list',
  ITEM: 'atlas-pagination-item',
  BUTTON: 'atlas-pagination-button',
  BUTTON_NAV: 'atlas-pagination-button--nav',
  BUTTON_PAGE: 'atlas-pagination-button--page',
  BUTTON_ACTIVE: 'atlas-pagination-button--active',
  BUTTON_DISABLED: 'atlas-pagination-button--disabled',
  ELLIPSIS: 'atlas-pagination-ellipsis',
} as const;

const ICON_PREV = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
const ICON_NEXT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
const ICON_FIRST = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>`;
const ICON_LAST = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>`;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a pagination component with page numbers and navigation
 *
 * @example
 * ```ts
 * const pagination = createPagination(element, {
 *   page: 1,
 *   total: 10,
 *   siblings: 1,
 *   onChange: (page) => console.log('Page:', page)
 * });
 *
 * // Navigate
 * pagination.next();
 * pagination.setPage(5);
 * ```
 */
export function createPagination(
  element: HTMLElement,
  options: PaginationOptions = {}
): PaginationState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    page: initialPage = 1,
    total: initialTotal = 1,
    siblings = 1,
    showEdges = false,
    showPrevNext = true,
  } = options;

  // State
  let currentPage = Math.max(1, Math.min(initialPage, initialTotal));
  let totalPages = Math.max(1, initialTotal);

  // Elements
  const id = generateId('pagination');
  let navEl: HTMLElement | null = null;
  let listEl: HTMLElement | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-pagination', '');
    element.id = id;

    // Create nav
    navEl = document.createElement('nav');
    navEl.className = CLASSES.NAV;
    navEl.setAttribute(ATTRS.NAV, '');
    navEl.setAttribute('aria-label', 'Pagination');

    // Create list
    listEl = document.createElement('ul');
    listEl.className = CLASSES.LIST;
    listEl.setAttribute(ATTRS.LIST, '');

    navEl.appendChild(listEl);
    element.appendChild(navEl);

    render();
  }

  function generateRange(): (number | 'ellipsis')[] {
    const range: (number | 'ellipsis')[] = [];

    if (totalPages <= 0) return range;

    // Always show first page
    range.push(1);

    const leftSibling = Math.max(2, currentPage - siblings);
    const rightSibling = Math.min(totalPages - 1, currentPage + siblings);

    // Left ellipsis
    if (leftSibling > 2) {
      range.push('ellipsis');
    }

    // Middle pages
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }

    // Right ellipsis
    if (rightSibling < totalPages - 1) {
      range.push('ellipsis');
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }

  function render(): void {
    if (!listEl) return;

    listEl.innerHTML = '';

    // First button
    if (showEdges) {
      addNavButton('first', ICON_FIRST, 'First page', currentPage <= 1, first);
    }

    // Previous button
    if (showPrevNext) {
      addNavButton('prev', ICON_PREV, 'Previous page', currentPage <= 1, prev);
    }

    // Page numbers
    const range = generateRange();
    range.forEach((item) => {
      if (item === 'ellipsis') {
        addEllipsis();
      } else {
        addPageButton(item, item === currentPage);
      }
    });

    // Next button
    if (showPrevNext) {
      addNavButton('next', ICON_NEXT, 'Next page', currentPage >= totalPages, next);
    }

    // Last button
    if (showEdges) {
      addNavButton('last', ICON_LAST, 'Last page', currentPage >= totalPages, last);
    }
  }

  function addNavButton(
    type: string,
    icon: string,
    label: string,
    disabled: boolean,
    handler: () => void
  ): void {
    const li = document.createElement('li');
    li.className = CLASSES.ITEM;
    li.setAttribute(ATTRS.ITEM, '');

    const button = document.createElement('button');
    button.className = `${CLASSES.BUTTON} ${CLASSES.BUTTON_NAV}`;
    if (disabled) {
      button.classList.add(CLASSES.BUTTON_DISABLED);
    }
    button.type = 'button';
    button.disabled = disabled;
    button.setAttribute('aria-label', label);
    button.setAttribute(`${ATTRS[type.toUpperCase() as keyof typeof ATTRS]}`, '');
    button.innerHTML = icon;

    if (!disabled) {
      button.addEventListener('click', handler);
    }

    li.appendChild(button);
    listEl?.appendChild(li);
  }

  function addPageButton(pageNum: number, isCurrent: boolean): void {
    const li = document.createElement('li');
    li.className = CLASSES.ITEM;
    li.setAttribute(ATTRS.ITEM, '');

    const button = document.createElement('button');
    button.className = `${CLASSES.BUTTON} ${CLASSES.BUTTON_PAGE}`;
    if (isCurrent) {
      button.classList.add(CLASSES.BUTTON_ACTIVE);
    }
    button.type = 'button';
    button.textContent = String(pageNum);
    button.setAttribute(ATTRS.PAGE, String(pageNum));
    button.setAttribute('aria-label', `Page ${pageNum}`);

    if (isCurrent) {
      button.setAttribute('aria-current', 'page');
    }

    button.addEventListener('click', () => goToPage(pageNum));

    li.appendChild(button);
    listEl?.appendChild(li);
  }

  function addEllipsis(): void {
    const li = document.createElement('li');
    li.className = CLASSES.ITEM;
    li.setAttribute(ATTRS.ITEM, '');

    const span = document.createElement('span');
    span.className = CLASSES.ELLIPSIS;
    span.setAttribute(ATTRS.ELLIPSIS, '');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '...';

    li.appendChild(span);
    listEl?.appendChild(li);
  }

  function goToPage(page: number): void {
    if (page < 1 || page > totalPages || page === currentPage) return;

    currentPage = page;
    render();
    options.onChange?.(currentPage);
  }

  function next(): void {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }

  function prev(): void {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }

  function first(): void {
    goToPage(1);
  }

  function last(): void {
    goToPage(totalPages);
  }

  function setPage(page: number): void {
    goToPage(Math.max(1, Math.min(page, totalPages)));
  }

  function setTotal(total: number): void {
    totalPages = Math.max(1, total);
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    render();
  }

  function canPrev(): boolean {
    return currentPage > 1;
  }

  function canNext(): boolean {
    return currentPage < totalPages;
  }

  function refresh(): void {
    render();
  }

  function destroy(): void {
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute('data-atlas-pagination');
    element.innerHTML = '';
  }

  // Initialize
  init();

  return {
    getPage: () => currentPage,
    setPage,
    getTotal: () => totalPages,
    setTotal,
    next,
    prev,
    first,
    last,
    canPrev,
    canNext,
    refresh,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): PaginationState {
  return {
    getPage: () => 1,
    setPage: () => {},
    getTotal: () => 1,
    setTotal: () => {},
    next: () => {},
    prev: () => {},
    first: () => {},
    last: () => {},
    canPrev: () => false,
    canNext: () => false,
    refresh: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

/**
 * Initialize all pagination components in the given root
 *
 * @example
 * ```html
 * <div data-atlas-pagination
 *      data-page="1"
 *      data-total="10"
 *      data-siblings="1"
 *      data-show-edges></div>
 * ```
 */
export function initPaginations(root: Document | HTMLElement = document): PaginationState[] {
  if (!isBrowser()) return [];

  const paginations: PaginationState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-pagination]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-pagination-initialized')) return;

    const options: PaginationOptions = {
      page: parseInt(element.getAttribute('data-page') ?? '1', 10),
      total: parseInt(element.getAttribute('data-total') ?? '1', 10),
      siblings: parseInt(element.getAttribute('data-siblings') ?? '1', 10),
      showEdges: element.hasAttribute('data-show-edges'),
      showPrevNext: element.getAttribute('data-show-prev-next') !== 'false',
    };

    const pagination = createPagination(element, options);
    element.setAttribute('data-atlas-pagination-initialized', '');
    paginations.push(pagination);
  });

  return paginations;
}
