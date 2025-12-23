/**
 * Bento Grid Component
 *
 * Modern bento-box style grid layout:
 * - Automatic grid placement
 * - Responsive breakpoints
 * - Animated hover effects
 * - Staggered entrance animations
 * - Drag-to-reorder (optional)
 *
 * @module
 */

import { isBrowser } from '../shared/dom';

// ============================================================================
// Types
// ============================================================================

/** Bento item size */
export type BentoSize = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '2x3' | '3x2';

/** Bento item configuration */
export interface BentoItem {
  /** Unique ID */
  id: string;
  /** Size of the item */
  size?: BentoSize;
  /** Column span (overrides size) */
  colSpan?: number;
  /** Row span (overrides size) */
  rowSpan?: number;
  /** Custom class name */
  className?: string;
  /** HTML content */
  content?: string;
  /** Custom data */
  data?: Record<string, unknown>;
}

/** Bento grid configuration */
export interface BentoGridConfig {
  /** Grid items */
  items?: BentoItem[];
  /** Number of columns (default: 4) */
  columns?: number;
  /** Gap between items in px (default: 16) */
  gap?: number;
  /** Row height in px (default: auto based on aspect ratio) */
  rowHeight?: number | 'auto';
  /** Aspect ratio for auto row height (default: 1) */
  aspectRatio?: number;
  /** Enable hover animations */
  animateHover?: boolean;
  /** Hover scale factor */
  hoverScale?: number;
  /** Enable entrance animation */
  animateEntrance?: boolean;
  /** Entrance stagger delay in ms */
  staggerDelay?: number;
  /** Enable drag to reorder */
  draggable?: boolean;
  /** Responsive breakpoints */
  breakpoints?: {
    sm?: number; // columns at small
    md?: number; // columns at medium
    lg?: number; // columns at large
  };
  /** Callbacks */
  onItemClick?: (item: BentoItem) => void;
  onReorder?: (items: BentoItem[]) => void;
}

/** Bento grid instance */
export interface BentoGrid {
  /** Get all items */
  getItems: () => BentoItem[];
  /** Add item */
  addItem: (item: BentoItem) => void;
  /** Remove item */
  removeItem: (id: string) => void;
  /** Update item */
  updateItem: (id: string, updates: Partial<BentoItem>) => void;
  /** Reorder items */
  reorder: (ids: string[]) => void;
  /** Refresh layout */
  refresh: () => void;
  /** Destroy */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  ROOT: 'data-atlas-bento',
  ITEM: 'data-atlas-bento-item',
  ID: 'data-bento-id',
  SIZE: 'data-bento-size',
} as const;

const CLASSES = {
  ROOT: 'atlas-bento-grid',
  ITEM: 'atlas-bento-item',
  ITEM_CONTENT: 'atlas-bento-item-content',
  DRAGGING: 'atlas-bento-dragging',
  DROP_TARGET: 'atlas-bento-drop-target',
} as const;

