/**
 * Floating UI Utilities
 *
 * Lightweight positioning system for overlays (tooltips, popovers, dropdowns).
 * Handles viewport collision detection, flipping, and shifting.
 *
 * This is a lightweight alternative to @floating-ui/dom for simple use cases.
 * For complex scenarios, consider using the full library.
 *
 * @module
 */

import { isBrowser } from './dom';

/** Placement options with alignment */
export type FloatingPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

/** Positioning strategy */
export type FloatingStrategy = 'absolute' | 'fixed';

/** Options for floating position calculation */
export interface FloatingOptions {
  /** Placement relative to reference element (default: 'bottom') */
  placement?: FloatingPlacement;
  /** CSS position strategy (default: 'absolute') */
  strategy?: FloatingStrategy;
  /** Offset from reference element in px (default: 8) */
  offset?: number;
  /** Flip to opposite side if overflowing (default: true) */
  flip?: boolean;
  /** Shift along axis to stay in viewport (default: true) */
  shift?: boolean;
  /** Padding from viewport edge in px (default: 8) */
  shiftPadding?: number;
  /** Arrow element for positioning */
  arrow?: HTMLElement | null;
}

/** Result of position calculation */
export interface FloatingResult {
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Final placement after flip */
  placement: FloatingPlacement;
  /** Arrow X position relative to floating element */
  arrowX?: number;
  /** Arrow Y position relative to floating element */
  arrowY?: number;
}

