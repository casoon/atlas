/**
 * @fileoverview Alert Dialog component - confirmation dialogs
 * @module @atlas/components/alert-dialog
 */

import { generateId } from '../shared/aria.js';
import { isBrowser, lockScroll } from '../shared/dom.js';
import { createFocusTrap, type FocusTrap } from '../shared/focus-trap.js';

// ============================================================================
// Types
// ============================================================================

export interface AlertDialogOptions {
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Action button text */
  actionText?: string;
  /** Action button variant */
  actionVariant?: 'default' | 'destructive';
  /** Initial open state */
  open?: boolean;
  /** Callback when action is confirmed */
  onAction?: () => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
}

export interface AlertDialog {
  /** Root element */
  readonly element: HTMLElement;
  /** Open dialog */
  open: () => void;
  /** Close dialog */
  close: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Set title */
  setTitle: (title: string) => void;
  /** Set description */
  setDescription: (description: string) => void;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CLASSES = {
  ROOT: 'atlas-alert-dialog',
  BACKDROP: 'atlas-alert-dialog-backdrop',
  CONTENT: 'atlas-alert-dialog-content',
  HEADER: 'atlas-alert-dialog-header',
  TITLE: 'atlas-alert-dialog-title',
  DESCRIPTION: 'atlas-alert-dialog-description',
  FOOTER: 'atlas-alert-dialog-footer',
  CANCEL: 'atlas-alert-dialog-cancel',
  ACTION: 'atlas-alert-dialog-action',
  OPEN: 'atlas-alert-dialog--open',
  ACTION_DESTRUCTIVE: 'atlas-alert-dialog-action--destructive',
} as const;

const ATTRS = {
  ROOT: 'data-atlas-alert-dialog',
  CONTENT: 'data-atlas-alert-dialog-content',
  TITLE: 'data-atlas-alert-dialog-title',
  DESCRIPTION: 'data-atlas-alert-dialog-description',
  CANCEL: 'data-atlas-alert-dialog-cancel',
  ACTION: 'data-atlas-alert-dialog-action',
  TRIGGER: 'data-atlas-alert-dialog-trigger',
} as const;

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates an Alert Dialog instance
 */
export function createAlertDialog(
  element: HTMLElement,
  options: AlertDialogOptions = {}
): AlertDialog {
  if (!isBrowser()) {
    return createServerAlertDialog(element);
  }

  const {
    title: initialTitle = 'Are you sure?',
    description: initialDescription = '',
    cancelText = 'Cancel',
    actionText = 'Continue',
    actionVariant = 'default',
    open: initialOpen = false,
    onAction,
    onCancel,
    onOpen,
    onClose,
  } = options;

  // State
  let isOpenState = initialOpen;
  let previouslyFocused: HTMLElement | null = null;

  // Elements
  const id = generateId('alert-dialog');
  let backdropEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;
  let titleEl: HTMLElement | null = null;
  let descriptionEl: HTMLElement | null = null;
  let cancelBtn: HTMLButtonElement | null = null;
  let actionBtn: HTMLButtonElement | null = null;

  // Handlers
  let focusTrap: FocusTrap | null = null;
  let unlockScrollFn: (() => void) | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');
    element.id = id;

    // Create backdrop
    backdropEl = document.createElement('div');
    backdropEl.className = CLASSES.BACKDROP;
    element.appendChild(backdropEl);

    // Create content
    contentEl = document.createElement('div');
    contentEl.className = CLASSES.CONTENT;
    contentEl.setAttribute(ATTRS.CONTENT, '');
    contentEl.setAttribute('role', 'alertdialog');
    contentEl.setAttribute('aria-modal', 'true');
    contentEl.setAttribute('aria-labelledby', `${id}-title`);
    contentEl.setAttribute('aria-describedby', `${id}-description`);
    contentEl.setAttribute('tabindex', '-1');

    // Header
    const headerEl = document.createElement('div');
    headerEl.className = CLASSES.HEADER;

    titleEl = document.createElement('h2');
    titleEl.className = CLASSES.TITLE;
    titleEl.setAttribute(ATTRS.TITLE, '');
    titleEl.id = `${id}-title`;
    titleEl.textContent = initialTitle;
    headerEl.appendChild(titleEl);

    if (initialDescription) {
      descriptionEl = document.createElement('p');
      descriptionEl.className = CLASSES.DESCRIPTION;
      descriptionEl.setAttribute(ATTRS.DESCRIPTION, '');
      descriptionEl.id = `${id}-description`;
      descriptionEl.textContent = initialDescription;
      headerEl.appendChild(descriptionEl);
    }

    contentEl.appendChild(headerEl);

    // Footer
    const footerEl = document.createElement('div');
    footerEl.className = CLASSES.FOOTER;

    cancelBtn = document.createElement('button');
    cancelBtn.className = CLASSES.CANCEL;
    cancelBtn.setAttribute(ATTRS.CANCEL, '');
    cancelBtn.setAttribute('type', 'button');
    cancelBtn.textContent = cancelText;
    cancelBtn.addEventListener('click', handleCancel);
    footerEl.appendChild(cancelBtn);

    actionBtn = document.createElement('button');
    actionBtn.className = CLASSES.ACTION;
    if (actionVariant === 'destructive') {
      actionBtn.classList.add(CLASSES.ACTION_DESTRUCTIVE);
    }
    actionBtn.setAttribute(ATTRS.ACTION, '');
    actionBtn.setAttribute('type', 'button');
    actionBtn.textContent = actionText;
    actionBtn.addEventListener('click', handleAction);
    footerEl.appendChild(actionBtn);

    contentEl.appendChild(footerEl);
    element.appendChild(contentEl);

    // Setup trigger
    setupTrigger();

    // Open if initial state
    if (initialOpen) {
      open();
    }
  }

