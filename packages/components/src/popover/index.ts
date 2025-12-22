/**
 * @fileoverview Popover component - floating content panel
 * @module @atlas/components/popover
 */

import { generateId } from '../shared/aria';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal';
import { addListener, isBrowser } from '../shared/dom';
import { autoUpdate, computeFloatingPosition, type FloatingPlacement } from '../shared/floating';
import { createFocusTrap, type FocusTrap } from '../shared/focus-trap';
import { ANIMATION_DURATION } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

export type PopoverTrigger = 'click' | 'hover' | 'focus' | 'manual';

export interface PopoverOptions {
  /** How to trigger the popover */
  trigger?: PopoverTrigger;
  /** Placement relative to trigger */
  placement?: FloatingPlacement;
  /** Offset from trigger in pixels */
  offset?: number;
  /** Whether to trap focus inside */
  trapFocus?: boolean;
  /** Delay before showing (hover mode) */
  showDelay?: number;
  /** Delay before hiding (hover mode) */
  hideDelay?: number;
  /** Close on ESC key */
  closeOnEsc?: boolean;
  /** Close on click outside */
  closeOnClickOutside?: boolean;
  /** Initial open state */
  open?: boolean;
  /** Callback when popover opens */
  onOpen?: () => void;
  /** Callback when popover closes */
  onClose?: () => void;
}

export interface PopoverState {
  /** Check if popover is open */
  isOpen: () => boolean;
  /** Open the popover */
  open: () => void;
  /** Close the popover */
  close: () => void;
  /** Toggle open state */
  toggle: () => void;
  /** Update position */
  updatePosition: () => void;
  /** Set placement */
  setPlacement: (placement: FloatingPlacement) => void;
  /** Get current placement */
  getPlacement: () => FloatingPlacement;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  TRIGGER: 'data-atlas-popover-trigger',
  CONTENT: 'data-atlas-popover-content',
  ARROW: 'data-atlas-popover-arrow',
} as const;

