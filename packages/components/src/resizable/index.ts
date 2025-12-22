/**
 * @fileoverview Resizable component - resizable panels with drag handles
 * @module @atlas/components/resizable
 */

import { generateId } from '../shared/aria.js';
import { isBrowser } from '../shared/dom.js';

// ============================================================================
// Types
// ============================================================================

export type ResizableDirection = 'horizontal' | 'vertical';

export interface ResizablePanelConfig {
  /** Default size as percentage (0-100) */
  defaultSize?: number;
  /** Minimum size as percentage (0-100) */
  minSize?: number;
  /** Maximum size as percentage (0-100) */
  maxSize?: number;
  /** Whether panel can be collapsed */
  collapsible?: boolean;
  /** Collapsed size as percentage when collapsible (default: 0) */
  collapsedSize?: number;
}

export interface ResizableOptions {
  /** Layout direction */
  direction?: ResizableDirection;
  /** Panel configurations by index */
  panels?: ResizablePanelConfig[];
  /** Keyboard resize step percentage */
  keyboardStep?: number;
  /** Show visible handle grip */
  showHandle?: boolean;
  /** Callback when panel sizes change */
  onResize?: (sizes: number[]) => void;
  /** Callback when resize starts */
  onResizeStart?: () => void;
  /** Callback when resize ends */
  onResizeEnd?: (sizes: number[]) => void;
}

export interface ResizableState {
  /** Get panel sizes as percentages */
  getSizes: () => number[];
  /** Set panel sizes as percentages */
  setSizes: (sizes: number[]) => void;
  /** Get panel count */
  getPanelCount: () => number;
  /** Collapse a panel by index */
  collapse: (panelIndex: number) => void;
  /** Expand a panel by index */
  expand: (panelIndex: number) => void;
  /** Toggle panel collapsed state */
  toggle: (panelIndex: number) => void;
  /** Check if panel is collapsed */
  isCollapsed: (panelIndex: number) => boolean;
  /** Reset to default sizes */
  reset: () => void;
  /** Refresh layout */
  refresh: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  GROUP: 'data-atlas-resizable-group',
  PANEL: 'data-atlas-resizable-panel',
  HANDLE: 'data-atlas-resizable-handle',
} as const;