  function setupTrigger(): void {
    const triggerEl = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (triggerEl) {
      triggerEl.addEventListener('click', () => open());
    }
  }

  function handleCancel(): void {
    onCancel?.();
    close();
  }

  function handleAction(): void {
    onAction?.();
    close();
  }

  function open(): void {
    if (isOpenState) return;

    isOpenState = true;
    previouslyFocused = document.activeElement as HTMLElement;

    element.classList.add(CLASSES.OPEN);
    element.setAttribute('data-state', 'open');

    // Lock scroll
    unlockScrollFn = lockScroll();

    // Setup focus trap
    if (contentEl) {
      focusTrap = createFocusTrap({
        container: contentEl,
        initialFocus: 'container',
        returnFocus: previouslyFocused,
      });
      focusTrap.activate();
    }

    onOpen?.();
  }

  function close(): void {
    if (!isOpenState) return;

    isOpenState = false;

    element.classList.remove(CLASSES.OPEN);
    element.setAttribute('data-state', 'closed');

    // Cleanup
    focusTrap?.deactivate();
    focusTrap = null;

    unlockScrollFn?.();
    unlockScrollFn = null;

    // Return focus
    previouslyFocused?.focus();
    previouslyFocused = null;

    onClose?.();
  }

  function isOpen(): boolean {
    return isOpenState;
  }

  function setTitle(title: string): void {
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  function setDescription(description: string): void {
    if (!contentEl) return;

    if (!descriptionEl) {
      const headerEl = contentEl.querySelector(`.${CLASSES.HEADER}`);
      if (headerEl) {
        descriptionEl = document.createElement('p');
        descriptionEl.className = CLASSES.DESCRIPTION;
        descriptionEl.setAttribute(ATTRS.DESCRIPTION, '');
        descriptionEl.id = `${id}-description`;
        headerEl.appendChild(descriptionEl);
      }
    }

    if (descriptionEl) {
      descriptionEl.textContent = description;
    }
  }

  function destroy(): void {
    close();

    cancelBtn?.removeEventListener('click', handleCancel);
    actionBtn?.removeEventListener('click', handleAction);

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN);
    element.removeAttribute(ATTRS.ROOT);
    element.innerHTML = '';
  }

  // Initialize
  init();

  return {
    element,
    open,
    close,
    isOpen,
    setTitle,
    setDescription,
    destroy,
  };
}

// ============================================================================
// Server-side stub
// ============================================================================

function createServerAlertDialog(element: HTMLElement): AlertDialog {
  return {
    element,
    open: () => {},
    close: () => {},
    isOpen: () => false,
    setTitle: () => {},
    setDescription: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initAlertDialogs(root: Document | HTMLElement = document): AlertDialog[] {
  if (!isBrowser()) return [];

  const elements = root.querySelectorAll<HTMLElement>(
    `[${ATTRS.ROOT}]:not([data-atlas-alert-dialog-initialized])`
  );
  const dialogs: AlertDialog[] = [];

  elements.forEach((element) => {
    const options: AlertDialogOptions = {
      title: element.getAttribute('data-title') ?? undefined,
      description: element.getAttribute('data-description') ?? undefined,
      cancelText: element.getAttribute('data-cancel-text') ?? undefined,
      actionText: element.getAttribute('data-action-text') ?? undefined,
      actionVariant:
        (element.getAttribute('data-action-variant') as 'default' | 'destructive') ?? 'default',
    };

    const dialog = createAlertDialog(element, options);
    element.setAttribute('data-atlas-alert-dialog-initialized', '');
    dialogs.push(dialog);
  });

  return dialogs;
}
