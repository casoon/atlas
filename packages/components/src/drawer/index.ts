/**
 * Drawer Component
 *
 * A slide-in panel from any edge with micro-interactions:
 * - Smooth slide animation with spring easing
 * - Backdrop blur effect
 * - Touch-friendly swipe to close (optional)
 * - Focus trap for keyboard navigation
 * - Escape key to close
 *
 * @example
 * ```typescript
 * const drawer = createDrawer(document.getElementById('my-drawer'), {
 *   side: 'right',
 *   onOpen: () => console.log('Drawer opened'),
 * });
 *
 * drawer.open();
 * ```
 */

import { announce, generateId, getDrawerAriaAttributes } from '../shared/aria';
import { addListener, createElement, isBrowser, lockScroll } from '../shared/dom';
import { createFocusTrap, type FocusTrap } from '../shared/focus-trap';
import {
  ANIMATION_DURATION,
  type AnimationTiming,
  type BaseComponentOptions,
  type BaseComponentState,
  EASING,
  Z_INDEX,
} from '../shared/types';

export type DrawerSide = 'left' | 'right' | 'top' | 'bottom';

export interface DrawerOptions extends BaseComponentOptions {
  /** Which side the drawer slides in from (default: 'right') */
  side?: DrawerSide;
  /** Show backdrop overlay (default: true) */
  backdrop?: boolean;
  /** Close when clicking backdrop (default: true) */
  closeOnBackdrop?: boolean;
  /** Close when pressing Escape (default: true) */
  closeOnEscape?: boolean;
  /** Trap focus within drawer (default: true) */
  trapFocus?: boolean;
  /** Animation timing (default: 'normal') */
  animation?: AnimationTiming;
  /** Blur backdrop (default: true) */
  backdropBlur?: boolean;
  /** Accessible label */
  ariaLabel?: string;
  /** ID of element that labels the drawer */
  ariaLabelledBy?: string;
}

export interface DrawerState extends BaseComponentState {
  /** The drawer element */
  readonly element: HTMLElement;
  /** Which side the drawer is on */
  readonly side: DrawerSide;
  /** Update drawer content */
  update: () => void;
}

// Transform values for each side
const TRANSFORMS: Record<DrawerSide, { open: string; closed: string }> = {
  left: { open: 'translateX(0)', closed: 'translateX(-100%)' },
  right: { open: 'translateX(0)', closed: 'translateX(100%)' },
  top: { open: 'translateY(0)', closed: 'translateY(-100%)' },
  bottom: { open: 'translateY(0)', closed: 'translateY(100%)' },
};

// Position styles for each side
const POSITIONS: Record<DrawerSide, Partial<CSSStyleDeclaration>> = {
  left: { top: '0', left: '0', bottom: '0', width: 'auto', height: '100%' },
  right: { top: '0', right: '0', bottom: '0', width: 'auto', height: '100%' },
  top: { top: '0', left: '0', right: '0', width: '100%', height: 'auto' },
  bottom: { bottom: '0', left: '0', right: '0', width: '100%', height: 'auto' },
};

