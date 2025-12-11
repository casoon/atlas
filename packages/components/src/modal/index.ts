/**
 * Modal Component
 *
 * A fully accessible modal dialog with micro-interactions:
 * - Smooth fade + scale animation on open/close
 * - Backdrop blur effect
 * - Focus trap for keyboard navigation
 * - Escape key to close
 * - Click outside to close
 * - Scroll lock on body
 *
 * @example
 * ```typescript
 * const modal = createModal(document.getElementById('my-modal'), {
 *   onOpen: () => console.log('Modal opened'),
 *   onClose: () => console.log('Modal closed'),
 * });
 *
 * // Open modal
 * modal.open();
 *
 * // Close modal
 * modal.close();
 *
 * // Clean up when done
 * modal.destroy();
 * ```
 */

import { announce, generateId, getModalAriaAttributes } from '../shared/aria';
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

export interface ModalOptions extends BaseComponentOptions {
  /** Show backdrop overlay (default: true) */
  backdrop?: boolean;
  /** Close when clicking backdrop (default: true) */
  closeOnBackdrop?: boolean;
  /** Close when pressing Escape (default: true) */
  closeOnEscape?: boolean;
  /** Trap focus within modal (default: true) */
  trapFocus?: boolean;
  /** Animation timing (default: 'normal') */
  animation?: AnimationTiming;
  /** Blur backdrop (default: true) */
  backdropBlur?: boolean;
  /** Accessible label for the modal */
  ariaLabel?: string;
  /** ID of element that labels the modal */
  ariaLabelledBy?: string;
  /** ID of element that describes the modal */
  ariaDescribedBy?: string;
}

export interface ModalState extends BaseComponentState {
  /** The modal element */
  readonly element: HTMLElement;
  /** Update modal content (re-calculates focusable elements) */
  update: () => void;
}

export function createModal(element: HTMLElement, options: ModalOptions = {}): ModalState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopModalState(element);
  }

  const {
    backdrop = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    trapFocus = true,
    animation = 'normal',
    backdropBlur = true,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    onOpen,
    onClose,
  } = options;

  const duration = ANIMATION_DURATION[animation];
  const modalId = generateId('modal');

  let isOpen = false;
  let backdropElement: HTMLElement | null = null;
  let focusTrap: FocusTrap | null = null;
  let unlockScroll: (() => void) | null = null;
  let cleanupListeners: (() => void)[] = [];

  // Apply ARIA attributes to modal element
  const ariaAttrs = getModalAriaAttributes({
    labelledBy: ariaLabelledBy,
    describedBy: ariaDescribedBy,
  });

  element.id = element.id || modalId;
  for (const [key, value] of Object.entries(ariaAttrs)) {
    element.setAttribute(key, value);
  }

  if (ariaLabel) {
    element.setAttribute('aria-label', ariaLabel);
  }

  // Initial hidden state
  element.setAttribute('aria-hidden', 'true');
  element.style.display = 'none';

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
      className: 'atlas-modal-backdrop',
      attributes: {
        'data-atlas-modal-backdrop': '',
        'aria-hidden': 'true',
      },
      styles: {
        position: 'fixed',
        inset: '0',
        zIndex: String(Z_INDEX.modal - 1),
        backgroundColor: 'rgba(0, 0, 0, 0)',
        backdropFilter: backdropBlur ? 'blur(0px)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: `background-color ${duration}ms ${EASING.standard}, backdrop-filter ${duration}ms ${EASING.standard}`,
      },
    });
  };

  const animateIn = () => {
    if (!backdropElement) return;

    // Backdrop fade in
    requestAnimationFrame(() => {
      if (backdropElement) {
        backdropElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        if (backdropBlur) {
          backdropElement.style.backdropFilter = 'blur(4px)';
        }
      }

      // Modal scale + fade in
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
    });
  };

  const animateOut = (): Promise<void> => {
    return new Promise((resolve) => {
      if (backdropElement) {
        backdropElement.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        if (backdropBlur) {
          backdropElement.style.backdropFilter = 'blur(0px)';
        }
      }

      element.style.opacity = '0';
      element.style.transform = 'scale(0.95)';

      setTimeout(resolve, duration);
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

    // Show modal with initial animation state
    element.style.display = '';
    element.style.position = 'fixed';
    element.style.zIndex = String(Z_INDEX.modal);
    element.style.opacity = '0';
    element.style.transform = 'scale(0.95)';
    element.style.transition = `opacity ${duration}ms ${EASING.decelerate}, transform ${duration}ms ${EASING.spring}`;
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

    // Activate focus trap
    focusTrap?.activate();

    // Announce to screen readers
    announce('Dialog opened');

    onOpen?.();
  };

  const close = async () => {
    if (!isOpen) return;
    isOpen = false;

    // Deactivate focus trap first
    focusTrap?.deactivate();

    // Animate out
    await animateOut();

    // Hide modal
    element.style.display = 'none';
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
    announce('Dialog closed');

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
      // Immediate close without animation
      focusTrap?.deactivate();
      element.style.display = 'none';
      element.setAttribute('aria-hidden', 'true');
      backdropElement?.remove();
      cleanupListeners.forEach((cleanup) => cleanup());
      unlockScroll?.();
    }

    // Remove ARIA attributes we added
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
    open,
    close,
    toggle,
    update,
    destroy,
  };
}

/** No-op modal state for SSR */
function createNoopModalState(element: HTMLElement): ModalState {
  return {
    get isOpen() {
      return false;
    },
    get element() {
      return element;
    },
    open: () => {},
    close: () => {},
    toggle: () => {},
    update: () => {},
    destroy: () => {},
  };
}
