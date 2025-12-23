/**
 * Checkbox Component
 *
 * Accessible checkbox with indeterminate state and animations.
 *
 * Features:
 * - Indeterminate state support
 * - Animated checkmark
 * - Keyboard accessible
 * - Form integration
 *
 * @example
 * ```typescript
 * const checkbox = createCheckbox(element, {
 *   checked: false,
 *   onChange: (checked) => console.log('Checked:', checked),
 * });
 *
 * // Toggle programmatically
 * checkbox.toggle();
 *
 * // Set indeterminate
 * checkbox.setIndeterminate(true);
 * ```
 */

import { addListener, isBrowser } from '../shared/dom';
import { handleActivation } from '../shared/keyboard';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export interface CheckboxOptions {
  /** Initial checked state (default: false) */
  checked?: boolean;
  /** Initial indeterminate state (default: false) */
  indeterminate?: boolean;
  /** Disabled state (default: false) */
  disabled?: boolean;
  /** Form input name */
  name?: string;
  /** Form input value */
  value?: string;
  /** Called when checked state changes */
  onChange?: (checked: boolean) => void;
}

export interface CheckboxState {
  /** Current checked state */
  readonly isChecked: boolean;
  /** Current indeterminate state */
  readonly isIndeterminate: boolean;
  /** Current disabled state */
  readonly isDisabled: boolean;
  /** Set checked state */
  setChecked: (checked: boolean) => void;
  /** Toggle checked state */
  toggle: () => void;
  /** Set indeterminate state */
  setIndeterminate: (indeterminate: boolean) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Focus the checkbox */
  focus: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createCheckbox(element: HTMLElement, options: CheckboxOptions = {}): CheckboxState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopCheckboxState();
  }

  const {
    checked: initialChecked = false,
    indeterminate: initialIndeterminate = false,
    disabled: initialDisabled = false,
    name,
    value,
    onChange,
  } = options;

  let isChecked = initialChecked;
  let isIndeterminate = initialIndeterminate;
  let isDisabled = initialDisabled;
  const cleanupListeners: (() => void)[] = [];

  // Apply base classes and attributes
  element.classList.add('atlas-checkbox');
  element.setAttribute('role', 'checkbox');
  element.setAttribute('tabindex', isDisabled ? '-1' : '0');

  if (name) element.setAttribute('data-name', name);
  if (value) element.setAttribute('data-value', value);

  // Update ARIA and visual state
  function updateState(): void {
    if (isIndeterminate) {
      element.setAttribute('aria-checked', 'mixed');
      element.classList.add('atlas-checkbox-indeterminate');
      element.classList.remove('atlas-checkbox-checked');
    } else if (isChecked) {
      element.setAttribute('aria-checked', 'true');
      element.classList.add('atlas-checkbox-checked');
      element.classList.remove('atlas-checkbox-indeterminate');
    } else {
      element.setAttribute('aria-checked', 'false');
      element.classList.remove('atlas-checkbox-checked', 'atlas-checkbox-indeterminate');
    }

    if (isDisabled) {
      element.setAttribute('aria-disabled', 'true');
      element.setAttribute('tabindex', '-1');
      element.classList.add('atlas-checkbox-disabled');
    } else {
      element.removeAttribute('aria-disabled');
      element.setAttribute('tabindex', '0');
      element.classList.remove('atlas-checkbox-disabled');
    }
  }

  // Animate state change
  function animateChange(): void {
    if (!element.animate) return;

    element.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(0.9)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: ANIMATION_DURATION.fast,
        easing: EASING.bounce,
      }
    );
  }

  // Handle click/activation
  function handleToggle(): void {
    if (isDisabled) return;

    // Clear indeterminate on user action
    if (isIndeterminate) {
      isIndeterminate = false;
      isChecked = true;
    } else {
      isChecked = !isChecked;
    }

    updateState();
    animateChange();
    onChange?.(isChecked);
  }

  // Set up event listeners
  cleanupListeners.push(
    addListener(element, 'click', handleToggle),
    handleActivation(element, handleToggle)
  );

  // Initial state
  updateState();

  const setChecked = (checked: boolean): void => {
    if (isChecked === checked) return;
    isChecked = checked;
    isIndeterminate = false;
    updateState();
    animateChange();
    onChange?.(isChecked);
  };

  const toggle = (): void => {
    handleToggle();
  };

  const setIndeterminate = (indeterminate: boolean): void => {
    isIndeterminate = indeterminate;
    updateState();
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
      'atlas-checkbox',
      'atlas-checkbox-checked',
      'atlas-checkbox-indeterminate',
      'atlas-checkbox-disabled'
    );
    element.removeAttribute('role');
    element.removeAttribute('tabindex');
    element.removeAttribute('aria-checked');
    element.removeAttribute('aria-disabled');
  };

  return {
    get isChecked() {
      return isChecked;
    },
    get isIndeterminate() {
      return isIndeterminate;
    },
    get isDisabled() {
      return isDisabled;
    },
    setChecked,
    toggle,
    setIndeterminate,
    setDisabled,
    focus,
    destroy,
  };
}

function createNoopCheckboxState(): CheckboxState {
  return {
    get isChecked() {
      return false;
    },
    get isIndeterminate() {
      return false;
    },
    get isDisabled() {
      return false;
    },
    setChecked: () => {},
    toggle: () => {},
    setIndeterminate: () => {},
    setDisabled: () => {},
    focus: () => {},
    destroy: () => {},
  };
}