/** Size to span mapping */
const SIZE_SPANS: Record<BentoSize, { col: number; row: number }> = {
  '1x1': { col: 1, row: 1 },
  '1x2': { col: 1, row: 2 },
  '2x1': { col: 2, row: 1 },
  '2x2': { col: 2, row: 2 },
  '1x3': { col: 1, row: 3 },
  '3x1': { col: 3, row: 1 },
  '2x3': { col: 2, row: 3 },
  '3x2': { col: 3, row: 2 },
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a Bento Grid instance
 *
 * @example
 * ```typescript
 * // Basic bento grid
 * const grid = createBentoGrid(container, {
 *   columns: 4,
 *   gap: 16,
 *   items: [
 *     { id: '1', size: '2x2', content: '<h2>Featured</h2>' },
 *     { id: '2', size: '1x1', content: '<p>Item 2</p>' },
 *     { id: '3', size: '1x2', content: '<p>Item 3</p>' },
 *     { id: '4', size: '2x1', content: '<p>Item 4</p>' },
 *   ],
 *   animateHover: true,
 *   animateEntrance: true
 * });
 *
 * // Responsive
 * const grid = createBentoGrid(container, {
 *   columns: 4,
 *   breakpoints: {
 *     sm: 1, // 1 column on small screens
 *     md: 2, // 2 columns on medium
 *     lg: 4  // 4 columns on large
 *   }
 * });
 *
 * // With drag reorder
 * const grid = createBentoGrid(container, {
 *   draggable: true,
 *   onReorder: (items) => console.log('New order:', items)
 * });
 * ```
 */
export function createBentoGrid(container: HTMLElement, config: BentoGridConfig = {}): BentoGrid {
  // SSR guard
  if (!isBrowser()) {
    return {
      getItems: () => [],
      addItem: () => {},
      removeItem: () => {},
      updateItem: () => {},
      reorder: () => {},
      refresh: () => {},
      destroy: () => {},
    };
  }

  let {
    items = [],
    columns = 4,
    gap = 16,
    rowHeight = 'auto',
    aspectRatio = 1,
    animateHover = true,
    hoverScale = 1.02,
    animateEntrance = true,
    staggerDelay = 50,
    draggable = false,
    breakpoints,
    onItemClick,
    onReorder,
  } = config;

  let currentColumns = columns;
  let draggedItem: HTMLElement | null = null;

  // Initialize container
  container.setAttribute(ATTRS.ROOT, '');
  container.classList.add(CLASSES.ROOT);

  function updateGridStyles(): void {
    const computedRowHeight =
      rowHeight === 'auto'
        ? `calc((100% - ${(currentColumns - 1) * gap}px) / ${currentColumns} * ${aspectRatio})`
        : `${rowHeight}px`;

    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${currentColumns}, 1fr);
      grid-auto-rows: ${computedRowHeight};
      gap: ${gap}px;
    `;
  }

  function createItemElement(item: BentoItem): HTMLElement {
    const el = document.createElement('div');
    el.className = `${CLASSES.ITEM} ${item.className || ''}`;
    el.setAttribute(ATTRS.ITEM, '');
    el.setAttribute(ATTRS.ID, item.id);

    // Calculate spans
    const size = item.size || '1x1';
    const spans = SIZE_SPANS[size];
    const colSpan = item.colSpan ?? spans.col;
    const rowSpan = item.rowSpan ?? spans.row;

    el.setAttribute(ATTRS.SIZE, size);
    el.style.gridColumn = `span ${Math.min(colSpan, currentColumns)}`;
    el.style.gridRow = `span ${rowSpan}`;

    // Content wrapper
    const contentEl = document.createElement('div');
    contentEl.className = CLASSES.ITEM_CONTENT;
    contentEl.innerHTML = item.content || '';
    contentEl.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 12px;
      overflow: hidden;
      background: var(--bento-bg, #f5f5f5);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    `;

    el.appendChild(contentEl);

    // Hover animation
    if (animateHover) {
      el.addEventListener('mouseenter', () => {
        contentEl.style.transform = `scale(${hoverScale})`;
        contentEl.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
      });
      el.addEventListener('mouseleave', () => {
        contentEl.style.transform = '';
        contentEl.style.boxShadow = '';
      });
    }

    // Click handler
    if (onItemClick) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => onItemClick(item));
    }

    // Drag handlers
    if (draggable) {
      el.draggable = true;
      setupDragHandlers(el, item);
    }

    return el;
  }

  function setupDragHandlers(el: HTMLElement, item: BentoItem): void {
    el.addEventListener('dragstart', (e) => {
      draggedItem = el;
      el.classList.add(CLASSES.DRAGGING);
      e.dataTransfer?.setData('text/plain', item.id);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove(CLASSES.DRAGGING);
      draggedItem = null;
      document.querySelectorAll(`.${CLASSES.DROP_TARGET}`).forEach((t) => {
        t.classList.remove(CLASSES.DROP_TARGET);
      });
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== el) {
        el.classList.add(CLASSES.DROP_TARGET);
      }
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove(CLASSES.DROP_TARGET);
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove(CLASSES.DROP_TARGET);

      if (!draggedItem || draggedItem === el) return;

      const draggedId = draggedItem.getAttribute(ATTRS.ID);
      const targetId = el.getAttribute(ATTRS.ID);

      if (!draggedId || !targetId) return;

      // Reorder items
      const draggedIndex = items.findIndex((i) => i.id === draggedId);
      const targetIndex = items.findIndex((i) => i.id === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, removed);

        // Re-render
        render();
        onReorder?.(items);
      }
    });
  }

  function render(): void {
    container.innerHTML = '';
    updateGridStyles();

    items.forEach((item, index) => {
      const el = createItemElement(item);

      // Entrance animation
      if (animateEntrance) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = '';
        }, index * staggerDelay);
      }

      container.appendChild(el);
    });
  }

  function handleResize(): void {
    if (!breakpoints) return;

    const width = window.innerWidth;
    let newColumns = columns;

    if (breakpoints.lg && width >= 1024) {
      newColumns = breakpoints.lg;
    } else if (breakpoints.md && width >= 768) {
      newColumns = breakpoints.md;
    } else if (breakpoints.sm) {
      newColumns = breakpoints.sm;
    }

    if (newColumns !== currentColumns) {
      currentColumns = newColumns;
      updateGridStyles();

      // Update item spans
      container.querySelectorAll(`[${ATTRS.ITEM}]`).forEach((el) => {
        const size = el.getAttribute(ATTRS.SIZE) as BentoSize;
        if (size) {
          const spans = SIZE_SPANS[size];
          (el as HTMLElement).style.gridColumn = `span ${Math.min(spans.col, currentColumns)}`;
        }
      });
    }
  }

  // Initial render
  if (items.length === 0) {
    // Parse items from existing children
    Array.from(container.children).forEach((child, index) => {
      const el = child as HTMLElement;
      items.push({
        id: el.getAttribute(ATTRS.ID) || `item-${index}`,
        size: (el.getAttribute(ATTRS.SIZE) as BentoSize) || '1x1',
        content: el.innerHTML,
        className: el.className,
      });
    });
  }

  render();

  // Responsive handling
  if (breakpoints) {
    window.addEventListener('resize', handleResize);
    handleResize();
  }

  return {
    getItems(): BentoItem[] {
      return [...items];
    },

    addItem(item: BentoItem): void {
      items.push(item);
      const el = createItemElement(item);

      if (animateEntrance) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px) scale(0.9)';
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        container.appendChild(el);
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.transform = '';
        });
      } else {
        container.appendChild(el);
      }
    },

    removeItem(id: string): void {
      const index = items.findIndex((i) => i.id === id);
      if (index === -1) return;

      items.splice(index, 1);
      const el = container.querySelector(`[${ATTRS.ID}="${id}"]`) as HTMLElement;
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'scale(0.9)';
        setTimeout(() => el.remove(), 300);
      }
    },

    updateItem(id: string, updates: Partial<BentoItem>): void {
      const index = items.findIndex((i) => i.id === id);
      if (index === -1) return;

      items[index] = { ...items[index], ...updates };

      const el = container.querySelector(`[${ATTRS.ID}="${id}"]`) as HTMLElement;
      if (el) {
        const contentEl = el.querySelector(`.${CLASSES.ITEM_CONTENT}`);
        if (contentEl && updates.content !== undefined) {
          contentEl.innerHTML = updates.content;
        }

        if (updates.size || updates.colSpan || updates.rowSpan) {
          const size = updates.size || items[index].size || '1x1';
          const spans = SIZE_SPANS[size];
          const colSpan = updates.colSpan ?? items[index].colSpan ?? spans.col;
          const rowSpan = updates.rowSpan ?? items[index].rowSpan ?? spans.row;

          el.style.gridColumn = `span ${Math.min(colSpan, currentColumns)}`;
          el.style.gridRow = `span ${rowSpan}`;
          el.setAttribute(ATTRS.SIZE, size);
        }
      }
    },

    reorder(ids: string[]): void {
      const newItems: BentoItem[] = [];
      for (const id of ids) {
        const item = items.find((i) => i.id === id);
        if (item) newItems.push(item);
      }
      items = newItems;
      render();
    },

    refresh(): void {
      render();
    },

    destroy(): void {
      if (breakpoints) {
        window.removeEventListener('resize', handleResize);
      }
      container.innerHTML = '';
      container.removeAttribute(ATTRS.ROOT);
      container.classList.remove(CLASSES.ROOT);
      container.style.cssText = '';
    },
  };
}

// ============================================================================
// Web Component
// ============================================================================

export class AtlasBentoGrid extends HTMLElement {
  private _grid: BentoGrid | null = null;

  static get observedAttributes(): string[] {
    return ['columns', 'gap', 'animate'];
  }

  connectedCallback(): void {
    requestAnimationFrame(() => {
      this._init();
    });
  }

  disconnectedCallback(): void {
    this._grid?.destroy();
    this._grid = null;
  }

  private _init(): void {
    this._grid = createBentoGrid(this, {
      columns: parseInt(this.getAttribute('columns') || '4', 10),
      gap: parseInt(this.getAttribute('gap') || '16', 10),
      animateHover: this.getAttribute('animate-hover') !== 'false',
      animateEntrance: this.getAttribute('animate-entrance') !== 'false',
      draggable: this.hasAttribute('draggable'),
    });
  }

  refresh(): void {
    this._grid?.refresh();
  }
}

// Register web component
if (isBrowser() && !customElements.get('atlas-bento-grid')) {
  customElements.define('atlas-bento-grid', AtlasBentoGrid);
}