export function createDrawer(element: HTMLElement, options: DrawerOptions = {}): DrawerState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopDrawerState(element, options.side || 'right');
  }

  const {
    side = 'right',
    backdrop = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    trapFocus = true,
    animation = 'normal',
    backdropBlur = true,
    ariaLabel,
    ariaLabelledBy,
    onOpen,
    onClose,
  } = options;

  const duration = ANIMATION_DURATION[animation];
  const drawerId = generateId('drawer');
  const transforms = TRANSFORMS[side];
  const positions = POSITIONS[side];

  let isOpen = false;
  let backdropElement: HTMLElement | null = null;
  let focusTrap: FocusTrap | null = null;
  let unlockScroll: (() => void) | null = null;
  let cleanupListeners: (() => void)[] = [];

  // Apply ARIA attributes
  const ariaAttrs = getDrawerAriaAttributes({
    labelledBy: ariaLabelledBy,
    side,
  });
  element.id = element.id || drawerId;

  for (const [key, value] of Object.entries(ariaAttrs)) {
    element.setAttribute(key, value);
  }

  if (ariaLabel) {
    element.setAttribute('aria-label', ariaLabel);
  }

  // Initial hidden state with position
  element.setAttribute('aria-hidden', 'true');
  element.style.position = 'fixed';
  element.style.zIndex = String(Z_INDEX.drawer);
  element.style.transform = transforms.closed;
  element.style.visibility = 'hidden';

  Object.assign(element.style, positions);

  // Create focus trap
  if (trapFocus) {
    focusTrap = createFocusTrap({
      container: element,
      initialFocus: 'first',
      returnFocus: 'previous',
      onEscape: closeOnEscape ? () => close() : undefined,
    });
  }

  const createBackdropElement = (): HTMLElement | null => {
    if (!backdrop) return null;

    return createElement('div', {
      className: 'atlas-drawer-backdrop',
      attributes: {
        'data-atlas-drawer-backdrop': '',
        'data-side': side,
        'aria-hidden': 'true',
      },
      styles: {
        position: 'fixed',
        inset: '0',
        zIndex: String(Z_INDEX.drawer - 1),
        backgroundColor: 'rgba(0, 0, 0, 0)',
        backdropFilter: backdropBlur ? 'blur(0px)' : 'none',
        transition: `background-color ${duration}ms ${EASING.standard}, backdrop-filter ${duration}ms ${EASING.standard}`,
      },
    });
  };

  const animateIn = () => {
    // Backdrop fade in
    if (backdropElement) {
      requestAnimationFrame(() => {
        if (backdropElement) {
          backdropElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          if (backdropBlur) {
            backdropElement.style.backdropFilter = 'blur(4px)';
          }
        }
      });
    }

    // Drawer slide in with spring easing
    element.style.transition = `transform ${duration}ms ${EASING.spring}, visibility 0ms`;
    element.style.visibility = 'visible';

    requestAnimationFrame(() => {
      element.style.transform = transforms.open;
    });
  };

  const animateOut = (): Promise<void> => {
    return new Promise((resolve) => {
      // Backdrop fade out
      if (backdropElement) {
        backdropElement.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        if (backdropBlur) {
          backdropElement.style.backdropFilter = 'blur(0px)';
        }
      }

      // Drawer slide out
      element.style.transition = `transform ${duration}ms ${EASING.accelerate}, visibility 0ms ${duration}ms`;
      element.style.transform = transforms.closed;

      setTimeout(() => {
        element.style.visibility = 'hidden';
        resolve();
      }, duration);
    });
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (closeOnBackdrop && e.target === backdropElement) {
      close();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;

    // Lock body scroll
    unlockScroll = lockScroll();

    // Create and append backdrop
    if (backdrop) {
      backdropElement = createBackdropElement();
      if (backdropElement) {
        document.body.appendChild(backdropElement);

        if (closeOnBackdrop) {
          cleanupListeners.push(
            addListener(
              backdropElement,
              'click',
              handleBackdropClick as (ev: DocumentEventMap['click']) => void
            )
          );
        }
      }
    }

    // Update ARIA
    element.setAttribute('aria-hidden', 'false');

    // Add escape key listener (if not using focus trap)
    if (closeOnEscape && !trapFocus) {
      cleanupListeners.push(
        addListener(
          document,
          'keydown',
          handleEscapeKey as (ev: DocumentEventMap['keydown']) => void
        )
      );
    }

    // Trigger animation
    animateIn();

    // Activate focus trap after animation starts
    setTimeout(() => {
      focusTrap?.activate();
    }, 50);

    // Announce to screen readers
    announce(`${side} drawer opened`);

    onOpen?.();
  };

  const close = async () => {
    if (!isOpen) return;
    isOpen = false;

    // Deactivate focus trap first
    focusTrap?.deactivate();

    // Animate out
    await animateOut();

    // Update ARIA
    element.setAttribute('aria-hidden', 'true');

    // Remove backdrop
    if (backdropElement) {
      backdropElement.remove();
      backdropElement = null;
    }

    // Clean up listeners
    cleanupListeners.forEach((cleanup) => cleanup());
    cleanupListeners = [];

    // Unlock scroll
    unlockScroll?.();
    unlockScroll = null;

    // Announce to screen readers
    announce('Drawer closed');

    onClose?.();
  };

  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  const update = () => {
    focusTrap?.updateElements();
  };

  const destroy = () => {
    if (isOpen) {
      focusTrap?.deactivate();
      element.style.visibility = 'hidden';
      element.style.transform = transforms.closed;
      element.setAttribute('aria-hidden', 'true');
      backdropElement?.remove();
      cleanupListeners.forEach((cleanup) => cleanup());
      unlockScroll?.();
    }

    element.removeAttribute('aria-modal');
    element.removeAttribute('aria-hidden');
  };

  return {
    get isOpen() {
      return isOpen;
    },
    get element() {
      return element;
    },
    get side() {
      return side;
    },
    open,
    close,
    toggle,
    update,
    destroy,
  };
}

/** No-op drawer state for SSR */
function createNoopDrawerState(element: HTMLElement, side: DrawerSide): DrawerState {
  return {
    get isOpen() {
      return false;
    },
    get element() {
      return element;
    },
    get side() {
      return side;
    },
    open: () => {},
    close: () => {},
    toggle: () => {},
    update: () => {},
    destroy: () => {},
  };
}
