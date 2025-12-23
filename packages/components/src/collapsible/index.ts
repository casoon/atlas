/**
 * @fileoverview Collapsible component - expandable/collapsible content
 * @module @atlas/components/collapsible
 */

import { generateId } from '../shared/aria.js';
import { addListener, isBrowser } from '../shared/dom.js';

// ============================================================================
// Types
// ============================================================================

export interface CollapsibleOptions {
  /** Initial open state */
  open?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Animation duration in ms */
  duration?: number;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
  /** Callback on toggle */
  onToggle?: (open: boolean) => void;
}

export interface Collapsible {
  /** Root element */
  readonly element: HTMLElement;
  /** Open collapsible */
  open: () => void;
  /** Close collapsible */
  close: () => void;
  /** Toggle state */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Check if disabled */
  isDisabled: () => boolean;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CLASSES = {
  ROOT: 'atlas-collapsible',
  TRIGGER: 'atlas-collapsible-trigger',
  CONTENT: 'atlas-collapsible-content',
  CONTENT_INNER: 'atlas-collapsible-content-inner',
  OPEN: 'atlas-collapsible--open',
  DISABLED: 'atlas-collapsible--disabled',
} as const;

const ATTRS = {
  ROOT: 'data-atlas-collapsible',
  TRIGGER: 'data-atlas-collapsible-trigger',
  CONTENT: 'data-atlas-collapsible-content',
} as const;

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a Collapsible instance
 */
export function createCollapsible(
  element: HTMLElement,
  options: CollapsibleOptions = {}
): Collapsible {
  if (!isBrowser()) {
    return createServerCollapsible(element);
  }

  const {
    open: initialOpen = false,
    disabled: initialDisabled = false,
    duration = 200,
    onOpen,
    onClose,
    onToggle,
  } = options;

  // State
  let isOpenState = initialOpen;
  let isDisabledState = initialDisabled;

  // Elements
  const id = generateId('collapsible');
  let triggerEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;
  let contentInnerEl: HTMLElement | null = null;

  // Cleanups
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');
    element.id = id;

    // Find or create trigger
    triggerEl = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (!triggerEl) {
      triggerEl = element.querySelector('button, [role="button"]');
    }

    // Find or create content
    contentEl = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (!contentEl) {
      // Use remaining content as collapsible content
      const children = Array.from(element.children).filter((child) => child !== triggerEl);
      if (children.length > 0) {
        contentEl = document.createElement('div');
        contentEl.className = CLASSES.CONTENT;
        contentEl.setAttribute(ATTRS.CONTENT, '');

        contentInnerEl = document.createElement('div');
        contentInnerEl.className = CLASSES.CONTENT_INNER;

        children.forEach((child) => {
          contentInnerEl?.appendChild(child);
        });

        contentEl.appendChild(contentInnerEl);
        element.appendChild(contentEl);
      }
    } else {
      // Wrap existing content
      contentInnerEl = document.createElement('div');
      contentInnerEl.className = CLASSES.CONTENT_INNER;

      while (contentEl.firstChild) {
        contentInnerEl.appendChild(contentEl.firstChild);
      }

      contentEl.appendChild(contentInnerEl);
    }

    // Setup trigger
    if (triggerEl) {
      triggerEl.classList.add(CLASSES.TRIGGER);
      triggerEl.setAttribute(ATTRS.TRIGGER, '');
      triggerEl.setAttribute('aria-expanded', String(isOpenState));

      if (contentEl) {
        const contentId = `${id}-content`;
        contentEl.id = contentId;
        triggerEl.setAttribute('aria-controls', contentId);
      }

      cleanups.push(addListener(triggerEl, 'click', handleTriggerClick));
      cleanups.push(addListener(triggerEl, 'keydown', handleTriggerKeydown as EventListener));
    }

    // Setup content
    if (contentEl) {
      contentEl.setAttribute('aria-hidden', String(!isOpenState));

      // Set initial state
      if (!isOpenState) {
        contentEl.style.height = '0';
        contentEl.style.overflow = 'hidden';
      }
    }

    // Apply initial state
    if (isOpenState) {
      element.classList.add(CLASSES.OPEN);
    }

    if (isDisabledState) {
      element.classList.add(CLASSES.DISABLED);
      triggerEl?.setAttribute('aria-disabled', 'true');
    }
  }

