/**
 * @fileoverview Dialog component - modal dialog with focus trap
 * @module @atlas/components/dialog
 */

import { generateId } from '../shared/aria';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal';
import { isBrowser, lockScroll } from '../shared/dom';
import { createFocusTrap, type FocusTrap } from '../shared/focus-trap';
import { ANIMATION_DURATION } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

export type DialogSize = 'sm' | 'default' | 'lg' | 'xl' | 'full';

export interface DialogOptions {
  /** Whether dialog is modal (locks scroll, traps focus) */
  modal?: boolean;
  /** Dialog size */
  size?: DialogSize;
  /** Close on ESC key */
  closeOnEsc?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Initial open state */
  open?: boolean;
  /** Callback when dialog opens */
  onOpen?: () => void;
  /** Callback when dialog closes */
  onClose?: () => void;
}

export interface DialogState {
  /** Check if dialog is open */
  isOpen: () => boolean;
  /** Open the dialog */
  open: () => void;
  /** Close the dialog */
  close: () => void;
  /** Toggle open state */
  toggle: () => void;
  /** Set dialog size */
  setSize: (size: DialogSize) => void;
  /** Get dialog size */
  getSize: () => DialogSize;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  BACKDROP: 'data-atlas-dialog-backdrop',
  CONTENT: 'data-atlas-dialog-content',
  TITLE: 'data-atlas-dialog-title',
  DESCRIPTION: 'data-atlas-dialog-description',
  CLOSE: 'data-atlas-dialog-close',
} as const;

const CLASSES = {
  ROOT: 'atlas-dialog',
  BACKDROP: 'atlas-dialog-backdrop',
  WRAPPER: 'atlas-dialog-wrapper',
  CONTENT: 'atlas-dialog-content',
  HEADER: 'atlas-dialog-header',
  TITLE: 'atlas-dialog-title',
  DESCRIPTION: 'atlas-dialog-description',
  BODY: 'atlas-dialog-body',
  FOOTER: 'atlas-dialog-footer',
  CLOSE: 'atlas-dialog-close',
  OPEN: 'atlas-dialog--open',
  CLOSING: 'atlas-dialog--closing',
} as const;

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'atlas-dialog--sm',
  default: 'atlas-dialog--default',
  lg: 'atlas-dialog--lg',
  xl: 'atlas-dialog--xl',
  full: 'atlas-dialog--full',
};

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates an accessible modal dialog component
 *
 * @example
 * ```ts
 * const dialog = createDialog(element, {
 *   modal: true,
 *   size: 'lg',
 *   onClose: () => console.log('Dialog closed')
 * });
 *
 * // Open dialog
 * dialog.open();
 *
 * // Close dialog
 * dialog.close();
 * ```
 */
