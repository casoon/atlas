/**
 * Toggle Component
 *
 * A button that can be toggled on/off.
 * Similar to a button but with pressed state.
 *
 * Features:
 * - Pressed/unpressed states
 * - Multiple variants
 * - Icon support
 * - Keyboard accessible
 *
 * @example
 * ```typescript
 * const toggle = createToggle(element, {
 *   pressed: false,
 *   variant: 'default',
 *   onChange: (pressed) => console.log('Pressed:', pressed),
 * });
 *
 * // Toggle programmatically
 * toggle.toggle();
 * ```
 */

import { addListener, isBrowser } from '../shared/dom';
import { handleActivation } from '../shared/keyboard';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export type ToggleVariant = 'default' | 'outline';
export type ToggleSize = 'sm' | 'md' | 'lg';

export interface ToggleOptions {
  /** Initial pressed state (default: false) */
  pressed?: boolean;
  /** Disabled state (default: false) */
  disabled?: boolean;
  /** Variant (default: 'default') */
  variant?: ToggleVariant;
  /** Size (default: 'md') */
  size?: ToggleSize;
  /** Called when pressed state changes */
  onChange?: (pressed: boolean) => void;
}

export interface ToggleState {
  /** Current pressed state */
  readonly isPressed: boolean;
  /** Current disabled state */
  readonly isDisabled: boolean;
  /** Set pressed state */
  setPressed: (pressed: boolean) => void;
  /** Toggle pressed state */
  toggle: () => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Focus the toggle */
  focus: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createToggle(element: HTMLElement, options: ToggleOptions = {}): ToggleState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopToggleState();
  }

  const {
    pressed: initialPressed = false,
    disabled: initialDisabled = false,
    variant = 'default',
    size = 'md',
    onChange,
  } = options;

  let isPressed = initialPressed;
  let isDisabled = initialDisabled;
  const cleanupListeners: (() => void)[] = [];

  // Apply base classes
  element.classList.add('atlas-toggle', `atlas-toggle-${variant}`, `atlas-toggle-${size}`);
  element.setAttribute('role', 'button');
  element.setAttribute('tabindex', isDisabled ? '-1' : '0');

  // Apply transition
  element.style.transition = `
    background-color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
    border-color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
    color ${ANIMATION_DURATION.fast}ms ${EASING.standard}
  `
    .replace(/\s+/g, ' ')
    .trim();

  function updateState(): void {
    element.setAttribute('aria-pressed', String(isPressed));

    if (isPressed) {
      element.classList.add('atlas-toggle-pressed');
      element.dataset.state = 'on';
    } else {
      element.classList.remove('atlas-toggle-pressed');
      element.dataset.state = 'off';
    }

    if (isDisabled) {
      element.setAttribute('aria-disabled', 'true');
      element.setAttribute('tabindex', '-1');
      element.classList.add('atlas-toggle-disabled');
    } else {
      element.removeAttribute('aria-disabled');
      element.setAttribute('tabindex', '0');
      element.classList.remove('atlas-toggle-disabled');
    }
  }

  function handleToggle(): void {
    if (isDisabled) return;

    isPressed = !isPressed;
    updateState();

    // Subtle scale animation
    if (element.animate) {
      element.animate([{ transform: 'scale(0.97)' }, { transform: 'scale(1)' }], {
        duration: ANIMATION_DURATION.fast,
        easing: EASING.bounce,
      });
    }

    onChange?.(isPressed);
  }

  // Set up event listeners
  cleanupListeners.push(
    addListener(element, 'click', handleToggle),
    handleActivation(element, handleToggle)
  );

  // Initial state
  updateState();

  const setPressed = (pressed: boolean): void => {
    if (isPressed === pressed) return;
    isPressed = pressed;
    updateState();
    onChange?.(isPressed);
  };

  const toggle = (): void => {
    handleToggle();
  };

  const setDisabled = (disabled: boolean): void => {
    isDisabled = disabled;
    updateState();
  };

  const focus = (): void => {
    element.focus();
  };

  const destroy = (): void => {
    cleanupListeners.forEach((cleanup) => cleanup());
    element.classList.remove(
      'atlas-toggle',
      `atlas-toggle-${variant}`,
      `atlas-toggle-${size}`,
      'atlas-toggle-pressed',
      'atlas-toggle-disabled'
    );
    element.removeAttribute('role');
    element.removeAttribute('tabindex');
    element.removeAttribute('aria-pressed');
    element.removeAttribute('aria-disabled');
    delete element.dataset.state;
  };

  return {
    get isPressed() {
      return isPressed;
    },
    get isDisabled() {
      return isDisabled;
    },
    setPressed,
    toggle,
    setDisabled,
    focus,
    destroy,
  };
}

function createNoopToggleState(): ToggleState {
  return {
    get isPressed() {
      return false;
    },
    get isDisabled() {
      return false;
    },
    setPressed: () => {},
    toggle: () => {},
    setDisabled: () => {},
    focus: () => {},
    destroy: () => {},
  };
}
