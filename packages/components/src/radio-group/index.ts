/**
 * Radio Group Component
 *
 * A group of radio buttons with roving focus.
 *
 * Features:
 * - Roving tabindex for keyboard navigation
 * - Arrow key navigation
 * - Form integration
 * - Accessible ARIA
 *
 * @example
 * ```typescript
 * const radioGroup = createRadioGroup(container, {
 *   name: 'plan',
 *   value: 'free',
 *   onChange: (value) => console.log('Selected:', value),
 * });
 *
 * // Get current value
 * console.log(radioGroup.value);
 *
 * // Set value programmatically
 * radioGroup.setValue('pro');
 * ```
 */

import { addListener, isBrowser } from '../shared/dom';
import { createRovingFocus, type RovingFocus } from '../shared/keyboard';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export type RadioOrientation = 'horizontal' | 'vertical';

export interface RadioGroupOptions {
  /** Form input name */
  name?: string;
  /** Initial selected value */
  value?: string;
  /** Disabled state (default: false) */
  disabled?: boolean;
  /** Orientation for keyboard navigation (default: 'vertical') */
  orientation?: RadioOrientation;
  /** Called when value changes */
  onChange?: (value: string) => void;
}

export interface RadioGroupState {
  /** Current selected value */
  readonly value: string | null;
  /** Current disabled state */
  readonly isDisabled: boolean;
  /** Set selected value */
  setValue: (value: string) => void;
  /** Set disabled state for entire group */
  setDisabled: (disabled: boolean) => void;
  /** Set disabled state for specific option */
  setOptionDisabled: (value: string, disabled: boolean) => void;
  /** Focus the group */
  focus: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createRadioGroup(
  container: HTMLElement,
  options: RadioGroupOptions = {}
): RadioGroupState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopRadioGroupState();
  }

  const {
    name,
    value: initialValue,
    disabled: initialDisabled = false,
    orientation = 'vertical',
    onChange,
  } = options;

  let currentValue: string | null = initialValue ?? null;
  let isDisabled = initialDisabled;
  let rovingFocus: RovingFocus | null = null;
  const cleanupListeners: (() => void)[] = [];

  // Apply container attributes
  container.classList.add('atlas-radio-group');
  container.setAttribute('role', 'radiogroup');
  if (name) container.setAttribute('aria-label', name);

  // Get all radio items
  function getItems(): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>('[role="radio"], [data-atlas-radio]')
    );
  }

  // Update radio states
  function updateRadios(): void {
    const items = getItems();

    items.forEach((item) => {
      const itemValue = item.dataset.value || item.getAttribute('value') || '';
      const isSelected = itemValue === currentValue;
      const isItemDisabled = isDisabled || item.hasAttribute('data-disabled');

      item.setAttribute('aria-checked', String(isSelected));

      if (isSelected) {
        item.classList.add('atlas-radio-checked');
      } else {
        item.classList.remove('atlas-radio-checked');
      }

      if (isItemDisabled) {
        item.setAttribute('aria-disabled', 'true');
        item.classList.add('atlas-radio-disabled');
      } else {
        item.removeAttribute('aria-disabled');
        item.classList.remove('atlas-radio-disabled');
      }
    });
  }

  // Handle item selection
  function handleSelect(item: HTMLElement): void {
    if (isDisabled || item.hasAttribute('data-disabled')) return;

    const itemValue = item.dataset.value || item.getAttribute('value') || '';
    if (itemValue === currentValue) return;

    currentValue = itemValue;
    updateRadios();

    // Animate selection
    if (item.animate) {
      item.animate([{ transform: 'scale(0.95)' }, { transform: 'scale(1)' }], {
        duration: ANIMATION_DURATION.fast,
        easing: EASING.bounce,
      });
    }

    onChange?.(currentValue);
  }

  // Set up roving focus
  rovingFocus = createRovingFocus(container, {
    orientation,
    itemSelector: '[role="radio"], [data-atlas-radio]',
    onFocusChange: (element) => {
      // Auto-select on focus for better UX
      handleSelect(element);
    },
  });

  // Set up click handlers for each item
  const items = getItems();
  items.forEach((item) => {
    // Ensure proper role and class
    if (!item.hasAttribute('role')) {
      item.setAttribute('role', 'radio');
    }
    item.classList.add('atlas-radio');

    cleanupListeners.push(
      addListener(item, 'click', () => {
        handleSelect(item);
        item.focus();
      })
    );
  });

  // Initial state
  updateRadios();

  const setValue = (value: string): void => {
    if (currentValue === value) return;
    currentValue = value;
    updateRadios();
    onChange?.(currentValue);
  };

  const setDisabled = (disabled: boolean): void => {
    isDisabled = disabled;
    updateRadios();
  };

  const setOptionDisabled = (value: string, disabled: boolean): void => {
    const items = getItems();
    const item = items.find((i) => (i.dataset.value || i.getAttribute('value') || '') === value);
    if (item) {
      if (disabled) {
        item.setAttribute('data-disabled', '');
      } else {
        item.removeAttribute('data-disabled');
      }
      updateRadios();
    }
  };

  const focus = (): void => {
    const items = getItems();
    const selectedItem = items.find(
      (i) => (i.dataset.value || i.getAttribute('value') || '') === currentValue
    );
    (selectedItem || items[0])?.focus();
  };

  const destroy = (): void => {
    rovingFocus?.destroy();
    cleanupListeners.forEach((cleanup) => cleanup());

    container.classList.remove('atlas-radio-group');
    container.removeAttribute('role');
    container.removeAttribute('aria-label');

    const items = getItems();
    items.forEach((item) => {
      item.classList.remove('atlas-radio', 'atlas-radio-checked', 'atlas-radio-disabled');
      item.removeAttribute('aria-checked');
      item.removeAttribute('aria-disabled');
    });
  };

  return {
    get value() {
      return currentValue;
    },
    get isDisabled() {
      return isDisabled;
    },
    setValue,
    setDisabled,
    setOptionDisabled,
    focus,
    destroy,
  };
}

function createNoopRadioGroupState(): RadioGroupState {
  return {
    get value() {
      return null;
    },
    get isDisabled() {
      return false;
    },
    setValue: () => {},
    setDisabled: () => {},
    setOptionDisabled: () => {},
    focus: () => {},
    destroy: () => {},
  };
}
