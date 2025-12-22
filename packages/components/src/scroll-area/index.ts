/**
 * @fileoverview ScrollArea component - custom scrollbar container
 * @module @atlas/components/scroll-area
 */

import { generateId } from '../shared/aria.js';
import { addListener, isBrowser } from '../shared/dom.js';

// ============================================================================
// Types
// ============================================================================

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';
export type ScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover';

export interface ScrollAreaOptions {
  /** Scroll orientation */
  orientation?: ScrollAreaOrientation;
  /** Scrollbar visibility type */
  type?: ScrollAreaType;
  /** Custom scrollbar width/height in px */
  scrollbarSize?: number;
  /** Callback when scroll position changes */
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

export interface ScrollAreaState {
  /** Get viewport element */
  getViewport: () => HTMLElement | null;
  /** Scroll to position */
  scrollTo: (options: ScrollToOptions) => void;
  /** Scroll by amount */
  scrollBy: (options: ScrollToOptions) => void;
  /** Get scroll top position */
  getScrollTop: () => number;
  /** Set scroll top position */
  setScrollTop: (value: number) => void;
  /** Get scroll left position */
  getScrollLeft: () => number;
  /** Set scroll left position */
  setScrollLeft: (value: number) => void;
  /** Get scroll dimensions */
  getScrollSize: () => { width: number; height: number };
  /** Get viewport dimensions */
  getViewportSize: () => { width: number; height: number };
  /** Scroll element into view */
  scrollIntoView: (element: HTMLElement, options?: ScrollIntoViewOptions) => void;
  /** Refresh scrollbar state */
  refresh: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  VIEWPORT: 'data-atlas-scroll-viewport',
  CONTENT: 'data-atlas-scroll-content',
  SCROLLBAR: 'data-atlas-scrollbar',
  SCROLLBAR_THUMB: 'data-atlas-scrollbar-thumb',
  CORNER: 'data-atlas-scroll-corner',
} as const;

const CLASSES = {
  ROOT: 'atlas-scroll-area',
  VIEWPORT: 'atlas-scroll-area-viewport',
  CONTENT: 'atlas-scroll-area-content',
  SCROLLBAR: 'atlas-scrollbar',
  SCROLLBAR_VERTICAL: 'atlas-scrollbar--vertical',
  SCROLLBAR_HORIZONTAL: 'atlas-scrollbar--horizontal',
  SCROLLBAR_THUMB: 'atlas-scrollbar-thumb',
  SCROLLBAR_VISIBLE: 'atlas-scrollbar--visible',
  SCROLLBAR_DRAGGING: 'atlas-scrollbar--dragging',
  CORNER: 'atlas-scroll-area-corner',
  TYPE_AUTO: 'atlas-scroll-area--type-auto',
  TYPE_ALWAYS: 'atlas-scroll-area--type-always',
  TYPE_SCROLL: 'atlas-scroll-area--type-scroll',
  TYPE_HOVER: 'atlas-scroll-area--type-hover',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a scroll area with custom styled scrollbars
 *
 * @example
 * ```ts
 * const scrollArea = createScrollArea(element, {
 *   orientation: 'vertical',
 *   type: 'hover',
 *   onScroll: (top, left) => console.log('Scroll:', top, left)
 * });
 *
 * // Programmatic scroll
 * scrollArea.scrollTo({ top: 100, behavior: 'smooth' });
 * ```
 */
export function createScrollArea(
  element: HTMLElement,
  options: ScrollAreaOptions = {}
): ScrollAreaState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const { orientation = 'vertical', type = 'auto', scrollbarSize = 10 } = options;

  // Elements
  const id = generateId('scroll-area');
  let viewportEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;
  let verticalScrollbar: HTMLElement | null = null;
  let verticalThumb: HTMLElement | null = null;
  let horizontalScrollbar: HTMLElement | null = null;
  let horizontalThumb: HTMLElement | null = null;
  let cornerEl: HTMLElement | null = null;
  const cleanups: (() => void)[] = [];

  // Drag state
  let isDraggingVertical = false;
  let isDraggingHorizontal = false;
  let dragStartY = 0;
  let dragStartX = 0;
  let dragStartScrollTop = 0;
  let dragStartScrollLeft = 0;

  // Visibility state
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let isHovering = false;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.classList.add(`${CLASSES.ROOT}--${orientation}`);
    element.classList.add(getTypeClass(type));
    element.setAttribute('data-atlas-scroll-area', '');
    element.id = id;

    // Create viewport
    viewportEl = document.createElement('div');
    viewportEl.className = CLASSES.VIEWPORT;
    viewportEl.setAttribute(ATTRS.VIEWPORT, '');

    // Set overflow based on orientation
    switch (orientation) {
      case 'vertical':
        viewportEl.style.overflowX = 'hidden';
        viewportEl.style.overflowY = 'scroll';
        break;
      case 'horizontal':
        viewportEl.style.overflowX = 'scroll';
        viewportEl.style.overflowY = 'hidden';
        break;
      case 'both':
        viewportEl.style.overflow = 'scroll';
        break;
    }

    // Hide native scrollbars
    viewportEl.style.scrollbarWidth = 'none';
    (viewportEl.style as CSSStyleDeclaration & { msOverflowStyle?: string }).msOverflowStyle =
      'none';

    // Create content wrapper
    contentEl = document.createElement('div');
    contentEl.className = CLASSES.CONTENT;
    contentEl.setAttribute(ATTRS.CONTENT, '');

    // Move existing children into content
    while (element.firstChild) {
      contentEl.appendChild(element.firstChild);
    }

    viewportEl.appendChild(contentEl);
    element.appendChild(viewportEl);

    // Create scrollbars
    if (orientation === 'vertical' || orientation === 'both') {
      createVerticalScrollbar();
    }

    if (orientation === 'horizontal' || orientation === 'both') {
      createHorizontalScrollbar();
    }

    // Create corner if both scrollbars exist
    if (orientation === 'both') {
      createCorner();
    }

    // Setup event listeners
    setupScrollListener();
    setupHoverListeners();
    setupResizeObserver();

    // Initial update
    updateScrollbars();
  }