/** Options for auto-update behavior */
export interface AutoUpdateOptions {
  /** Update on ancestor scroll (default: true) */
  ancestorScroll?: boolean;
  /** Update on window resize (default: true) */
  ancestorResize?: boolean;
  /** Update on element resize (default: true) */
  elementResize?: boolean;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getViewportRect(): Rect {
  return {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function getElementRect(element: HTMLElement, strategy: FloatingStrategy): Rect {
  const rect = element.getBoundingClientRect();

  if (strategy === 'fixed') {
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

function getMainAxis(placement: FloatingPlacement): 'x' | 'y' {
  return placement.startsWith('top') || placement.startsWith('bottom') ? 'y' : 'x';
}

function getOppositePlacement(placement: FloatingPlacement): FloatingPlacement {
  const map: Record<string, string> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };

  return placement.replace(/^(top|bottom|left|right)/, (match) => map[match]) as FloatingPlacement;
}

function computePosition(
  referenceRect: Rect,
  floatingRect: Rect,
  placement: FloatingPlacement,
  offset: number
): { x: number; y: number } {
  const [side, align = 'center'] = placement.split('-') as [string, string?];

  let x = 0;
  let y = 0;

  // Main axis positioning
  switch (side) {
    case 'top':
      y = referenceRect.y - floatingRect.height - offset;
      break;
    case 'bottom':
      y = referenceRect.y + referenceRect.height + offset;
      break;
    case 'left':
      x = referenceRect.x - floatingRect.width - offset;
      break;
    case 'right':
      x = referenceRect.x + referenceRect.width + offset;
      break;
  }

  // Cross axis alignment
  if (side === 'top' || side === 'bottom') {
    switch (align) {
      case 'start':
        x = referenceRect.x;
        break;
      case 'end':
        x = referenceRect.x + referenceRect.width - floatingRect.width;
        break;
      default: // center
        x = referenceRect.x + (referenceRect.width - floatingRect.width) / 2;
    }
  } else {
    switch (align) {
      case 'start':
        y = referenceRect.y;
        break;
      case 'end':
        y = referenceRect.y + referenceRect.height - floatingRect.height;
        break;
      default: // center
        y = referenceRect.y + (referenceRect.height - floatingRect.height) / 2;
    }
  }

  return { x, y };
}

function checkOverflow(
  floatingRect: Rect,
  position: { x: number; y: number },
  viewport: Rect,
  padding: number
): { top: number; right: number; bottom: number; left: number } {
  return {
    top: padding - position.y,
    right: position.x + floatingRect.width - (viewport.width - padding),
    bottom: position.y + floatingRect.height - (viewport.height - padding),
    left: padding - position.x,
  };
}

/**
 * Computes the position of a floating element relative to a reference element
 *
 * @example
 * ```typescript
 * const result = computeFloatingPosition(trigger, tooltip, {
 *   placement: 'top',
 *   offset: 8,
 * });
 *
 * applyFloatingStyles(tooltip, result);
 * ```
 */
export function computeFloatingPosition(
  reference: HTMLElement,
  floating: HTMLElement,
  options: FloatingOptions = {}
): FloatingResult {
  // SSR guard
  if (!isBrowser()) {
    return { x: 0, y: 0, placement: options.placement || 'bottom' };
  }

  const {
    placement = 'bottom',
    strategy = 'absolute',
    offset = 8,
    flip = true,
    shift = true,
    shiftPadding = 8,
    arrow = null,
  } = options;

  const referenceRect = getElementRect(reference, strategy);
  const floatingRect = {
    ...getElementRect(floating, strategy),
    width: floating.offsetWidth,
    height: floating.offsetHeight,
  };
  const viewport = getViewportRect();

  let currentPlacement = placement;
  let position = computePosition(referenceRect, floatingRect, currentPlacement, offset);

  // Flip if overflowing
  if (flip) {
    const overflow = checkOverflow(floatingRect, position, viewport, shiftPadding);
    const mainAxis = getMainAxis(currentPlacement);

    const shouldFlip =
      mainAxis === 'y'
        ? (currentPlacement.startsWith('top') && overflow.top > 0) ||
          (currentPlacement.startsWith('bottom') && overflow.bottom > 0)
        : (currentPlacement.startsWith('left') && overflow.left > 0) ||
          (currentPlacement.startsWith('right') && overflow.right > 0);

    if (shouldFlip) {
      currentPlacement = getOppositePlacement(currentPlacement);
      position = computePosition(referenceRect, floatingRect, currentPlacement, offset);
    }
  }

  // Shift along cross axis if overflowing
  if (shift) {
    const overflow = checkOverflow(floatingRect, position, viewport, shiftPadding);
    const mainAxis = getMainAxis(currentPlacement);

    if (mainAxis === 'y') {
      if (overflow.left > 0) {
        position.x += overflow.left;
      } else if (overflow.right > 0) {
        position.x -= overflow.right;
      }
    } else {
      if (overflow.top > 0) {
        position.y += overflow.top;
      } else if (overflow.bottom > 0) {
        position.y -= overflow.bottom;
      }
    }
  }

  // Arrow positioning
  let arrowX: number | undefined;
  let arrowY: number | undefined;

  if (arrow) {
    const arrowRect = arrow.getBoundingClientRect();
    const mainAxis = getMainAxis(currentPlacement);

    if (mainAxis === 'y') {
      const centerX = referenceRect.x + referenceRect.width / 2;
      arrowX = centerX - position.x - arrowRect.width / 2;
      // Clamp arrow position
      arrowX = Math.max(8, Math.min(arrowX, floatingRect.width - arrowRect.width - 8));
    } else {
      const centerY = referenceRect.y + referenceRect.height / 2;
      arrowY = centerY - position.y - arrowRect.height / 2;
      arrowY = Math.max(8, Math.min(arrowY, floatingRect.height - arrowRect.height - 8));
    }
  }

  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    placement: currentPlacement,
    arrowX,
    arrowY,
  };
}

/**
 * Applies computed position to a floating element
 */
export function applyFloatingStyles(
  floating: HTMLElement,
  result: FloatingResult,
  strategy: FloatingStrategy = 'absolute'
): void {
  Object.assign(floating.style, {
    position: strategy,
    left: `${result.x}px`,
    top: `${result.y}px`,
    margin: '0',
  });
}

/**
 * Applies arrow positioning styles
 */
export function applyArrowStyles(
  arrow: HTMLElement,
  result: FloatingResult,
  placement: FloatingPlacement
): void {
  const side = placement.split('-')[0];
  const staticSide: Record<string, string> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };

  Object.assign(arrow.style, {
    position: 'absolute',
    [staticSide[side]]: '-4px',
    ...(result.arrowX != null ? { left: `${result.arrowX}px` } : {}),
    ...(result.arrowY != null ? { top: `${result.arrowY}px` } : {}),
  });
}

/**
 * Sets up auto-updating of floating position on scroll/resize
 *
 * @example
 * ```typescript
 * const cleanup = autoUpdate(trigger, tooltip, () => {
 *   const result = computeFloatingPosition(trigger, tooltip);
 *   applyFloatingStyles(tooltip, result);
 * });
 *
 * // Later cleanup
 * cleanup();
 * ```
 */
export function autoUpdate(
  reference: HTMLElement,
  floating: HTMLElement,
  update: () => void,
  options: AutoUpdateOptions = {}
): () => void {
  // SSR guard
  if (!isBrowser()) {
    return () => {};
  }

  const { ancestorScroll = true, ancestorResize = true, elementResize = true } = options;

  const cleanups: (() => void)[] = [];

  // Scroll listeners on ancestors
  if (ancestorScroll) {
    let ancestor: Element | null = reference;
    while (ancestor) {
      ancestor.addEventListener('scroll', update, { passive: true });
      const currentAncestor = ancestor;
      cleanups.push(() => currentAncestor.removeEventListener('scroll', update));
      ancestor = ancestor.parentElement;
    }
    window.addEventListener('scroll', update, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', update));
  }

  // Window resize listener
  if (ancestorResize) {
    window.addEventListener('resize', update);
    cleanups.push(() => window.removeEventListener('resize', update));
  }

  // Element resize observer
  if (elementResize && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(update);
    observer.observe(reference);
    observer.observe(floating);
    cleanups.push(() => observer.disconnect());
  }

  // Initial update
  update();

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
