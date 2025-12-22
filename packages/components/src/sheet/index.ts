/**
 * @fileoverview Sheet component - slide-out panel from screen edge
 * @module @atlas/components/sheet
 */

import { generateId } from '../shared/aria';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal';
import { isBrowser, lockScroll } from '../shared/dom';
import { createFocusTrap, type FocusTrap } from '../shared/focus-trap';
import { ANIMATION_DURATION } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

export type SheetSide = 'top' | 'right' | 'bottom' | 'left';
export type SheetSize = 'sm' | 'default' | 'lg' | 'xl' | 'full';

export interface SheetOptions {
  /** Side to slide from */
  side?: SheetSide;
  /** Sheet size */
  size?: SheetSize;
  /** Whether sheet is modal */
  modal?: boolean;
  /** Close on ESC key */
  closeOnEsc?: boolean;
  /** Close on overlay click */
  closeOnOverlay?: boolean;
  /** Initial open state */
  open?: boolean;
  /** Callback when sheet opens */
  onOpen?: () => void;
  /** Callback when sheet closes */
  onClose?: () => void;
}

export interface SheetState {
  /** Check if sheet is open */
  isOpen: () => boolean;
  /** Open the sheet */
  open: () => void;
  /** Close the sheet */
  close: () => void;
  /** Toggle open state */
  toggle: () => void;
  /** Set side */
  setSide: (side: SheetSide) => void;
  /** Get current side */
  getSide: () => SheetSide;
  /** Set size */
  setSize: (size: SheetSize) => void;
  /** Get current size */
  getSize: () => SheetSize;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  OVERLAY: 'data-atlas-sheet-overlay',
  CONTENT: 'data-atlas-sheet-content',
  HEADER: 'data-atlas-sheet-header',
  TITLE: 'data-atlas-sheet-title',
  DESCRIPTION: 'data-atlas-sheet-description',
  CLOSE: 'data-atlas-sheet-close',
} as const;

const CLASSES = {
  ROOT: 'atlas-sheet',
  OVERLAY: 'atlas-sheet-overlay',
  CONTENT: 'atlas-sheet-content',
  HEADER: 'atlas-sheet-header',
  TITLE: 'atlas-sheet-title',
  DESCRIPTION: 'atlas-sheet-description',
  BODY: 'atlas-sheet-body',
  FOOTER: 'atlas-sheet-footer',
  CLOSE: 'atlas-sheet-close',
  OPEN: 'atlas-sheet--open',
  CLOSING: 'atlas-sheet--closing',
} as const;

const SIDE_CLASSES: Record<SheetSide, string> = {
  top: 'atlas-sheet--top',
  right: 'atlas-sheet--right',
  bottom: 'atlas-sheet--bottom',
  left: 'atlas-sheet--left',
};

const SIZE_CLASSES: Record<SheetSize, string> = {
  sm: 'atlas-sheet--sm',
  default: 'atlas-sheet--default',
  lg: 'atlas-sheet--lg',
  xl: 'atlas-sheet--xl',
  full: 'atlas-sheet--full',
};

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a sheet (slide-out panel) component
 *
 * @example
 * ```ts
 * const sheet = createSheet(element, {
 *   side: 'right',
 *   size: 'default',
 *   modal: true,
 *   onClose: () => console.log('Sheet closed')
 * });
 *
 * sheet.open();
 * ```
 */
