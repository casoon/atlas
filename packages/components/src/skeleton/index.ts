/**
 * Skeleton Component
 *
 * Premium loading states that don't make people panic:
 * - Shimmer animation for placeholder content
 * - Smooth pulse for loading indicators
 * - Content-aware placeholders (text, avatar, card, etc.)
 * - Calm, reassuring visual feedback
 *
 * "A good loading interaction gives the user something to understand."
 *
 * @example
 * ```typescript
 * // Apply skeleton loading to an element
 * const skeleton = createSkeleton(document.getElementById('content'), {
 *   type: 'text',
 *   lines: 3,
 * });
 *
 * // Later, when content is loaded
 * skeleton.hide();
 * ```
 */

import { createElement, isBrowser } from '../shared/dom';
import { EASING } from '../shared/types';

export type SkeletonType = 'text' | 'avatar' | 'card' | 'image' | 'custom';
export type SkeletonAnimation = 'shimmer' | 'pulse' | 'none';

export interface SkeletonOptions {
  /** Type of skeleton (default: 'text') */
  type?: SkeletonType;
  /** Animation style (default: 'shimmer') */
  animation?: SkeletonAnimation;
  /** Number of text lines (for type: 'text', default: 1) */
  lines?: number;
  /** Width of skeleton (default: '100%') */
  width?: string;
  /** Height of skeleton (default: 'auto') */
  height?: string;
  /** Border radius (default: '4px') */
  borderRadius?: string;
  /** Custom class name */
  className?: string;
  /** Accessible loading message */
  ariaLabel?: string;
}

export interface SkeletonState {
  /** Whether skeleton is currently visible */
  readonly isVisible: boolean;
  /** The skeleton element(s) */
  readonly elements: HTMLElement[];
  /** Show the skeleton */
  show: () => void;
  /** Hide the skeleton */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Clean up */
  destroy: () => void;
}

