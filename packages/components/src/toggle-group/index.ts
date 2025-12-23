/**
 * @fileoverview Toggle Group component - grouped toggle buttons with selection
 * @module @atlas/components/toggle-group
 */

import { generateId } from '../shared/aria';
import { addListener, isBrowser } from '../shared/dom';
import { createRovingFocus, handleActivation, type RovingFocus } from '../shared/keyboard';
import { ANIMATION_DURATION, EASING } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

export type ToggleGroupType = 'single' | 'multiple';
export type ToggleGroupVariant = 'default' | 'outline';
export type ToggleGroupSize = 'sm' | 'md' | 'lg';

export interface ToggleGroupOptions {
  /** Selection type: single or multiple */
  type?: ToggleGroupType;
  /** Initial selected value(s) - single string for single, array for multiple */
  value?: string | string[];
  /** Visual variant */
  variant?: ToggleGroupVariant;
  /** Size of toggle items */
  size?: ToggleGroupSize;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Orientation for keyboard navigation */
  orientation?: 'horizontal' | 'vertical';
  /** Whether navigation should loop */
  loop?: boolean;
  /** Require at least one item selected (single mode only) */
  required?: boolean;
  /** Callback when selection changes */
  onChange?: (value: string | string[]) => void;
}

export interface ToggleGroupItemOptions {
  /** Value of this toggle item */
  value: string;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export interface ToggleGroupState {
  /** Get current value(s) */
  getValue: () => string | string[];
  /** Set value(s) */
  setValue: (value: string | string[]) => void;
  /** Toggle a specific value */
  toggleValue: (value: string) => void;
  /** Check if a value is selected */
  isSelected: (value: string) => boolean;
  /** Set disabled state for the group */
  setDisabled: (disabled: boolean) => void;
  /** Check if group is disabled */
  isDisabled: () => boolean;
  /** Set disabled state for a specific item */
  setItemDisabled: (value: string, disabled: boolean) => void;
  /** Update items (call after DOM changes) */
  update: () => void;
  /** Focus the first non-disabled item */
  focus: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  ITEM: 'data-atlas-toggle-group-item',
  VALUE: 'data-value',
} as const;

const CLASSES = {
  ROOT: 'atlas-toggle-group',
  ROOT_OUTLINE: 'atlas-toggle-group--outline',
  ROOT_SM: 'atlas-toggle-group--sm',
  ROOT_MD: 'atlas-toggle-group--md',
  ROOT_LG: 'atlas-toggle-group--lg',
  ROOT_VERTICAL: 'atlas-toggle-group--vertical',
  ROOT_DISABLED: 'atlas-toggle-group--disabled',
  ITEM: 'atlas-toggle-group-item',
  ITEM_PRESSED: 'atlas-toggle-group-item--pressed',
  ITEM_DISABLED: 'atlas-toggle-group-item--disabled',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a toggle group component with single or multiple selection
 *
 * @example
 * ```ts
 * // Single selection
 * const toggleGroup = createToggleGroup(container, {
 *   type: 'single',
 *   value: 'left',
 *   onChange: (value) => console.log('Selected:', value)
 * });
 *
 * // Multiple selection
 * const toggleGroup = createToggleGroup(container, {
 *   type: 'multiple',
 *   value: ['bold', 'italic'],
 *   onChange: (values) => console.log('Selected:', values)
 * });
 * ```
 */
export function createToggleGroup(
  element: HTMLElement,
  options: ToggleGroupOptions = {}
): ToggleGroupState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    type = 'single',
    value: initialValue = type === 'multiple' ? [] : '',
    variant = 'default',
    size = 'md',
    disabled: initialDisabled = false,
    orientation = 'horizontal',
    loop = true,
    required = false,
  } = options;

  // State
  let currentValue: string | string[] =
    type === 'multiple'
      ? Array.isArray(initialValue)
        ? [...initialValue]
        : initialValue
          ? [initialValue]
          : []
      : Array.isArray(initialValue)
        ? initialValue[0] || ''
        : initialValue;
  let isDisabledState = initialDisabled;

  // Elements
  const id = generateId('toggle-group');
  const cleanups: (() => void)[] = [];

