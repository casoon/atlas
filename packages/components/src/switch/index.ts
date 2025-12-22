/**
 * Switch Component
 *
 * Toggle switch with smooth thumb animation.
 *
 * Features:
 * - Smooth sliding animation
 * - Keyboard accessible (Space to toggle)
 * - Form integration
 * - Loading state
 *
 * @example
 * ```typescript
 * const toggle = createSwitch(element, {
 *   checked: false,
 *   onChange: (checked) => console.log('Toggled:', checked),
 * });
 *
 * // Toggle programmatically
 * toggle.toggle();
 *
 * // Show loading while processing
 * toggle.setLoading(true);
 * await saveSettings();
 * toggle.setLoading(false);
 * ```
 */

import { addListener, isBrowser } from '../shared/dom';
import { handleActivation } from '../shared/keyboard';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchOptions {
  /** Initial checked state (default: false) */
  checked?: boolean;
  /** Disabled state (default: false) */
  disabled?: boolean;
  /** Size (default: 'md') */
  size?: SwitchSize;
  /** Form input name */
  name?: string;
  /** Form input value */
  value?: string;
  /** Called when checked state changes */
  onChange?: (checked: boolean) => void;
}

export interface SwitchState {
  /** Current checked state */
  readonly isChecked: boolean;
  /** Current disabled state */
  readonly isDisabled: boolean;
  /** Current loading state */
  readonly isLoading: boolean;
  /** Set checked state */
  setChecked: (checked: boolean) => void;
  /** Toggle checked state */
  toggle: () => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Focus the switch */
  focus: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createSwitch(element: HTMLElement, options: SwitchOptions = {}): SwitchState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopSwitchState();
  }

  const {
    checked: initialChecked = false,
    disabled: initialDisabled = false,
    size = 'md',
    name,
    value,
    onChange,
  } = options;

  let isChecked = initialChecked;
  let isDisabled = initialDisabled;
  let isLoading = false;
  let thumbElement: HTMLElement | null = null;
  const cleanupListeners: (() => void)[] = [];

  // Apply base classes and structure
  element.classList.add('atlas-switch', `atlas-switch-${size}`);
  element.setAttribute('role', 'switch');
  element.setAttribute('tabindex', isDisabled ? '-1' : '0');

  if (name) element.setAttribute('data-name', name);
  if (value) element.setAttribute('data-value', value);

  // Create thumb element if not present
  thumbElement = element.querySelector('.atlas-switch-thumb');
  if (!thumbElement) {
    thumbElement = document.createElement('span');
    thumbElement.className = 'atlas-switch-thumb';
    thumbElement.setAttribute('aria-hidden', 'true');
    element.appendChild(thumbElement);
  }

  // Apply transition styles
  element.style.transition = `background-color ${ANIMATION_DURATION.fast}ms ${EASING.standard}`;
  thumbElement.style.transition = `transform ${ANIMATION_DURATION.fast}ms ${EASING.spring}`;

  function updateState(): void {
    element.setAttribute('aria-checked', String(isChecked));

    if (isChecked) {
      element.classList.add('atlas-switch-checked');
    } else {
      element.classList.remove('atlas-switch-checked');
    }

    if (isDisabled) {
      element.setAttribute('aria-disabled', 'true');
      element.setAttribute('tabindex', '-1');
      element.classList.add('atlas-switch-disabled');
    } else {
      element.removeAttribute('aria-disabled');
      element.setAttribute('tabindex', '0');
      element.classList.remove('atlas-switch-disabled');
    }

    if (isLoading) {
      element.classList.add('atlas-switch-loading');
      element.setAttribute('aria-busy', 'true');
    } else {
      element.classList.remove('atlas-switch-loading');
      element.removeAttribute('aria-busy');
    }
  }

  function handleToggle(): void {
    if (isDisabled || isLoading) return;

    isChecked = !isChecked;
    updateState();
    onChange?.(isChecked);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  // Set up event listeners
  cleanupListeners.push(
    addListener(element, 'click', handleToggle),
    handleActivation(element, handleToggle, [' ']) // Only space, not Enter
  );

  // Initial state
  updateState();

  const setChecked = (checked: boolean): void => {
    if (isChecked === checked) return;
    isChecked = checked;
    updateState();
    onChange?.(isChecked);
  };

  const toggle = (): void => {
    handleToggle();
  };

  const setDisabled = (disabled: boolean): void => {
    isDisabled = disabled;
    updateState();
  };

  const setLoading = (loading: boolean): void => {
    isLoading = loading;
    updateState();
  };

  const focus = (): void => {
    element.focus();
  };

  const destroy = (): void => {
    cleanupListeners.forEach((cleanup) => cleanup());
    element.classList.remove(
      'atlas-switch',
      `atlas-switch-${size}`,
      'atlas-switch-checked',
      'atlas-switch-disabled',
      'atlas-switch-loading'
    );
    element.removeAttribute('role');
    element.removeAttribute('tabindex');
    element.removeAttribute('aria-checked');
    element.removeAttribute('aria-disabled');
    element.removeAttribute('aria-busy');

    // Remove thumb if we created it
    if (thumbElement && thumbElement.parentElement === element) {
      thumbElement.remove();
    }
  };

  return {
    get isChecked() {
      return isChecked;
    },
    get isDisabled() {
      return isDisabled;
    },
    get isLoading() {
      return isLoading;
    },
    setChecked,
    toggle,
    setDisabled,
    setLoading,
    focus,
    destroy,
  };
}

function createNoopSwitchState(): SwitchState {
  return {
    get isChecked() {
      return false;
    },
    get isDisabled() {
      return false;
    },
    get isLoading() {
      return false;
    },
    setChecked: () => {},
    toggle: () => {},
    setDisabled: () => {},
    setLoading: () => {},
    focus: () => {},
    destroy: () => {},
  };
}