export function createSheet(element: HTMLElement, options: SheetOptions = {}): SheetState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    side = 'right',
    size = 'default',
    modal = true,
    closeOnEsc = true,
    closeOnOverlay = true,
    open: initialOpen = false,
  } = options;

  // State
  let isOpenState = false;
  let currentSide = side;
  let currentSize = size;
  let previouslyFocused: HTMLElement | null = null;

  // Elements
  const id = generateId('sheet');
  let overlay: HTMLElement | null = null;
  let content: HTMLElement | null = null;

  // Handlers
  let focusTrap: FocusTrap | null = null;
  let dismissHandler: DismissalHandler | null = null;
  let unlockScrollFn: (() => void) | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-sheet', '');
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', modal ? 'true' : 'false');
    element.id = id;

    // Apply side and size classes
    applySideClass();
    applySizeClass();

    // Find or create overlay
    overlay = element.querySelector(`[${ATTRS.OVERLAY}]`);
    if (!overlay && modal) {
      overlay = document.createElement('div');
      overlay.className = CLASSES.OVERLAY;
      overlay.setAttribute(ATTRS.OVERLAY, '');
      element.insertBefore(overlay, element.firstChild);
    }

    // Find content
    content = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (content) {
      content.setAttribute('tabindex', '-1');
    }

    // Setup ARIA
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

    // Setup overlay click
    if (closeOnOverlay && overlay) {
      overlay.addEventListener('click', handleOverlayClick);
    }

    // Initial state
    if (initialOpen) {
      requestAnimationFrame(() => open());
    }
  }

  function setupCloseButtons(): void {
    const closeButtons = element.querySelectorAll<HTMLElement>(`[${ATTRS.CLOSE}]`);
    closeButtons.forEach((btn) => {
      btn.addEventListener('click', close);
      if (!btn.getAttribute('aria-label')) {
        btn.setAttribute('aria-label', 'Close sheet');
      }
    });
  }

  function handleOverlayClick(event: MouseEvent): void {
    if (event.target === overlay) {
      close();
    }
  }

  function applySideClass(): void {
    Object.values(SIDE_CLASSES).forEach((cls) => {
      element.classList.remove(cls);
    });
    element.classList.add(SIDE_CLASSES[currentSide]);
  }

  function applySizeClass(): void {
    Object.values(SIZE_CLASSES).forEach((cls) => {
      element.classList.remove(cls);
    });
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

    // Lock scroll
    if (modal) {
      unlockScrollFn = lockScroll();
    }

    // Focus trap
    const trapTarget = content ?? element;
    focusTrap = createFocusTrap({
      container: trapTarget,
      initialFocus: 'container',
      returnFocus: previouslyFocused ?? 'previous',
    });
    focusTrap.activate();

    // Dismissal
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

    // Add closing animation class
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

  function setSide(newSide: SheetSide): void {
    currentSide = newSide;
    applySideClass();
  }

  function setSize(newSize: SheetSize): void {
    currentSize = newSize;
    applySizeClass();
  }

  function destroy(): void {
    if (isOpenState) {
      element.classList.remove(CLASSES.OPEN, CLASSES.CLOSING);
      focusTrap?.deactivate();
      dismissHandler?.destroy();
      unlockScrollFn?.();
    }

    overlay?.removeEventListener('click', handleOverlayClick);

    const closeButtons = element.querySelectorAll<HTMLElement>(`[${ATTRS.CLOSE}]`);
    closeButtons.forEach((btn) => {
      btn.removeEventListener('click', close);
    });

    element.classList.remove(
      CLASSES.ROOT,
      CLASSES.OPEN,
      ...Object.values(SIDE_CLASSES),
      ...Object.values(SIZE_CLASSES)
    );
    element.removeAttribute('data-atlas-sheet');
  }

  // Initialize
  init();

  return {
    isOpen: () => isOpenState,
    open,
    close,
    toggle,
    setSide,
    getSide: () => currentSide,
    setSize,
    getSize: () => currentSize,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): SheetState {
  return {
    isOpen: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    setSide: () => {},
    getSide: () => 'right',
    setSize: () => {},
    getSize: () => 'default',
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initSheets(root: Document | HTMLElement = document): SheetState[] {
  if (!isBrowser()) return [];

  const sheets: SheetState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-sheet]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-sheet-initialized')) return;

    const options: SheetOptions = {
      side: (element.getAttribute('data-side') as SheetSide) ?? 'right',
      size: (element.getAttribute('data-size') as SheetSize) ?? 'default',
      modal: element.getAttribute('data-modal') !== 'false',
      closeOnEsc: element.getAttribute('data-close-on-esc') !== 'false',
      closeOnOverlay: element.getAttribute('data-close-on-overlay') !== 'false',
      open: element.hasAttribute('data-open'),
    };

    const sheet = createSheet(element, options);
    element.setAttribute('data-atlas-sheet-initialized', '');
    sheets.push(sheet);
  });

  return sheets;
}