  // Keyboard navigation
  let rovingFocus: RovingFocus | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-toggle-group', '');
    element.setAttribute('role', 'group');
    element.id = id;

    // Apply variant
    if (variant === 'outline') {
      element.classList.add(CLASSES.ROOT_OUTLINE);
    }

    // Apply size
    element.classList.add(
      size === 'sm' ? CLASSES.ROOT_SM : size === 'lg' ? CLASSES.ROOT_LG : CLASSES.ROOT_MD
    );

    // Apply orientation
    if (orientation === 'vertical') {
      element.classList.add(CLASSES.ROOT_VERTICAL);
    }

    // Apply disabled
    if (isDisabledState) {
      element.classList.add(CLASSES.ROOT_DISABLED);
    }

    // Setup items
    setupItems();

    // Setup keyboard navigation
    rovingFocus = createRovingFocus(element, {
      orientation,
      loop,
      itemSelector: `[${ATTRS.ITEM}]:not([aria-disabled="true"])`,
      onFocusChange: (el) => el.focus(),
    });

    // Initial state
    updateAllItems();
  }

  function setupItems(): void {
    const items = getItems();

    items.forEach((item) => {
      item.classList.add(CLASSES.ITEM);
      item.setAttribute('role', 'radio');
      item.setAttribute('tabindex', '-1');

      // Apply transition
      item.style.transition = `
        background-color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
        color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
        border-color ${ANIMATION_DURATION.fast}ms ${EASING.standard}
      `
        .replace(/\s+/g, ' ')
        .trim();

      // Event listeners
      const clickCleanup = addListener(item, 'click', () => handleItemClick(item));
      const keyCleanup = handleActivation(item, () => handleItemClick(item));
      cleanups.push(clickCleanup, keyCleanup);
    });

    // Set first non-disabled item as focusable
    const firstEnabled = items.find(
      (item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true'
    );
    if (firstEnabled) {
      firstEnabled.setAttribute('tabindex', '0');
    }
  }

  function getItems(): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>(`[${ATTRS.ITEM}]`));
  }

  function getItemValue(item: HTMLElement): string {
    return item.getAttribute(ATTRS.VALUE) || '';
  }

  function handleItemClick(item: HTMLElement): void {
    if (isDisabledState) return;
    if (item.hasAttribute('disabled') || item.getAttribute('aria-disabled') === 'true') return;

    const value = getItemValue(item);
    if (!value) return;

    toggleValue(value);

    // Animate
    if (item.animate) {
      item.animate([{ transform: 'scale(0.97)' }, { transform: 'scale(1)' }], {
        duration: ANIMATION_DURATION.fast,
        easing: EASING.bounce,
      });
    }
  }

  function toggleValue(value: string): void {
    if (type === 'multiple') {
      const values = currentValue as string[];
      const index = values.indexOf(value);

      if (index >= 0) {
        values.splice(index, 1);
      } else {
        values.push(value);
      }

      currentValue = [...values];
    } else {
      // Single mode
      if (currentValue === value) {
        // Deselect if not required
        if (!required) {
          currentValue = '';
        }
      } else {
        currentValue = value;
      }
    }

    updateAllItems();
    options.onChange?.(currentValue);
  }

  function isSelected(value: string): boolean {
    if (type === 'multiple') {
      return (currentValue as string[]).includes(value);
    }
    return currentValue === value;
  }

  function updateAllItems(): void {
    const items = getItems();

    items.forEach((item) => {
      const value = getItemValue(item);
      const selected = isSelected(value);
      const disabled =
        item.hasAttribute('disabled') || item.getAttribute('aria-disabled') === 'true';

      item.setAttribute('aria-pressed', String(selected));
      item.setAttribute('data-state', selected ? 'on' : 'off');

      if (selected) {
        item.classList.add(CLASSES.ITEM_PRESSED);
      } else {
        item.classList.remove(CLASSES.ITEM_PRESSED);
      }

      if (disabled || isDisabledState) {
        item.classList.add(CLASSES.ITEM_DISABLED);
        item.setAttribute('aria-disabled', 'true');
      } else {
        item.classList.remove(CLASSES.ITEM_DISABLED);
        item.removeAttribute('aria-disabled');
      }
    });

    // Update tabindex for roving focus
    rovingFocus?.update();
  }

  function setValue(value: string | string[]): void {
    if (type === 'multiple') {
      currentValue = Array.isArray(value) ? [...value] : value ? [value] : [];
    } else {
      currentValue = Array.isArray(value) ? value[0] || '' : value;
    }

    updateAllItems();
    options.onChange?.(currentValue);
  }

  function setDisabled(disabled: boolean): void {
    isDisabledState = disabled;

    if (disabled) {
      element.classList.add(CLASSES.ROOT_DISABLED);
    } else {
      element.classList.remove(CLASSES.ROOT_DISABLED);
    }

    updateAllItems();
  }

  function setItemDisabled(value: string, disabled: boolean): void {
    const items = getItems();
    const item = items.find((i) => getItemValue(i) === value);

    if (item) {
      if (disabled) {
        item.setAttribute('disabled', '');
        item.setAttribute('aria-disabled', 'true');
      } else {
        item.removeAttribute('disabled');
        item.removeAttribute('aria-disabled');
      }

      updateAllItems();
    }
  }

  function update(): void {
    // Re-setup items after DOM changes
    setupItems();
    updateAllItems();
    rovingFocus?.update();
  }

  function focus(): void {
    const items = getItems();
    const firstEnabled = items.find(
      (item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true'
    );
    firstEnabled?.focus();
  }

  function destroy(): void {
    rovingFocus?.destroy();
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(
      CLASSES.ROOT,
      CLASSES.ROOT_OUTLINE,
      CLASSES.ROOT_SM,
      CLASSES.ROOT_MD,
      CLASSES.ROOT_LG,
      CLASSES.ROOT_VERTICAL,
      CLASSES.ROOT_DISABLED
    );
    element.removeAttribute('data-atlas-toggle-group');
    element.removeAttribute('data-atlas-toggle-group-initialized');
    element.removeAttribute('role');

    // Cleanup items
    const items = getItems();
    items.forEach((item) => {
      item.classList.remove(CLASSES.ITEM, CLASSES.ITEM_PRESSED, CLASSES.ITEM_DISABLED);
      item.removeAttribute('role');
      item.removeAttribute('tabindex');
      item.removeAttribute('aria-pressed');
      item.removeAttribute('data-state');
    });
  }

  // Initialize
  init();

  return {
    getValue: () => (type === 'multiple' ? [...(currentValue as string[])] : currentValue),
    setValue,
    toggleValue,
    isSelected,
    setDisabled,
    isDisabled: () => isDisabledState,
    setItemDisabled,
    update,
    focus,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): ToggleGroupState {
  return {
    getValue: () => [],
    setValue: () => {},
    toggleValue: () => {},
    isSelected: () => false,
    setDisabled: () => {},
    isDisabled: () => false,
    setItemDisabled: () => {},
    update: () => {},
    focus: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initToggleGroups(root: Document | HTMLElement = document): ToggleGroupState[] {
  if (!isBrowser()) return [];

  const toggleGroups: ToggleGroupState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-toggle-group]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-toggle-group-initialized')) return;

    const typeAttr = element.getAttribute('data-type') as ToggleGroupType;
    const type = typeAttr === 'multiple' ? 'multiple' : 'single';

    const options: ToggleGroupOptions = {
      type,
      variant: (element.getAttribute('data-variant') as ToggleGroupVariant) ?? 'default',
      size: (element.getAttribute('data-size') as ToggleGroupSize) ?? 'md',
      disabled: element.hasAttribute('data-disabled'),
      orientation:
        (element.getAttribute('data-orientation') as 'horizontal' | 'vertical') ?? 'horizontal',
      loop: element.getAttribute('data-loop') !== 'false',
      required: element.hasAttribute('data-required'),
    };

    // Parse initial value
    const valueAttr = element.getAttribute('data-value');
    if (valueAttr) {
      if (type === 'multiple') {
        options.value = valueAttr.split(',').map((v) => v.trim());
      } else {
        options.value = valueAttr;
      }
    }

    const toggleGroup = createToggleGroup(element, options);
    element.setAttribute('data-atlas-toggle-group-initialized', '');
    toggleGroups.push(toggleGroup);
  });

  return toggleGroups;
}