  function getTypeClass(t: ScrollAreaType): string {
    switch (t) {
      case 'always':
        return CLASSES.TYPE_ALWAYS;
      case 'scroll':
        return CLASSES.TYPE_SCROLL;
      case 'hover':
        return CLASSES.TYPE_HOVER;
      default:
        return CLASSES.TYPE_AUTO;
    }
  }

  function createVerticalScrollbar(): void {
    verticalScrollbar = document.createElement('div');
    verticalScrollbar.className = `${CLASSES.SCROLLBAR} ${CLASSES.SCROLLBAR_VERTICAL}`;
    verticalScrollbar.setAttribute(ATTRS.SCROLLBAR, 'vertical');
    verticalScrollbar.style.width = `${scrollbarSize}px`;

    verticalThumb = document.createElement('div');
    verticalThumb.className = CLASSES.SCROLLBAR_THUMB;
    verticalThumb.setAttribute(ATTRS.SCROLLBAR_THUMB, 'vertical');

    verticalScrollbar.appendChild(verticalThumb);
    element.appendChild(verticalScrollbar);

    // Track click
    verticalScrollbar.addEventListener('mousedown', handleVerticalTrackClick);

    // Thumb drag
    verticalThumb.addEventListener('mousedown', handleVerticalThumbDrag);
  }

  function createHorizontalScrollbar(): void {
    horizontalScrollbar = document.createElement('div');
    horizontalScrollbar.className = `${CLASSES.SCROLLBAR} ${CLASSES.SCROLLBAR_HORIZONTAL}`;
    horizontalScrollbar.setAttribute(ATTRS.SCROLLBAR, 'horizontal');
    horizontalScrollbar.style.height = `${scrollbarSize}px`;

    horizontalThumb = document.createElement('div');
    horizontalThumb.className = CLASSES.SCROLLBAR_THUMB;
    horizontalThumb.setAttribute(ATTRS.SCROLLBAR_THUMB, 'horizontal');

    horizontalScrollbar.appendChild(horizontalThumb);
    element.appendChild(horizontalScrollbar);

    // Track click
    horizontalScrollbar.addEventListener('mousedown', handleHorizontalTrackClick);

    // Thumb drag
    horizontalThumb.addEventListener('mousedown', handleHorizontalThumbDrag);
  }

  function createCorner(): void {
    cornerEl = document.createElement('div');
    cornerEl.className = CLASSES.CORNER;
    cornerEl.setAttribute(ATTRS.CORNER, '');
    cornerEl.style.width = `${scrollbarSize}px`;
    cornerEl.style.height = `${scrollbarSize}px`;
    element.appendChild(cornerEl);
  }

  function setupScrollListener(): void {
    if (!viewportEl) return;

    const handleScroll = (): void => {
      updateScrollbars();
      showScrollbars();
      options.onScroll?.(viewportEl?.scrollTop ?? 0, viewportEl?.scrollLeft ?? 0);
    };

    cleanups.push(addListener(viewportEl, 'scroll', handleScroll as EventListener));
  }

  function setupHoverListeners(): void {
    if (type !== 'hover') return;

    cleanups.push(
      addListener(element, 'mouseenter', () => {
        isHovering = true;
        showScrollbars();
      })
    );

    cleanups.push(
      addListener(element, 'mouseleave', () => {
        isHovering = false;
        hideScrollbars();
      })
    );
  }

