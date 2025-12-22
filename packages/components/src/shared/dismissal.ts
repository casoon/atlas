/**
 * Dismissal Utilities
 *
 * Handles closing overlays via:
 * - Escape key press
 * - Click outside
 * - Focus outside
 *
 * Supports stacked overlays (only top layer responds to ESC).
 *
 * @module
 */

import { addListener, isBrowser } from './dom';

/** Options for dismissal behavior */
export interface DismissalOptions {
  /** Callback when dismissal is triggered */
  onDismiss: () => void;
  /** Close on Escape key (default: true) */
  escapeKey?: boolean;
  /** Close on click outside (default: true) */
  clickOutside?: boolean;
  /** Elements to ignore for click outside detection */
  ignore?: (HTMLElement | null)[];
  /** Use pointerdown instead of click (default: false) */
  pointerDownOutside?: boolean;
}

/** Dismissal handler controller */
export interface DismissalHandler {
  /** Clean up event listeners */
  destroy: () => void;
  /** Temporarily pause dismissal handling */
  pause: () => void;
  /** Resume dismissal handling */
  resume: () => void;
}

/**
 * Creates a dismissal handler for overlay components
 *
 * @example
 * ```typescript
 * const dismissal = createDismissHandler(popover, {
 *   onDismiss: () => closePopover(),
 *   ignore: [triggerButton],
 * });
 *
 * // Later cleanup
 * dismissal.destroy();
 * ```
 */
export function createDismissHandler(
  container: HTMLElement,
  options: DismissalOptions
): DismissalHandler {
  // SSR guard
  if (!isBrowser()) {
    return {
      destroy: () => {},
      pause: () => {},
      resume: () => {},
    };
  }

  const {
    onDismiss,
    escapeKey = true,
    clickOutside = true,
    ignore = [],
    pointerDownOutside = false,
  } = options;

  let paused = false;
  const cleanups: (() => void)[] = [];

  function handleKeyDown(event: KeyboardEvent): void {
    if (paused) return;

    if (escapeKey && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    }
  }

  function isOutside(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Node)) return false;

    // Check if inside container
    if (container.contains(target as Node)) {
      return false;
    }

    // Check ignore list
    for (const ignored of ignore) {
      if (ignored?.contains(target as Node)) {
        return false;
      }
    }

    return true;
  }

  function handlePointerDown(event: PointerEvent): void {
    if (paused) return;
    if (!clickOutside) return;

    if (isOutside(event.target)) {
      onDismiss();
    }
  }

  function handleClick(event: MouseEvent): void {
    if (paused) return;
    if (!clickOutside) return;
    if (pointerDownOutside) return; // Already handled by pointerdown

    if (isOutside(event.target)) {
      onDismiss();
    }
  }

  // Add keydown listener (capture phase for priority)
  cleanups.push(
    addListener(document, 'keydown', handleKeyDown as (ev: DocumentEventMap['keydown']) => void, {
      capture: true,
    })
  );

  if (pointerDownOutside) {
    cleanups.push(
      addListener(
        document,
        'pointerdown',
        handlePointerDown as (ev: DocumentEventMap['pointerdown']) => void,
        { capture: true }
      )
    );
  } else {
    // Delay click handler to ignore the opening click
    setTimeout(() => {
      if (!paused) {
        cleanups.push(
          addListener(document, 'click', handleClick as (ev: DocumentEventMap['click']) => void, {
            capture: true,
          })
        );
      }
    }, 0);
  }

  return {
    destroy: () => {
      cleanups.forEach((cleanup) => cleanup());
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
  };
}

/**
 * Layer stack for managing nested overlays
 *
 * Ensures only the topmost overlay responds to ESC key.
 * Use this for complex overlay scenarios with potential nesting.
 */
class LayerStack {
  private layers: Map<HTMLElement, () => void> = new Map();

  /** Push a new layer onto the stack */
  push(element: HTMLElement, onDismiss: () => void): void {
    this.layers.set(element, onDismiss);
  }

  /** Remove a layer from the stack */
  remove(element: HTMLElement): void {
    this.layers.delete(element);
  }

  /** Check if element is the topmost layer */
  isTop(element: HTMLElement): boolean {
    const entries = Array.from(this.layers.keys());
    return entries[entries.length - 1] === element;
  }

  /** Dismiss the topmost layer */
  dismissTop(): boolean {
    const entries = Array.from(this.layers.entries());
    if (entries.length === 0) return false;

    const [, onDismiss] = entries[entries.length - 1];
    onDismiss();
    return true;
  }

  /** Get the number of active layers */
  get size(): number {
    return this.layers.size;
  }
}

/** Global layer stack instance */
export const layerStack = new LayerStack();

let globalEscapeHandlerInstalled = false;

/**
 * Installs a global ESC handler for the layer stack
 *
 * Call this once at app initialization if using layerStack.
 */
export function installGlobalEscapeHandler(): void {
  if (!isBrowser()) return;
  if (globalEscapeHandlerInstalled) return;

  globalEscapeHandlerInstalled = true;

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && layerStack.size > 0) {
        event.preventDefault();
        event.stopPropagation();
        layerStack.dismissTop();
      }
    },
    true
  );
}

/**
 * Click-outside handler with optional delay
 *
 * The delay is useful for dropdowns opened by click,
 * to avoid immediately closing on the opening click.
 *
 * @example
 * ```typescript
 * const cleanup = onClickOutside(dropdown, (event) => {
 *   closeDropdown();
 * }, { ignore: [triggerButton], delay: 10 });
 *
 * // Later cleanup
 * cleanup();
 * ```
 */
export function onClickOutside(
  element: HTMLElement,
  callback: (event: MouseEvent) => void,
  options: { ignore?: HTMLElement[]; delay?: number } = {}
): () => void {
  // SSR guard
  if (!isBrowser()) {
    return () => {};
  }

  const { ignore = [], delay = 0 } = options;

  let enabled = false;
  let cleanup: (() => void) | null = null;

  function handler(event: MouseEvent): void {
    if (!enabled) return;

    const target = event.target as Node;

    if (element.contains(target)) return;

    for (const ignored of ignore) {
      if (ignored.contains(target)) return;
    }

    callback(event);
  }

  // Delay to ignore initial click
  setTimeout(() => {
    enabled = true;
    cleanup = addListener(document, 'click', handler as (ev: DocumentEventMap['click']) => void, {
      capture: true,
    });
  }, delay);

  return () => {
    cleanup?.();
  };
}

/**
 * Focus-outside handler
 *
 * Triggers callback when focus moves outside the element.
 *
 * @example
 * ```typescript
 * const cleanup = onFocusOutside(dropdown, (event) => {
 *   closeDropdown();
 * });
 *
 * // Later cleanup
 * cleanup();
 * ```
 */
export function onFocusOutside(
  element: HTMLElement,
  callback: (event: FocusEvent) => void
): () => void {
  // SSR guard
  if (!isBrowser()) {
    return () => {};
  }

  function handler(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget as Node | null;

    // If new focus target is outside
    if (relatedTarget && !element.contains(relatedTarget)) {
      callback(event);
    }
  }

  element.addEventListener('focusout', handler);

  return () => {
    element.removeEventListener('focusout', handler);
  };
}
