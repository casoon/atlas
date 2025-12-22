/**
 * @fileoverview Hover Card component - preview cards on hover
 * @module @atlas/components/hover-card
 */

import { generateId } from '../shared/aria.js';
import { addListener, isBrowser } from '../shared/dom.js';
import {
  applyFloatingStyles,
  autoUpdate,
  computeFloatingPosition,
  type FloatingPlacement,
} from '../shared/floating.js';

// ============================================================================
// Types
// ============================================================================

export interface HoverCardOptions {
  /** Placement relative to trigger */
  placement?: FloatingPlacement;
  /** Delay before opening (ms) */
  openDelay?: number;
  /** Delay before closing (ms) */
  closeDelay?: number;
  /** Offset from trigger */
  offset?: number;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
}

export interface HoverCard {
  /** Root element */
  readonly element: HTMLElement;
  /** Open card */
  open: () => void;
  /** Close card */
  close: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update position */
  updatePosition: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CLASSES = {
  ROOT: 'atlas-hover-card',
  TRIGGER: 'atlas-hover-card-trigger',
  CONTENT: 'atlas-hover-card-content',
  ARROW: 'atlas-hover-card-arrow',
  OPEN: 'atlas-hover-card--open',
} as const;

const ATTRS = {
  ROOT: 'data-atlas-hover-card',
  TRIGGER: 'data-atlas-hover-card-trigger',
  CONTENT: 'data-atlas-hover-card-content',
} as const;

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a Hover Card instance
 */
export function createHoverCard(element: HTMLElement, options: HoverCardOptions = {}): HoverCard {
  if (!isBrowser()) {
    return createServerHoverCard(element);
  }

  const {
    placement = 'bottom',
    openDelay = 500,
    closeDelay = 300,
    offset = 8,
    onOpen,
    onClose,
  } = options;

  // State
  let isOpenState = false;
  let openTimeout: ReturnType<typeof setTimeout> | null = null;
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Elements
  const id = generateId('hover-card');
  let triggerEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;

  // Handlers
  let cleanupAutoUpdate: (() => void) | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');
    element.id = id;

    // Find trigger
    triggerEl = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (!triggerEl) {
      triggerEl = element.firstElementChild as HTMLElement;
    }

    // Find content
    contentEl = element.querySelector(`[${ATTRS.CONTENT}]`);

    if (triggerEl && contentEl) {
      // Setup trigger
      triggerEl.classList.add(CLASSES.TRIGGER);
      triggerEl.setAttribute(ATTRS.TRIGGER, '');

      // Setup content
      contentEl.classList.add(CLASSES.CONTENT);
      contentEl.setAttribute(ATTRS.CONTENT, '');
      contentEl.setAttribute('role', 'tooltip');
      contentEl.id = `${id}-content`;

      // ARIA
      triggerEl.setAttribute('aria-describedby', contentEl.id);

      // Events
      cleanups.push(addListener(triggerEl, 'mouseenter', handleTriggerEnter));
      cleanups.push(addListener(triggerEl, 'mouseleave', handleTriggerLeave));
      cleanups.push(addListener(triggerEl, 'focus', handleTriggerEnter));
      cleanups.push(addListener(triggerEl, 'blur', handleTriggerLeave));

      cleanups.push(addListener(contentEl, 'mouseenter', handleContentEnter));
      cleanups.push(addListener(contentEl, 'mouseleave', handleContentLeave));
    }
  }

  function handleTriggerEnter(): void {
    clearTimeouts();
    openTimeout = setTimeout(open, openDelay);
  }

  function handleTriggerLeave(): void {
    clearTimeouts();
    closeTimeout = setTimeout(close, closeDelay);
  }

  function handleContentEnter(): void {
    clearTimeouts();
  }

  function handleContentLeave(): void {
    clearTimeouts();
    closeTimeout = setTimeout(close, closeDelay);
  }

  function clearTimeouts(): void {
    if (openTimeout) {
      clearTimeout(openTimeout);
      openTimeout = null;
    }
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  }

  function open(): void {
    if (isOpenState || !triggerEl || !contentEl) return;

    isOpenState = true;
    element.classList.add(CLASSES.OPEN);
    element.setAttribute('data-state', 'open');

    // Update position
    updatePosition();

    // Auto-update position
    cleanupAutoUpdate = autoUpdate(triggerEl, contentEl, updatePosition);

    onOpen?.();
  }

  function close(): void {
    if (!isOpenState) return;

    isOpenState = false;
    element.classList.remove(CLASSES.OPEN);
    element.setAttribute('data-state', 'closed');

    // Cleanup auto-update
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;

    onClose?.();
  }

  function isOpen(): boolean {
    return isOpenState;
  }

  function updatePosition(): void {
    if (!triggerEl || !contentEl) return;

    const result = computeFloatingPosition(triggerEl, contentEl, {
      placement,
      offset,
      flip: true,
      shift: true,
      shiftPadding: 8,
    });

    applyFloatingStyles(contentEl, result);
    contentEl.setAttribute('data-placement', result.placement);
  }

  function destroy(): void {
    clearTimeouts();
    close();
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN);
    element.removeAttribute(ATTRS.ROOT);
  }

  // Initialize
  init();

  return {
    element,
    open,
    close,
    isOpen,
    updatePosition,
    destroy,
  };
}

// ============================================================================
// Server-side stub
// ============================================================================

function createServerHoverCard(element: HTMLElement): HoverCard {
  return {
    element,
    open: () => {},
    close: () => {},
    isOpen: () => false,
    updatePosition: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initHoverCards(root: Document | HTMLElement = document): HoverCard[] {
  if (!isBrowser()) return [];

  const elements = root.querySelectorAll<HTMLElement>(
    `[${ATTRS.ROOT}]:not([data-atlas-hover-card-initialized])`
  );
  const instances: HoverCard[] = [];

  elements.forEach((element) => {
    const options: HoverCardOptions = {
      placement: (element.getAttribute('data-placement') as FloatingPlacement) ?? 'bottom',
      openDelay: parseInt(element.getAttribute('data-open-delay') ?? '500', 10),
      closeDelay: parseInt(element.getAttribute('data-close-delay') ?? '300', 10),
    };

    const instance = createHoverCard(element, options);
    element.setAttribute('data-atlas-hover-card-initialized', '');
    instances.push(instance);
  });

  return instances;
}