  function setupResizeObserver(): void {
    if (!viewportEl) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbars();
    });

    resizeObserver.observe(viewportEl);
    if (contentEl) {
      resizeObserver.observe(contentEl);
    }

    cleanups.push(() => resizeObserver.disconnect());
  }

  function updateScrollbars(): void {
    if (!viewportEl) return;

    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } =
      viewportEl;

    // Update vertical scrollbar
    if (verticalThumb && verticalScrollbar) {
      const trackHeight = verticalScrollbar.clientHeight;
      const thumbHeight = Math.max(30, (clientHeight / scrollHeight) * trackHeight);
      const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (trackHeight - thumbHeight);

      verticalThumb.style.height = `${thumbHeight}px`;
      verticalThumb.style.transform = `translateY(${thumbTop}px)`;

      // Show/hide based on content
      const hasVerticalScroll = scrollHeight > clientHeight;
      verticalScrollbar.style.display = hasVerticalScroll ? 'block' : 'none';
    }

    // Update horizontal scrollbar
    if (horizontalThumb && horizontalScrollbar) {
      const trackWidth = horizontalScrollbar.clientWidth;
      const thumbWidth = Math.max(30, (clientWidth / scrollWidth) * trackWidth);
      const thumbLeft = (scrollLeft / (scrollWidth - clientWidth)) * (trackWidth - thumbWidth);

      horizontalThumb.style.width = `${thumbWidth}px`;
      horizontalThumb.style.transform = `translateX(${thumbLeft}px)`;

      // Show/hide based on content
      const hasHorizontalScroll = scrollWidth > clientWidth;
      horizontalScrollbar.style.display = hasHorizontalScroll ? 'block' : 'none';
    }
  }

  function showScrollbars(): void {
    if (type === 'scroll' || type === 'auto') {
      verticalScrollbar?.classList.add(CLASSES.SCROLLBAR_VISIBLE);
      horizontalScrollbar?.classList.add(CLASSES.SCROLLBAR_VISIBLE);

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        if (!isDraggingVertical && !isDraggingHorizontal && !isHovering) {
          hideScrollbars();
        }
      }, 1000);
    }
  }

  function hideScrollbars(): void {
    if (type === 'scroll' || type === 'auto') {
      if (!isDraggingVertical && !isDraggingHorizontal) {
        verticalScrollbar?.classList.remove(CLASSES.SCROLLBAR_VISIBLE);
        horizontalScrollbar?.classList.remove(CLASSES.SCROLLBAR_VISIBLE);
      }
    }
  }

  function handleVerticalTrackClick(e: MouseEvent): void {
    if (e.target === verticalThumb || !viewportEl || !verticalScrollbar) return;

    const trackRect = verticalScrollbar.getBoundingClientRect();
    const thumbRect = verticalThumb?.getBoundingClientRect();
    if (!thumbRect) return;
    const clickY = e.clientY - trackRect.top;
    const thumbCenter = thumbRect.top - trackRect.top + thumbRect.height / 2;

    // Scroll page up or down
    const direction = clickY < thumbCenter ? -1 : 1;
    viewportEl.scrollTop += direction * viewportEl.clientHeight * 0.9;
  }

  function handleHorizontalTrackClick(e: MouseEvent): void {
    if (e.target === horizontalThumb || !viewportEl || !horizontalScrollbar) return;

    const trackRect = horizontalScrollbar.getBoundingClientRect();
    const thumbRect = horizontalThumb?.getBoundingClientRect();
    if (!thumbRect) return;
    const clickX = e.clientX - trackRect.left;
    const thumbCenter = thumbRect.left - trackRect.left + thumbRect.width / 2;

    // Scroll page left or right
    const direction = clickX < thumbCenter ? -1 : 1;
    viewportEl.scrollLeft += direction * viewportEl.clientWidth * 0.9;
  }

  function handleVerticalThumbDrag(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (!viewportEl) return;

    isDraggingVertical = true;
    dragStartY = e.clientY;
    dragStartScrollTop = viewportEl.scrollTop;

    verticalScrollbar?.classList.add(CLASSES.SCROLLBAR_DRAGGING);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      if (!viewportEl || !verticalScrollbar) return;

      const deltaY = moveEvent.clientY - dragStartY;
      const trackHeight = verticalScrollbar.clientHeight;
      const thumbHeight = verticalThumb?.clientHeight ?? 0;
      const scrollableHeight = viewportEl.scrollHeight - viewportEl.clientHeight;

      const scrollDelta = (deltaY / (trackHeight - thumbHeight)) * scrollableHeight;
      viewportEl.scrollTop = dragStartScrollTop + scrollDelta;
    };

    const handleMouseUp = (): void => {
      isDraggingVertical = false;
      verticalScrollbar?.classList.remove(CLASSES.SCROLLBAR_DRAGGING);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (!isHovering) {
        hideScrollbars();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleHorizontalThumbDrag(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (!viewportEl) return;

    isDraggingHorizontal = true;
    dragStartX = e.clientX;
    dragStartScrollLeft = viewportEl.scrollLeft;

    horizontalScrollbar?.classList.add(CLASSES.SCROLLBAR_DRAGGING);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      if (!viewportEl || !horizontalScrollbar) return;

      const deltaX = moveEvent.clientX - dragStartX;
      const trackWidth = horizontalScrollbar.clientWidth;
      const thumbWidth = horizontalThumb?.clientWidth ?? 0;
      const scrollableWidth = viewportEl.scrollWidth - viewportEl.clientWidth;

      const scrollDelta = (deltaX / (trackWidth - thumbWidth)) * scrollableWidth;
      viewportEl.scrollLeft = dragStartScrollLeft + scrollDelta;
    };

    const handleMouseUp = (): void => {
      isDraggingHorizontal = false;
      horizontalScrollbar?.classList.remove(CLASSES.SCROLLBAR_DRAGGING);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (!isHovering) {
        hideScrollbars();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function scrollTo(scrollOptions: ScrollToOptions): void {
    viewportEl?.scrollTo(scrollOptions);
  }

  function scrollBy(scrollOptions: ScrollToOptions): void {
    viewportEl?.scrollBy(scrollOptions);
  }

  function scrollIntoView(target: HTMLElement, scrollOptions?: ScrollIntoViewOptions): void {
    target.scrollIntoView(scrollOptions);
  }

  function refresh(): void {
    updateScrollbars();
  }

  function destroy(): void {
    cleanups.forEach((cleanup) => cleanup());

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    element.classList.remove(
      CLASSES.ROOT,
      `${CLASSES.ROOT}--${orientation}`,
      CLASSES.TYPE_AUTO,
      CLASSES.TYPE_ALWAYS,
      CLASSES.TYPE_SCROLL,
      CLASSES.TYPE_HOVER
    );
    element.removeAttribute('data-atlas-scroll-area');

    // Restore original content
    if (contentEl && viewportEl) {
      while (contentEl.firstChild) {
        element.appendChild(contentEl.firstChild);
      }
    }

    // Remove created elements
    viewportEl?.remove();
    verticalScrollbar?.remove();
    horizontalScrollbar?.remove();
    cornerEl?.remove();
  }

  // Initialize
  init();

  return {
    getViewport: () => viewportEl,
    scrollTo,
    scrollBy,
    getScrollTop: () => viewportEl?.scrollTop ?? 0,
    setScrollTop: (value: number) => {
      if (viewportEl) viewportEl.scrollTop = value;
    },
    getScrollLeft: () => viewportEl?.scrollLeft ?? 0,
    setScrollLeft: (value: number) => {
      if (viewportEl) viewportEl.scrollLeft = value;
    },
    getScrollSize: () => ({
      width: viewportEl?.scrollWidth ?? 0,
      height: viewportEl?.scrollHeight ?? 0,
    }),
    getViewportSize: () => ({
      width: viewportEl?.clientWidth ?? 0,
      height: viewportEl?.clientHeight ?? 0,
    }),
    scrollIntoView,
    refresh,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): ScrollAreaState {
  return {
    getViewport: () => null,
    scrollTo: () => {},
    scrollBy: () => {},
    getScrollTop: () => 0,
    setScrollTop: () => {},
    getScrollLeft: () => 0,
    setScrollLeft: () => {},
    getScrollSize: () => ({ width: 0, height: 0 }),
    getViewportSize: () => ({ width: 0, height: 0 }),
    scrollIntoView: () => {},
    refresh: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

/**
 * Initialize all scroll area components in the given root
 *
 * @example
 * ```html
 * <div data-atlas-scroll-area
 *      data-orientation="vertical"
 *      data-type="hover"
 *      data-scrollbar-size="8"
 *      style="height: 300px;">
 *   <!-- scrollable content -->
 * </div>
 * ```
 */
export function initScrollAreas(root: Document | HTMLElement = document): ScrollAreaState[] {
  if (!isBrowser()) return [];

  const scrollAreas: ScrollAreaState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-scroll-area]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-scroll-area-initialized')) return;

    const options: ScrollAreaOptions = {
      orientation:
        (element.getAttribute('data-orientation') as ScrollAreaOrientation) ?? 'vertical',
      type: (element.getAttribute('data-type') as ScrollAreaType) ?? 'auto',
      scrollbarSize: parseInt(element.getAttribute('data-scrollbar-size') ?? '10', 10),
    };

    const scrollArea = createScrollArea(element, options);
    element.setAttribute('data-atlas-scroll-area-initialized', '');
    scrollAreas.push(scrollArea);
  });

  return scrollAreas;
}