export function createDialog(element: HTMLElement, options: DialogOptions = {}): DialogState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    modal = true,
    size = 'default',
    closeOnEsc = true,
    closeOnBackdrop = true,
    open: initialOpen = false,
  } = options;

  // State
  let isOpenState = false;
  let currentSize = size;
  let previouslyFocused: HTMLElement | null = null;

  // Elements
  const id = generateId('dialog');
  let backdrop: HTMLElement | null = null;
  let wrapper: HTMLElement | null = null;
  let content: HTMLElement | null = null;

  // Handlers
  let focusTrap: FocusTrap | null = null;
  let dismissHandler: DismissalHandler | null = null;
  let unlockScrollFn: (() => void) | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-dialog', '');
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', modal ? 'true' : 'false');
    element.id = id;

    // Apply size class
    applySizeClass();

    // Find or create backdrop
    backdrop = element.querySelector(`[${ATTRS.BACKDROP}]`);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = CLASSES.BACKDROP;
      backdrop.setAttribute(ATTRS.BACKDROP, '');
      element.insertBefore(backdrop, element.firstChild);
    }

    // Find or create wrapper
    wrapper = element.querySelector(`.${CLASSES.WRAPPER}`);
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = CLASSES.WRAPPER;

      // Move existing content into wrapper
      const existingContent = element.querySelector(`[${ATTRS.CONTENT}]`);
      if (existingContent) {
        wrapper.appendChild(existingContent);
      }
      element.appendChild(wrapper);
    }

    // Find content
    content = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (!content) {
      content = wrapper.querySelector(`.${CLASSES.CONTENT}`);
    }
    if (content) {
      content.setAttribute('tabindex', '-1');
    }

    // Setup ARIA attributes
    const title = element.querySelector(`[${ATTRS.TITLE}]`);
    if (title) {
      const titleId = `${id}-title`;
      title.id = titleId;
      element.setAttribute('aria-labelledby', titleId);
    }

    const description = element.querySelector(`[${ATTRS.DESCRIPTION}]`);
    if (description) {
      const descId = `${id}-desc`;
      description.id = descId;
      element.setAttribute('aria-describedby', descId);
    }

    // Setup close buttons
    setupCloseButtons();

    // Setup backdrop click
    if (closeOnBackdrop && backdrop) {
      backdrop.addEventListener('click', handleBackdropClick);
    }

    // Initial state
    if (initialOpen) {
      // Defer opening to allow DOM to settle
      requestAnimationFrame(() => open());
    }
  }

  function setupCloseButtons(): void {
    const closeButtons = element.querySelectorAll<HTMLElement>(`[${ATTRS.CLOSE}]`);
    closeButtons.forEach((btn) => {
      btn.addEventListener('click', close);
      if (!btn.getAttribute('aria-label')) {
        btn.setAttribute('aria-label', 'Close dialog');
      }
    });
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === backdrop) {
      close();
    }
  }

  function applySizeClass(): void {
    // Remove all size classes
    Object.values(SIZE_CLASSES).forEach((cls) => {
      element.classList.remove(cls);
    });
    // Add current size class
    element.classList.add(SIZE_CLASSES[currentSize]);
  }

  function open(): void {
    if (isOpenState) return;

    isOpenState = true;

    // Save focus
    previouslyFocused = document.activeElement as HTMLElement;

    // Show element
    element.classList.add(CLASSES.OPEN);
    element.removeAttribute('hidden');

    // Lock scroll for modal
    if (modal) {
      unlockScrollFn = lockScroll();
    }

    // Setup focus trap
    const trapTarget = content ?? wrapper ?? element;
    focusTrap = createFocusTrap({
      container: trapTarget,
      initialFocus: 'container',
      returnFocus: previouslyFocused ?? 'previous',
    });
    focusTrap.activate();

    // Setup dismissal
    if (closeOnEsc) {
      dismissHandler = createDismissHandler(element, {
        escapeKey: true,
        clickOutside: false,
        onDismiss: close,
      });
    }

    // Focus content
    requestAnimationFrame(() => {
      (content ?? element).focus();
    });

    options.onOpen?.();
  }

  function close(): void {
    if (!isOpenState) return;

    isOpenState = false;

    // Add closing class for animation
    element.classList.add(CLASSES.CLOSING);

    // Wait for animation
    setTimeout(() => {
      element.classList.remove(CLASSES.OPEN, CLASSES.CLOSING);
      element.setAttribute('hidden', '');

      // Cleanup
      focusTrap?.deactivate();
      focusTrap = null;

      dismissHandler?.destroy();
      dismissHandler = null;

      unlockScrollFn?.();
      unlockScrollFn = null;

      // Return focus
      previouslyFocused?.focus();
      previouslyFocused = null;

      options.onClose?.();
    }, ANIMATION_DURATION.normal);
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  function setSize(newSize: DialogSize): void {
    currentSize = newSize;
    applySizeClass();
  }

  function destroy(): void {
    if (isOpenState) {
      // Immediate cleanup without animation
      element.classList.remove(CLASSES.OPEN, CLASSES.CLOSING);
      focusTrap?.deactivate();
      dismissHandler?.destroy();
      unlockScrollFn?.();
    }

    backdrop?.removeEventListener('click', handleBackdropClick);

    const closeButtons = element.querySelectorAll<HTMLElement>(`[${ATTRS.CLOSE}]`);
    closeButtons.forEach((btn) => {
      btn.removeEventListener('click', close);
    });

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN, ...Object.values(SIZE_CLASSES));
    element.removeAttribute('data-atlas-dialog');
    element.removeAttribute('role');
    element.removeAttribute('aria-modal');
  }

  // Initialize
  init();

  return {
    isOpen: () => isOpenState,
    open,
    close,
    toggle,
    setSize,
    getSize: () => currentSize,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): DialogState {
  return {
    isOpen: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    setSize: () => {},
    getSize: () => 'default',
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initDialogs(root: Document | HTMLElement = document): DialogState[] {
  if (!isBrowser()) return [];

  const dialogs: DialogState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-dialog]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-dialog-initialized')) return;

    const options: DialogOptions = {
      modal: element.getAttribute('data-modal') !== 'false',
      size: (element.getAttribute('data-size') as DialogSize) ?? 'default',
      closeOnEsc: element.getAttribute('data-close-on-esc') !== 'false',
      closeOnBackdrop: element.getAttribute('data-close-on-backdrop') !== 'false',
      open: element.hasAttribute('data-open'),
    };

    const dialog = createDialog(element, options);
    element.setAttribute('data-atlas-dialog-initialized', '');
    dialogs.push(dialog);
  });

  return dialogs;
}
