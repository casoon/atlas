/**
 * @fileoverview Select component - customizable dropdown select
 * @module @atlas/components/select
 */

import { generateId } from '../shared/aria.js';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal.js';
import { isBrowser } from '../shared/dom.js';
import { autoUpdate, computeFloatingPosition } from '../shared/floating.js';
import {
  createRovingFocus,
  createTypeahead,
  type RovingFocus,
  type Typeahead,
} from '../shared/keyboard.js';

// ============================================================================
// Types
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectOptions {
  /** Initial selected value */
  value?: string;
  /** Placeholder text when nothing selected */
  placeholder?: string;
  /** Whether select is disabled */
  disabled?: boolean;
  /** Whether select is required */
  required?: boolean;
  /** Available options */
  options?: SelectOption[];
  /** Name for form submission */
  name?: string;
  /** Position of dropdown */
  position?: 'bottom' | 'top' | 'auto';
  /** Callback when value changes */
  onChange?: (value: string, option: SelectOption | undefined) => void;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export interface SelectState {
  /** Get current value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Get selected option */
  getSelectedOption: () => SelectOption | undefined;
  /** Check if open */
  isOpen: () => boolean;
  /** Open dropdown */
  open: () => void;
  /** Close dropdown */
  close: () => void;
  /** Toggle open state */
  toggle: () => void;
  /** Update options */
  setOptions: (options: SelectOption[]) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Check if disabled */
  isDisabled: () => boolean;
  /** Focus the trigger */
  focus: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  TRIGGER: 'data-atlas-select-trigger',
  CONTENT: 'data-atlas-select-content',
  ITEM: 'data-atlas-select-item',
  VALUE: 'data-atlas-select-value',
  LABEL: 'data-atlas-select-label',
  GROUP: 'data-atlas-select-group',
  GROUP_LABEL: 'data-atlas-select-group-label',
} as const;

const CLASSES = {
  ROOT: 'atlas-select',
  TRIGGER: 'atlas-select-trigger',
  CONTENT: 'atlas-select-content',
  ITEM: 'atlas-select-item',
  ITEM_SELECTED: 'atlas-select-item--selected',
  ITEM_HIGHLIGHTED: 'atlas-select-item--highlighted',
  ITEM_DISABLED: 'atlas-select-item--disabled',
  VALUE: 'atlas-select-value',
  PLACEHOLDER: 'atlas-select-placeholder',
  ICON: 'atlas-select-icon',
  OPEN: 'atlas-select--open',
  DISABLED: 'atlas-select--disabled',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates an accessible select dropdown component
 *
 * @example
 * ```ts
 * const select = createSelect(element, {
 *   placeholder: 'Choose an option',
 *   options: [
 *     { value: 'apple', label: 'Apple' },
 *     { value: 'banana', label: 'Banana' },
 *     { value: 'cherry', label: 'Cherry' },
 *   ],
 *   onChange: (value) => console.log('Selected:', value)
 * });
 * ```
 */
export function createSelect(element: HTMLElement, options: SelectOptions = {}): SelectState {
  if (!isBrowser()) {
    return createNoopState();
  }

  // State
  let currentValue = options.value ?? '';
  let currentOptions = options.options ?? [];
  let isOpenState = false;
  let isDisabledState = options.disabled ?? false;
  let _highlightedIndex = -1;

  // Elements
  const id = generateId('select');
  let trigger: HTMLElement | null = null;
  let content: HTMLElement | null = null;
  let valueDisplay: HTMLElement | null = null;
  let hiddenInput: HTMLInputElement | null = null;

  // Handlers
  let dismissHandler: DismissalHandler | null = null;
  let rovingFocus: RovingFocus | null = null;
  let typeahead: Typeahead | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-select', '');

    // Find or create trigger
    trigger = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (!trigger) {
      trigger = createTrigger();
      element.appendChild(trigger);
    }
    setupTrigger();

    // Find or create content
    content = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (!content) {
      content = createContent();
      element.appendChild(content);
    }
    setupContent();

    // Create hidden input for form submission
    if (options.name) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = options.name;
      hiddenInput.value = currentValue;
      element.appendChild(hiddenInput);
    }

    // Render options
    renderOptions();

    // Apply initial state
    updateValueDisplay();
    updateDisabledState();
  }

  function createTrigger(): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = CLASSES.TRIGGER;
    btn.setAttribute(ATTRS.TRIGGER, '');
    btn.innerHTML = `
      <span class="${CLASSES.VALUE}" ${ATTRS.VALUE}></span>
      <span class="${CLASSES.ICON}" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    `;
    return btn;
  }

  function createContent(): HTMLElement {
    const div = document.createElement('div');
    div.className = CLASSES.CONTENT;
    div.setAttribute(ATTRS.CONTENT, '');
    div.setAttribute('role', 'listbox');
    div.style.display = 'none';
    return div;
  }

  function setupTrigger(): void {
    if (!trigger) return;

    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `${id}-content`);
    trigger.id = `${id}-trigger`;

    valueDisplay = trigger.querySelector(`[${ATTRS.VALUE}]`);

    // Event listeners
    trigger.addEventListener('click', handleTriggerClick);
    trigger.addEventListener('keydown', handleTriggerKeydown);
  }

  function setupContent(): void {
    if (!content) return;

    content.id = `${id}-content`;
    content.setAttribute('aria-labelledby', `${id}-trigger`);

    // Setup dismissal - start paused, activate on open
    dismissHandler = createDismissHandler(content, {
      escapeKey: true,
      clickOutside: true,
      ignore: [trigger],
      onDismiss: close,
    });
    dismissHandler.pause();

    // Setup typeahead
    typeahead = createTypeahead(content, {
      itemSelector: `[${ATTRS.ITEM}]:not([aria-disabled="true"])`,
      onMatch: (item) => {
        highlightItem(item);
      },
    });
  }

  function renderOptions(): void {
    if (!content) return;

    content.innerHTML = '';

    // Group options
    const groups = new Map<string, SelectOption[]>();
    const ungrouped: SelectOption[] = [];

    for (const opt of currentOptions) {
      if (opt.group) {
        const group = groups.get(opt.group) ?? [];
        group.push(opt);
        groups.set(opt.group, group);
      } else {
        ungrouped.push(opt);
      }
    }

    // Render ungrouped first
    for (const opt of ungrouped) {
      content.appendChild(createOptionElement(opt));
    }

    // Render groups
    for (const [groupName, groupOptions] of groups) {
      const groupEl = document.createElement('div');
      groupEl.className = 'atlas-select-group';
      groupEl.setAttribute(ATTRS.GROUP, '');
      groupEl.setAttribute('role', 'group');
      groupEl.setAttribute('aria-label', groupName);

      const labelEl = document.createElement('div');
      labelEl.className = 'atlas-select-group-label';
      labelEl.setAttribute(ATTRS.GROUP_LABEL, '');
      labelEl.textContent = groupName;
      groupEl.appendChild(labelEl);

      for (const opt of groupOptions) {
        groupEl.appendChild(createOptionElement(opt));
      }

      content.appendChild(groupEl);
    }

    // Setup roving focus
    rovingFocus?.destroy();
    rovingFocus = createRovingFocus(content, {
      itemSelector: `[${ATTRS.ITEM}]:not([aria-disabled="true"])`,
      orientation: 'vertical',
      loop: true,
    });
  }

  function createOptionElement(opt: SelectOption): HTMLElement {
    const item = document.createElement('div');
    item.className = CLASSES.ITEM;
    item.setAttribute(ATTRS.ITEM, '');
    item.setAttribute('role', 'option');
    item.setAttribute('data-value', opt.value);
    item.tabIndex = -1;

    if (opt.disabled) {
      item.classList.add(CLASSES.ITEM_DISABLED);
      item.setAttribute('aria-disabled', 'true');
    }

    if (opt.value === currentValue) {
      item.classList.add(CLASSES.ITEM_SELECTED);
      item.setAttribute('aria-selected', 'true');
    }

    // Check icon + label
    item.innerHTML = `
      <span class="atlas-select-item-check" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="atlas-select-item-label">${escapeHtml(opt.label)}</span>
    `;

    item.addEventListener('click', () => selectOption(opt));
    item.addEventListener('mouseenter', () => highlightItem(item));

    return item;
  }

  function handleTriggerClick(event: MouseEvent): void {
    event.preventDefault();
    if (!isDisabledState) {
      toggle();
    }
  }

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (isDisabledState) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpenState) {
          open();
          // Pre-highlight current or first
          const currentItem = content?.querySelector(
            `[data-value="${currentValue}"]`
          ) as HTMLElement;
          if (currentItem) {
            highlightItem(currentItem);
          } else {
            const firstItem = content?.querySelector(
              `[${ATTRS.ITEM}]:not([aria-disabled="true"])`
            ) as HTMLElement;
            if (firstItem) highlightItem(firstItem);
          }
        }
        break;
      case 'Escape':
        if (isOpenState) {
          event.preventDefault();
          close();
        }
        break;
    }
  }

  function highlightItem(item: HTMLElement): void {
    // Remove previous highlight
    content?.querySelectorAll(`.${CLASSES.ITEM_HIGHLIGHTED}`).forEach((el) => {
      el.classList.remove(CLASSES.ITEM_HIGHLIGHTED);
    });

    item.classList.add(CLASSES.ITEM_HIGHLIGHTED);
    item.focus();

    // Update index
    const items = Array.from(content?.querySelectorAll(`[${ATTRS.ITEM}]`) ?? []);
    _highlightedIndex = items.indexOf(item);
  }

  function selectOption(opt: SelectOption): void {
    if (opt.disabled) return;

    const previousValue = currentValue;
    currentValue = opt.value;

    // Update hidden input
    if (hiddenInput) {
      hiddenInput.value = currentValue;
    }

    // Update display
    updateValueDisplay();

    // Update selected state
    content?.querySelectorAll(`[${ATTRS.ITEM}]`).forEach((item) => {
      const isSelected = item.getAttribute('data-value') === currentValue;
      item.classList.toggle(CLASSES.ITEM_SELECTED, isSelected);
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    close();

    // Callback
    if (previousValue !== currentValue) {
      options.onChange?.(currentValue, opt);
    }
  }

  function updateValueDisplay(): void {
    if (!valueDisplay) return;

    const selectedOption = currentOptions.find((opt) => opt.value === currentValue);

    if (selectedOption) {
      valueDisplay.textContent = selectedOption.label;
      valueDisplay.classList.remove(CLASSES.PLACEHOLDER);
    } else if (options.placeholder) {
      valueDisplay.textContent = options.placeholder;
      valueDisplay.classList.add(CLASSES.PLACEHOLDER);
    } else {
      valueDisplay.textContent = '';
    }
  }

  function updateDisabledState(): void {
    element.classList.toggle(CLASSES.DISABLED, isDisabledState);
    trigger?.setAttribute('aria-disabled', isDisabledState ? 'true' : 'false');

    if (trigger instanceof HTMLButtonElement) {
      trigger.disabled = isDisabledState;
    }

    if (isDisabledState && isOpenState) {
      close();
    }
  }

  function open(): void {
    if (isOpenState || isDisabledState || !content || !trigger) return;

    isOpenState = true;
    element.classList.add(CLASSES.OPEN);
    trigger.setAttribute('aria-expanded', 'true');
    content.style.display = '';

    // Position content
    positionContent();

    // Setup auto-update
    cleanupAutoUpdate = autoUpdate(trigger, content, positionContent);

    // Activate dismissal
    dismissHandler?.resume();

    // Focus first/selected item
    requestAnimationFrame(() => {
      const selectedItem = content?.querySelector(`.${CLASSES.ITEM_SELECTED}`) as HTMLElement;
      const firstItem = content?.querySelector(
        `[${ATTRS.ITEM}]:not([aria-disabled="true"])`
      ) as HTMLElement;
      const itemToFocus = selectedItem ?? firstItem;
      if (itemToFocus) {
        highlightItem(itemToFocus);
      }
    });

    options.onOpenChange?.(true);
  }

  function close(): void {
    if (!isOpenState || !content || !trigger) return;

    isOpenState = false;
    element.classList.remove(CLASSES.OPEN);
    trigger.setAttribute('aria-expanded', 'false');
    content.style.display = 'none';

    // Cleanup
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    dismissHandler?.pause();

    // Clear highlight
    content.querySelectorAll(`.${CLASSES.ITEM_HIGHLIGHTED}`).forEach((el) => {
      el.classList.remove(CLASSES.ITEM_HIGHLIGHTED);
    });
    _highlightedIndex = -1;

    // Return focus to trigger
    trigger.focus();

    options.onOpenChange?.(false);
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  function positionContent(): void {
    if (!trigger || !content) return;

    const position = options.position ?? 'auto';
    let placement: 'top' | 'bottom' = 'bottom';

    if (position === 'auto') {
      const triggerRect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      placement = spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom';
    } else {
      placement = position;
    }

    const result = computeFloatingPosition(trigger, content, {
      placement,
      offset: 4,
      flip: true,
    });

    content.style.position = 'absolute';
    content.style.left = `${result.x}px`;
    content.style.top = `${result.y}px`;
    content.style.minWidth = `${trigger.offsetWidth}px`;
  }

  function destroy(): void {
    cleanupAutoUpdate?.();
    dismissHandler?.destroy();
    rovingFocus?.destroy();
    typeahead?.destroy();

    trigger?.removeEventListener('click', handleTriggerClick);
    trigger?.removeEventListener('keydown', handleTriggerKeydown);

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN, CLASSES.DISABLED);
    element.removeAttribute('data-atlas-select');
  }

  // Initialize
  init();

  // Return API
  return {
    getValue: () => currentValue,
    setValue: (value: string) => {
      const opt = currentOptions.find((o) => o.value === value);
      if (opt) {
        selectOption(opt);
      }
    },
    getSelectedOption: () => currentOptions.find((o) => o.value === currentValue),
    isOpen: () => isOpenState,
    open,
    close,
    toggle,
    setOptions: (opts: SelectOption[]) => {
      currentOptions = opts;
      renderOptions();
      updateValueDisplay();
    },
    setDisabled: (disabled: boolean) => {
      isDisabledState = disabled;
      updateDisabledState();
    },
    isDisabled: () => isDisabledState,
    focus: () => trigger?.focus(),
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): SelectState {
  return {
    getValue: () => '',
    setValue: () => {},
    getSelectedOption: () => undefined,
    isOpen: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    setOptions: () => {},
    setDisabled: () => {},
    isDisabled: () => false,
    focus: () => {},
    destroy: () => {},
  };
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initSelects(root: Document | HTMLElement = document): SelectState[] {
  if (!isBrowser()) return [];

  const selects: SelectState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-select]');

  elements.forEach((element) => {
    // Skip if already initialized
    if (element.hasAttribute('data-atlas-select-initialized')) return;

    const optionsAttr = element.getAttribute('data-options');
    const options: SelectOptions = optionsAttr ? JSON.parse(optionsAttr) : {};

    options.value = element.getAttribute('data-value') ?? options.value;
    options.placeholder = element.getAttribute('data-placeholder') ?? options.placeholder;
    options.disabled = element.hasAttribute('data-disabled');
    options.name = element.getAttribute('data-name') ?? options.name;

    const select = createSelect(element, options);
    element.setAttribute('data-atlas-select-initialized', '');
    selects.push(select);
  });

  return selects;
}