const CLASSES = {
  ROOT: 'atlas-resizable',
  GROUP: 'atlas-resizable-group',
  PANEL: 'atlas-resizable-panel',
  PANEL_COLLAPSED: 'atlas-resizable-panel--collapsed',
  HANDLE: 'atlas-resizable-handle',
  HANDLE_GRIP: 'atlas-resizable-handle-grip',
  HANDLE_ACTIVE: 'atlas-resizable-handle--active',
  HORIZONTAL: 'atlas-resizable--horizontal',
  VERTICAL: 'atlas-resizable--vertical',
  DRAGGING: 'atlas-resizable--dragging',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a resizable panel group with draggable handles
 *
 * @example
 * ```ts
 * const resizable = createResizable(element, {
 *   direction: 'horizontal',
 *   panels: [
 *     { defaultSize: 25, minSize: 10, collapsible: true },
 *     { defaultSize: 50, minSize: 20 },
 *     { defaultSize: 25, minSize: 10 }
 *   ],
 *   onResize: (sizes) => console.log('Sizes:', sizes)
 * });
 *
 * // Programmatic control
 * resizable.collapse(0);
 * resizable.setSizes([20, 60, 20]);
 * ```
 */
export function createResizable(
  element: HTMLElement,
  options: ResizableOptions = {}
): ResizableState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    direction = 'horizontal',
    panels: panelConfigs = [],
    keyboardStep = 5,
    showHandle = true,
  } = options;

  // State
  let panelEls: HTMLElement[] = [];
  let handleEls: HTMLElement[] = [];
  let sizes: number[] = [];
  const collapsedPanels = new Set<number>();
  let defaultSizes: number[] = [];
  let isDragging = false;
  let activeHandleIndex = -1;
  let dragStartPos = 0;
  let dragStartSizes: number[] = [];

  // Elements
  const id = generateId('resizable');
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT, CLASSES.GROUP);
    element.classList.add(direction === 'horizontal' ? CLASSES.HORIZONTAL : CLASSES.VERTICAL);
    element.setAttribute('data-atlas-resizable', '');
    element.setAttribute(ATTRS.GROUP, '');
    element.setAttribute('role', 'group');
    element.id = id;

    // Find or create panels
    findPanels();

    // Create handles between panels
    createHandles();

    // Initialize sizes
    initializeSizes();

    // Apply initial sizes
    applySizes();
  }

  function findPanels(): void {
    // Find existing panels or treat children as panels
    panelEls = Array.from(element.querySelectorAll<HTMLElement>(`[${ATTRS.PANEL}]`));

    if (panelEls.length === 0) {
      // Treat direct children as panels
      panelEls = Array.from(element.children).filter(
        (child) => child instanceof HTMLElement && !child.hasAttribute(ATTRS.HANDLE)
      ) as HTMLElement[];

      panelEls.forEach((panel, index) => {
        panel.setAttribute(ATTRS.PANEL, String(index));
        panel.classList.add(CLASSES.PANEL);
      });
    }
  }

  function createHandles(): void {
    // Remove any existing handles
    handleEls.forEach((h) => h.remove());
    handleEls = [];

    // Create handle between each pair of panels
    for (let i = 0; i < panelEls.length - 1; i++) {
      const handle = document.createElement('div');
      handle.className = CLASSES.HANDLE;
      handle.setAttribute(ATTRS.HANDLE, String(i));
      handle.setAttribute('role', 'separator');
      handle.setAttribute('tabindex', '0');
      handle.setAttribute(
        'aria-orientation',
        direction === 'horizontal' ? 'vertical' : 'horizontal'
      );
      handle.setAttribute('aria-valuenow', '50');
      handle.setAttribute('aria-valuemin', '0');
      handle.setAttribute('aria-valuemax', '100');
      handle.setAttribute('aria-label', `Resize handle ${i + 1}`);

      if (showHandle) {
        const grip = document.createElement('div');
        grip.className = CLASSES.HANDLE_GRIP;
        handle.appendChild(grip);
      }

      // Insert handle after the panel
      panelEls[i].after(handle);
      handleEls.push(handle);

      // Setup event listeners
      setupHandleEvents(handle, i);
    }
  }

  function setupHandleEvents(handle: HTMLElement, index: number): void {
    // Mouse events
    const handleMouseDown = (e: MouseEvent): void => {
      e.preventDefault();
      startDrag(index, direction === 'horizontal' ? e.clientX : e.clientY);
    };

    handle.addEventListener('mousedown', handleMouseDown);
    cleanups.push(() => handle.removeEventListener('mousedown', handleMouseDown));

    // Touch events
    const handleTouchStart = (e: TouchEvent): void => {
      const touch = e.touches[0];
      startDrag(index, direction === 'horizontal' ? touch.clientX : touch.clientY);
    };

    handle.addEventListener('touchstart', handleTouchStart, { passive: true });
    cleanups.push(() => handle.removeEventListener('touchstart', handleTouchStart));

    // Keyboard events
    const handleKeyDown = (e: KeyboardEvent): void => {
      let delta = 0;

      if (direction === 'horizontal') {
        if (e.key === 'ArrowLeft') delta = -keyboardStep;
        else if (e.key === 'ArrowRight') delta = keyboardStep;
      } else {
        if (e.key === 'ArrowUp') delta = -keyboardStep;
        else if (e.key === 'ArrowDown') delta = keyboardStep;
      }

      if (e.shiftKey) {
        delta *= 2;
      }

      if (delta !== 0) {
        e.preventDefault();
        resizeByDelta(index, delta);
        options.onResize?.(sizes);
      }

      // Home/End for collapse/expand
      if (e.key === 'Home') {
        e.preventDefault();
        const config = panelConfigs[index];
        if (config?.collapsible) {
          collapse(index);
        }
      }

      if (e.key === 'End') {
        e.preventDefault();
        expand(index);
      }
    };

    handle.addEventListener('keydown', handleKeyDown);
    cleanups.push(() => handle.removeEventListener('keydown', handleKeyDown));

    // Double-click to reset
    const handleDblClick = (): void => {
      reset();
    };

    handle.addEventListener('dblclick', handleDblClick);
    cleanups.push(() => handle.removeEventListener('dblclick', handleDblClick));
  }

  function startDrag(handleIndex: number, startPos: number): void {
    isDragging = true;
    activeHandleIndex = handleIndex;
    dragStartPos = startPos;
    dragStartSizes = [...sizes];

    element.classList.add(CLASSES.DRAGGING);
    handleEls[handleIndex].classList.add(CLASSES.HANDLE_ACTIVE);

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    options.onResizeStart?.();

    // Add document listeners
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging) return;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      handleDrag(currentPos);
    };

    const handleTouchMove = (e: TouchEvent): void => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const currentPos = direction === 'horizontal' ? touch.clientX : touch.clientY;
      handleDrag(currentPos);
    };

    const handleEnd = (): void => {
      endDrag();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleEnd);
  }

  function handleDrag(currentPos: number): void {
    if (!isDragging || activeHandleIndex < 0) return;

    const totalSize = direction === 'horizontal' ? element.clientWidth : element.clientHeight;
    const deltaPixels = currentPos - dragStartPos;
    const deltaPercent = (deltaPixels / totalSize) * 100;

    resizeByDelta(activeHandleIndex, deltaPercent, dragStartSizes);
    options.onResize?.(sizes);
  }

  function endDrag(): void {
    if (!isDragging) return;

    isDragging = false;
    element.classList.remove(CLASSES.DRAGGING);

    if (activeHandleIndex >= 0 && handleEls[activeHandleIndex]) {
      handleEls[activeHandleIndex].classList.remove(CLASSES.HANDLE_ACTIVE);
    }

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    activeHandleIndex = -1;
    options.onResizeEnd?.(sizes);
  }

  function resizeByDelta(handleIndex: number, deltaPercent: number, baseSizes?: number[]): void {
    const base = baseSizes ?? sizes;
    const prevIndex = handleIndex;
    const nextIndex = handleIndex + 1;

    if (prevIndex < 0 || nextIndex >= panelEls.length) return;

    const prevConfig = panelConfigs[prevIndex] ?? {};
    const nextConfig = panelConfigs[nextIndex] ?? {};

    const prevMin = prevConfig.minSize ?? 0;
    const prevMax = prevConfig.maxSize ?? 100;
    const nextMin = nextConfig.minSize ?? 0;
    const nextMax = nextConfig.maxSize ?? 100;

    let newPrevSize = base[prevIndex] + deltaPercent;
    let newNextSize = base[nextIndex] - deltaPercent;

    // Apply constraints
    if (newPrevSize < prevMin) {
      newPrevSize = prevMin;
      newNextSize = base[prevIndex] + base[nextIndex] - prevMin;
    }
    if (newPrevSize > prevMax) {
      newPrevSize = prevMax;
      newNextSize = base[prevIndex] + base[nextIndex] - prevMax;
    }
    if (newNextSize < nextMin) {
      newNextSize = nextMin;
      newPrevSize = base[prevIndex] + base[nextIndex] - nextMin;
    }
    if (newNextSize > nextMax) {
      newNextSize = nextMax;
      newPrevSize = base[prevIndex] + base[nextIndex] - nextMax;
    }

    sizes[prevIndex] = newPrevSize;
    sizes[nextIndex] = newNextSize;

    // Update collapsed state
    const prevCollapsedSize = prevConfig.collapsedSize ?? 0;
    const nextCollapsedSize = nextConfig.collapsedSize ?? 0;

    if (prevConfig.collapsible && newPrevSize <= prevCollapsedSize) {
      collapsedPanels.add(prevIndex);
    } else {
      collapsedPanels.delete(prevIndex);
    }

    if (nextConfig.collapsible && newNextSize <= nextCollapsedSize) {
      collapsedPanels.add(nextIndex);
    } else {
      collapsedPanels.delete(nextIndex);
    }

    applySizes();
    updateAriaValues();
  }

  function initializeSizes(): void {
    const panelCount = panelEls.length;

    if (panelCount === 0) {
      sizes = [];
      defaultSizes = [];
      return;
    }

    // Calculate default sizes
    const equalSize = 100 / panelCount;

    sizes = panelEls.map((_, index) => {
      const config = panelConfigs[index];
      return config?.defaultSize ?? equalSize;
    });

    // Normalize to 100%
    const total = sizes.reduce((sum, s) => sum + s, 0);
    if (total !== 100) {
      const factor = 100 / total;
      sizes = sizes.map((s) => s * factor);
    }

    defaultSizes = [...sizes];
  }

  function applySizes(): void {
    panelEls.forEach((panel, index) => {
      const size = sizes[index] ?? 0;
      const _config = panelConfigs[index] ?? {};
      const isCollapsed = collapsedPanels.has(index);

      if (direction === 'horizontal') {
        panel.style.width = `${size}%`;
        panel.style.flexBasis = `${size}%`;
      } else {
        panel.style.height = `${size}%`;
        panel.style.flexBasis = `${size}%`;
      }

      panel.style.flexGrow = '0';
      panel.style.flexShrink = '0';

      // Update collapsed class
      panel.classList.toggle(CLASSES.PANEL_COLLAPSED, isCollapsed);

      // Handle overflow when collapsed
      if (isCollapsed) {
        panel.style.overflow = 'hidden';
      } else {
        panel.style.overflow = '';
      }
    });
  }

  function updateAriaValues(): void {
    handleEls.forEach((handle, index) => {
      const prevSize = sizes[index] ?? 0;
      handle.setAttribute('aria-valuenow', String(Math.round(prevSize)));
    });
  }

  function collapse(panelIndex: number): void {
    const config = panelConfigs[panelIndex];
    if (!config?.collapsible || panelIndex < 0 || panelIndex >= panelEls.length) return;

    const collapsedSize = config.collapsedSize ?? 0;
    const currentSize = sizes[panelIndex];
    const delta = collapsedSize - currentSize;

    // Distribute the freed space to adjacent panels
    if (panelIndex > 0) {
      sizes[panelIndex - 1] -= delta;
    } else if (panelIndex < panelEls.length - 1) {
      sizes[panelIndex + 1] -= delta;
    }

    sizes[panelIndex] = collapsedSize;
    collapsedPanels.add(panelIndex);

    applySizes();
    updateAriaValues();
    options.onResize?.(sizes);
  }

  function expand(panelIndex: number): void {
    if (panelIndex < 0 || panelIndex >= panelEls.length) return;

    if (!collapsedPanels.has(panelIndex)) return;

    const config = panelConfigs[panelIndex] ?? {};
    const targetSize = config.defaultSize ?? defaultSizes[panelIndex] ?? 100 / panelEls.length;
    const currentSize = sizes[panelIndex];
    const delta = targetSize - currentSize;

    // Take space from adjacent panels
    if (panelIndex > 0 && sizes[panelIndex - 1] > delta) {
      sizes[panelIndex - 1] -= delta;
    } else if (panelIndex < panelEls.length - 1) {
      sizes[panelIndex + 1] -= delta;
    }

    sizes[panelIndex] = targetSize;
    collapsedPanels.delete(panelIndex);

    applySizes();
    updateAriaValues();
    options.onResize?.(sizes);
  }

  function toggle(panelIndex: number): void {
    if (collapsedPanels.has(panelIndex)) {
      expand(panelIndex);
    } else {
      collapse(panelIndex);
    }
  }

  function isCollapsed(panelIndex: number): boolean {
    return collapsedPanels.has(panelIndex);
  }

  function getSizes(): number[] {
    return [...sizes];
  }

  function setSizes(newSizes: number[]): void {
    if (newSizes.length !== panelEls.length) {
      console.warn('[Atlas Resizable] Size array length must match panel count');
      return;
    }

    sizes = [...newSizes];
    collapsedPanels.clear();

    // Check for collapsed panels
    panelEls.forEach((_, index) => {
      const config = panelConfigs[index] ?? {};
      const collapsedSize = config.collapsedSize ?? 0;
      if (config.collapsible && sizes[index] <= collapsedSize) {
        collapsedPanels.add(index);
      }
    });

    applySizes();
    updateAriaValues();
    options.onResize?.(sizes);
  }

  function reset(): void {
    sizes = [...defaultSizes];
    collapsedPanels.clear();
    applySizes();
    updateAriaValues();
    options.onResize?.(sizes);
  }

  function refresh(): void {
    findPanels();
    createHandles();
    initializeSizes();
    applySizes();
  }

  function destroy(): void {
    cleanups.forEach((cleanup) => cleanup());

    handleEls.forEach((h) => h.remove());

    element.classList.remove(
      CLASSES.ROOT,
      CLASSES.GROUP,
      CLASSES.HORIZONTAL,
      CLASSES.VERTICAL,
      CLASSES.DRAGGING
    );
    element.removeAttribute('data-atlas-resizable');
    element.removeAttribute(ATTRS.GROUP);
    element.removeAttribute('role');

    panelEls.forEach((panel) => {
      panel.classList.remove(CLASSES.PANEL, CLASSES.PANEL_COLLAPSED);
      panel.removeAttribute(ATTRS.PANEL);
      panel.style.width = '';
      panel.style.height = '';
      panel.style.flexBasis = '';
      panel.style.flexGrow = '';
      panel.style.flexShrink = '';
      panel.style.overflow = '';
    });
  }

  // Initialize
  init();

  return {
    getSizes,
    setSizes,
    getPanelCount: () => panelEls.length,
    collapse,
    expand,
    toggle,
    isCollapsed,
    reset,
    refresh,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): ResizableState {
  return {
    getSizes: () => [],
    setSizes: () => {},
    getPanelCount: () => 0,
    collapse: () => {},
    expand: () => {},
    toggle: () => {},
    isCollapsed: () => false,
    reset: () => {},
    refresh: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

/**
 * Initialize all resizable components in the given root
 *
 * @example
 * ```html
 * <div data-atlas-resizable
 *      data-direction="horizontal"
 *      data-show-handle>
 *   <div data-atlas-resizable-panel data-default-size="25" data-min-size="10" data-collapsible>
 *     Panel 1
 *   </div>
 *   <div data-atlas-resizable-panel data-default-size="50" data-min-size="20">
 *     Panel 2
 *   </div>
 *   <div data-atlas-resizable-panel data-default-size="25" data-min-size="10">
 *     Panel 3
 *   </div>
 * </div>
 * ```
 */
export function initResizables(root: Document | HTMLElement = document): ResizableState[] {
  if (!isBrowser()) return [];

  const resizables: ResizableState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-resizable]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-resizable-initialized')) return;

    // Parse panel configs from child elements
    const panelElements = element.querySelectorAll<HTMLElement>('[data-atlas-resizable-panel]');
    const panels: ResizablePanelConfig[] = Array.from(panelElements).map((panel) => ({
      defaultSize: panel.hasAttribute('data-default-size')
        ? parseFloat(panel.getAttribute('data-default-size') ?? '0')
        : undefined,
      minSize: panel.hasAttribute('data-min-size')
        ? parseFloat(panel.getAttribute('data-min-size') ?? '0')
        : undefined,
      maxSize: panel.hasAttribute('data-max-size')
        ? parseFloat(panel.getAttribute('data-max-size') ?? '0')
        : undefined,
      collapsible: panel.hasAttribute('data-collapsible'),
      collapsedSize: panel.hasAttribute('data-collapsed-size')
        ? parseFloat(panel.getAttribute('data-collapsed-size') ?? '0')
        : undefined,
    }));

    const options: ResizableOptions = {
      direction: (element.getAttribute('data-direction') as ResizableDirection) ?? 'horizontal',
      panels,
      keyboardStep: parseFloat(element.getAttribute('data-keyboard-step') ?? '5'),
      showHandle: element.getAttribute('data-show-handle') !== 'false',
    };

    const resizable = createResizable(element, options);
    element.setAttribute('data-atlas-resizable-initialized', '');
    resizables.push(resizable);
  });

  return resizables;
}