const CLASSES = {
  ROOT: 'atlas-popover',
  TRIGGER: 'atlas-popover-trigger',
  CONTENT: 'atlas-popover-content',
  ARROW: 'atlas-popover-arrow',
  OPEN: 'atlas-popover--open',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a popover component with floating positioning
 *
 * @example
 * ```ts
 * const popover = createPopover(container, {
 *   trigger: 'click',
 *   placement: 'bottom',
 *   offset: 8,
 *   onOpen: () => console.log('Opened')
 * });
 * ```
 */
export function createPopover(element: HTMLElement, options: PopoverOptions = {}): PopoverState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    trigger = 'click',
    placement: initialPlacement = 'bottom',
    offset = 8,
    trapFocus = true,
    showDelay = 0,
    hideDelay = 100,
    closeOnEsc = true,
    closeOnClickOutside = true,
    open: initialOpen = false,
  } = options;

  // State
  let isOpenState = false;
  let currentPlacement = initialPlacement;
  let showTimeout: ReturnType<typeof setTimeout> | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  // Elements
  const id = generateId('popover');
  let triggerEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;

  // Handlers
  let focusTrap: FocusTrap | null = null;
  let dismissHandler: DismissalHandler | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-popover', '');

    // Find trigger
    triggerEl = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (!triggerEl) {
      triggerEl = element.firstElementChild as HTMLElement;
      triggerEl?.setAttribute(ATTRS.TRIGGER, '');
    }

    // Find content
    contentEl = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (contentEl) {
      contentEl.id = `${id}-content`;
      contentEl.setAttribute('role', 'dialog');
      contentEl.setAttribute('aria-modal', 'false');
      contentEl.setAttribute('tabindex', '-1');
      contentEl.style.display = 'none';
    }

    // Setup trigger attributes
    if (triggerEl) {
      triggerEl.id = triggerEl.id || `${id}-trigger`;
      triggerEl.setAttribute('aria-haspopup', 'dialog');
      triggerEl.setAttribute('aria-expanded', 'false');
      if (contentEl) {
        triggerEl.setAttribute('aria-controls', contentEl.id);
      }
    }

    // Setup events based on trigger mode
    setupTriggerEvents();

    // Initial state
    if (initialOpen) {
      requestAnimationFrame(() => open());
    }
  }

  function setupTriggerEvents(): void {
    if (!triggerEl) return;

    switch (trigger) {
      case 'click':
        cleanups.push(addListener(triggerEl, 'click', handleTriggerClick as EventListener));
        cleanups.push(addListener(triggerEl, 'keydown', handleTriggerKeydown as EventListener));
        break;

      case 'hover':
        cleanups.push(addListener(triggerEl, 'mouseenter', handleMouseEnter as EventListener));
        cleanups.push(addListener(triggerEl, 'mouseleave', handleMouseLeave as EventListener));
        if (contentEl) {
          cleanups.push(
            addListener(contentEl, 'mouseenter', handleContentMouseEnter as EventListener)
          );
          cleanups.push(addListener(contentEl, 'mouseleave', handleMouseLeave as EventListener));
        }
        break;

      case 'focus':
        cleanups.push(addListener(triggerEl, 'focus', () => open()));
        cleanups.push(addListener(triggerEl, 'blur', () => close()));
        break;

      case 'manual':
        // No automatic triggers
        break;
    }
  }

  function handleTriggerClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  }

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  }

  function handleMouseEnter(): void {
    clearTimeouts();
    showTimeout = setTimeout(() => {
      open();
    }, showDelay);
  }

  function handleMouseLeave(): void {
    clearTimeouts();
    hideTimeout = setTimeout(() => {
      close();
    }, hideDelay);
  }

  function handleContentMouseEnter(): void {
    clearTimeouts();
  }

  function clearTimeouts(): void {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function open(): void {
    if (isOpenState || !contentEl || !triggerEl) return;

    clearTimeouts();
    isOpenState = true;

    // Update ARIA
    triggerEl.setAttribute('aria-expanded', 'true');

    // Show content
    contentEl.style.display = '';
    element.classList.add(CLASSES.OPEN);

    // Position
    updatePosition();

    // Auto-update position
    cleanupAutoUpdate = autoUpdate(triggerEl, contentEl, updatePosition);

    // Focus trap
    if (trapFocus) {
      focusTrap = createFocusTrap({
        container: contentEl,
        initialFocus: 'container',
        returnFocus: triggerEl,
      });
      focusTrap.activate();
    }

    // Dismissal
    dismissHandler = createDismissHandler(contentEl, {
      escapeKey: closeOnEsc,
      clickOutside: closeOnClickOutside,
      ignore: [triggerEl],
      onDismiss: close,
    });

    // Focus content
    requestAnimationFrame(() => {
      contentEl?.focus();
    });

    options.onOpen?.();
  }

  function close(): void {
    if (!isOpenState || !contentEl || !triggerEl) return;

    clearTimeouts();
    isOpenState = false;

    // Update ARIA
    triggerEl.setAttribute('aria-expanded', 'false');

    // Hide content
    element.classList.remove(CLASSES.OPEN);

    // Cleanup
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;

    focusTrap?.deactivate();
    focusTrap = null;

    dismissHandler?.destroy();
    dismissHandler = null;

    // Hide after animation
    setTimeout(() => {
      if (!isOpenState && contentEl) {
        contentEl.style.display = 'none';
      }
    }, ANIMATION_DURATION.normal);

    // Return focus to trigger
    triggerEl.focus();

    options.onClose?.();
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  function updatePosition(): void {
    if (!triggerEl || !contentEl) return;

    const result = computeFloatingPosition(triggerEl, contentEl, {
      placement: currentPlacement,
      offset,
      flip: true,
      shift: true,
    });

    contentEl.style.position = 'absolute';
    contentEl.style.left = `${result.x}px`;
    contentEl.style.top = `${result.y}px`;
    contentEl.setAttribute('data-placement', result.placement);

    // Update arrow if present
    const arrow = contentEl.querySelector(`[${ATTRS.ARROW}]`) as HTMLElement;
    if (arrow && (result.arrowX !== undefined || result.arrowY !== undefined)) {
      arrow.style.left = result.arrowX !== undefined ? `${result.arrowX}px` : '';
      arrow.style.top = result.arrowY !== undefined ? `${result.arrowY}px` : '';
    }
  }

  function setPlacement(placement: FloatingPlacement): void {
    currentPlacement = placement;
    if (isOpenState) {
      updatePosition();
    }
  }

  function destroy(): void {
    clearTimeouts();

    if (isOpenState) {
      focusTrap?.deactivate();
      dismissHandler?.destroy();
      cleanupAutoUpdate?.();
    }

    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN);
    element.removeAttribute('data-atlas-popover');
  }

  // Initialize
  init();

  return {
    isOpen: () => isOpenState,
    open,
    close,
    toggle,
    updatePosition,
    setPlacement,
    getPlacement: () => currentPlacement,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): PopoverState {
  return {
    isOpen: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    updatePosition: () => {},
    setPlacement: () => {},
    getPlacement: () => 'bottom',
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initPopovers(root: Document | HTMLElement = document): PopoverState[] {
  if (!isBrowser()) return [];

  const popovers: PopoverState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-popover]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-popover-initialized')) return;

    const options: PopoverOptions = {
      trigger: (element.getAttribute('data-trigger') as PopoverTrigger) ?? 'click',
      placement: (element.getAttribute('data-placement') as FloatingPlacement) ?? 'bottom',
      offset: parseInt(element.getAttribute('data-offset') ?? '8', 10),
      trapFocus: element.getAttribute('data-trap-focus') !== 'false',
      showDelay: parseInt(element.getAttribute('data-show-delay') ?? '0', 10),
      hideDelay: parseInt(element.getAttribute('data-hide-delay') ?? '100', 10),
      closeOnEsc: element.getAttribute('data-close-on-esc') !== 'false',
      closeOnClickOutside: element.getAttribute('data-close-on-click-outside') !== 'false',
      open: element.hasAttribute('data-open'),
    };

    const popover = createPopover(element, options);
    element.setAttribute('data-atlas-popover-initialized', '');
    popovers.push(popover);
  });

  return popovers;
}