  function handleTriggerClick(): void {
    if (isDisabledState) return;
    toggle();
  }

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (isDisabledState) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  }

  function open(): void {
    if (isOpenState || isDisabledState) return;

    isOpenState = true;
    element.classList.add(CLASSES.OPEN);
    element.setAttribute('data-state', 'open');

    triggerEl?.setAttribute('aria-expanded', 'true');
    contentEl?.setAttribute('aria-hidden', 'false');

    // Animate open
    if (contentEl && contentInnerEl) {
      const height = contentInnerEl.offsetHeight;
      contentEl.style.height = '0';
      contentEl.style.overflow = 'hidden';
      contentEl.style.transition = `height ${duration}ms ease-out`;

      requestAnimationFrame(() => {
        if (contentEl) {
          contentEl.style.height = `${height}px`;
        }
      });

      setTimeout(() => {
        if (contentEl) {
          contentEl.style.height = '';
          contentEl.style.overflow = '';
          contentEl.style.transition = '';
        }
      }, duration);
    }

    onOpen?.();
    onToggle?.(true);
  }

  function close(): void {
    if (!isOpenState || isDisabledState) return;

    isOpenState = false;
    element.classList.remove(CLASSES.OPEN);
    element.setAttribute('data-state', 'closed');

    triggerEl?.setAttribute('aria-expanded', 'false');
    contentEl?.setAttribute('aria-hidden', 'true');

    // Animate close
    if (contentEl && contentInnerEl) {
      const height = contentInnerEl.offsetHeight;
      contentEl.style.height = `${height}px`;
      contentEl.style.overflow = 'hidden';
      contentEl.style.transition = `height ${duration}ms ease-out`;

      requestAnimationFrame(() => {
        if (contentEl) {
          contentEl.style.height = '0';
        }
      });

      setTimeout(() => {
        if (contentEl) {
          contentEl.style.transition = '';
        }
      }, duration);
    }

    onClose?.();
    onToggle?.(false);
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  function isOpen(): boolean {
    return isOpenState;
  }

  function setDisabled(disabled: boolean): void {
    isDisabledState = disabled;

    if (disabled) {
      element.classList.add(CLASSES.DISABLED);
      triggerEl?.setAttribute('aria-disabled', 'true');
    } else {
      element.classList.remove(CLASSES.DISABLED);
      triggerEl?.removeAttribute('aria-disabled');
    }
  }

  function isDisabled(): boolean {
    return isDisabledState;
  }

  function destroy(): void {
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN, CLASSES.DISABLED);
    element.removeAttribute(ATTRS.ROOT);
  }

  // Initialize
  init();

  return {
    element,
    open,
    close,
    toggle,
    isOpen,
    setDisabled,
    isDisabled,
    destroy,
  };
}

// ============================================================================
// Server-side stub
// ============================================================================

function createServerCollapsible(element: HTMLElement): Collapsible {
  return {
    element,
    open: () => {},
    close: () => {},
    toggle: () => {},
    isOpen: () => false,
    setDisabled: () => {},
    isDisabled: () => false,
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initCollapsibles(root: Document | HTMLElement = document): Collapsible[] {
  if (!isBrowser()) return [];

  const elements = root.querySelectorAll<HTMLElement>(
    `[${ATTRS.ROOT}]:not([data-atlas-collapsible-initialized])`
  );
  const instances: Collapsible[] = [];

  elements.forEach((element) => {
    const options: CollapsibleOptions = {
      open: element.hasAttribute('data-open'),
      disabled: element.hasAttribute('data-disabled'),
    };

    const instance = createCollapsible(element, options);
    element.setAttribute('data-atlas-collapsible-initialized', '');
    instances.push(instance);
  });

  return instances;
}