// Default dimensions for different types
const TYPE_DEFAULTS: Record<SkeletonType, Partial<SkeletonOptions>> = {
  text: { height: '1em', borderRadius: '4px' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%' },
  card: { height: '200px', borderRadius: '8px' },
  image: { height: '200px', borderRadius: '8px' },
  custom: {},
};

// Line width patterns for realistic text
const LINE_WIDTHS = ['100%', '95%', '85%', '90%', '75%'];

export function createSkeleton(
  container: HTMLElement,
  options: SkeletonOptions = {}
): SkeletonState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopSkeletonState();
  }

  const {
    type = 'text',
    animation = 'shimmer',
    lines = 1,
    width = '100%',
    height,
    borderRadius,
    className,
    ariaLabel = 'Loading...',
  } = options;

  const defaults = TYPE_DEFAULTS[type];
  const finalHeight = height || defaults.height || '1em';
  const finalRadius = borderRadius || defaults.borderRadius || '4px';
  const finalWidth = type === 'avatar' ? defaults.width : width;

  let isVisible = true;
  const elements: HTMLElement[] = [];
  let wrapperElement: HTMLElement | null = null;

  // Create wrapper
  wrapperElement = createElement('div', {
    className: `atlas-skeleton-wrapper ${className || ''}`.trim(),
    attributes: {
      'data-atlas-skeleton': '',
      role: 'status',
      'aria-busy': 'true',
      'aria-label': ariaLabel,
    },
    styles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: finalWidth,
    },
  });

  if (!wrapperElement) {
    return createNoopSkeletonState();
  }

  // Create skeleton elements based on type
  const createSkeletonElement = (elementWidth: string, elementHeight: string) => {
    const baseStyles: Partial<CSSStyleDeclaration> = {
      width: elementWidth,
      height: elementHeight,
      borderRadius: finalRadius,
      backgroundColor: '#e5e7eb',
      position: 'relative',
      overflow: 'hidden',
    };

    const skeleton = createElement('div', {
      className: 'atlas-skeleton',
      styles: baseStyles,
    });

    if (skeleton && animation !== 'none') {
      // Add animation overlay
      const overlay = createElement('div', {
        className: 'atlas-skeleton-animation',
        styles: {
          position: 'absolute',
          inset: '0',
          ...(animation === 'shimmer'
            ? {
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                animation: `atlas-skeleton-shimmer 1.5s ${EASING.standard} infinite`,
              }
            : {
                animation: `atlas-skeleton-pulse 1.5s ${EASING.standard} infinite`,
                backgroundColor: 'rgba(255,255,255,0.3)',
              }),
        },
      });

      if (overlay) {
        skeleton.appendChild(overlay);
      }
    }

    return skeleton;
  };

  // Generate elements based on type
  if (type === 'text') {
    for (let i = 0; i < lines; i++) {
      const lineWidth = LINE_WIDTHS[i % LINE_WIDTHS.length];
      const element = createSkeletonElement(lineWidth, finalHeight);
      if (element) {
        elements.push(element);
        wrapperElement.appendChild(element);
      }
    }
  } else if (type === 'avatar') {
    const element = createSkeletonElement(finalWidth || '48px', finalHeight);
    if (element) {
      elements.push(element);
      wrapperElement.appendChild(element);
    }
  } else if (type === 'card') {
    // Card: image + text lines
    const imageElement = createSkeletonElement('100%', '120px');
    if (imageElement) {
      imageElement.style.borderRadius = `${finalRadius} ${finalRadius} 0 0`;
      elements.push(imageElement);
      wrapperElement.appendChild(imageElement);
    }

    const contentWrapper = createElement('div', {
      styles: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      },
    });

    if (contentWrapper) {
      // Title line
      const titleElement = createSkeletonElement('60%', '1.25em');
      if (titleElement) {
        elements.push(titleElement);
        contentWrapper.appendChild(titleElement);
      }

      // Description lines
      for (let i = 0; i < 2; i++) {
        const lineElement = createSkeletonElement(LINE_WIDTHS[i], '0.875em');
        if (lineElement) {
          elements.push(lineElement);
          contentWrapper.appendChild(lineElement);
        }
      }

      wrapperElement.appendChild(contentWrapper);
    }
  } else if (type === 'image') {
    const element = createSkeletonElement('100%', finalHeight);
    if (element) {
      elements.push(element);
      wrapperElement.appendChild(element);
    }
  } else {
    // Custom - single element
    const element = createSkeletonElement(finalWidth || '100%', finalHeight);
    if (element) {
      elements.push(element);
      wrapperElement.appendChild(element);
    }
  }

  // Add to container
  container.appendChild(wrapperElement);

  const show = () => {
    if (isVisible || !wrapperElement) return;
    isVisible = true;
    wrapperElement.style.display = 'flex';
    wrapperElement.setAttribute('aria-busy', 'true');
  };

  const hide = () => {
    if (!isVisible || !wrapperElement) return;
    isVisible = false;

    // Fade out animation
    wrapperElement.style.transition = `opacity 200ms ${EASING.accelerate}`;
    wrapperElement.style.opacity = '0';

    setTimeout(() => {
      if (wrapperElement) {
        wrapperElement.style.display = 'none';
        wrapperElement.setAttribute('aria-busy', 'false');
      }
    }, 200);
  };

  const toggle = () => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  };

  const destroy = () => {
    wrapperElement?.remove();
    wrapperElement = null;
    elements.length = 0;
  };

  return {
    get isVisible() {
      return isVisible;
    },
    get elements() {
      return [...elements];
    },
    show,
    hide,
    toggle,
    destroy,
  };
}

/**
 * Create inline skeleton text
 * Useful for replacing text content directly
 */
export function createInlineSkeleton(
  width: string = '100px',
  options: Partial<SkeletonOptions> = {}
): HTMLElement | null {
  if (!isBrowser()) return null;

  const { animation = 'shimmer', borderRadius = '4px' } = options;

  const skeleton = createElement('span', {
    className: 'atlas-skeleton-inline',
    attributes: {
      'aria-hidden': 'true',
    },
    styles: {
      display: 'inline-block',
      width,
      height: '1em',
      borderRadius,
      backgroundColor: '#e5e7eb',
      verticalAlign: 'middle',
      position: 'relative',
      overflow: 'hidden',
    },
  });

  if (skeleton && animation !== 'none') {
    const overlay = createElement('span', {
      styles: {
        position: 'absolute',
        inset: '0',
        ...(animation === 'shimmer'
          ? {
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: `atlas-skeleton-shimmer 1.5s ${EASING.standard} infinite`,
            }
          : {
              animation: `atlas-skeleton-pulse 1.5s ${EASING.standard} infinite`,
              backgroundColor: 'rgba(255,255,255,0.3)',
            }),
      },
    });

    if (overlay) {
      skeleton.appendChild(overlay);
    }
  }

  return skeleton;
}

/** No-op skeleton state for SSR */
function createNoopSkeletonState(): SkeletonState {
  return {
    get isVisible() {
      return false;
    },
    get elements() {
      return [];
    },
    show: () => {},
    hide: () => {},
    toggle: () => {},
    destroy: () => {},
  };
}
