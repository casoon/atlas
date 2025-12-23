/**
 * Select Component
 *
 * A fully accessible select/dropdown component with:
 * - Single and multi-select modes
 * - Search/filter functionality
 * - Keyboard navigation (arrow keys, typeahead)
 * - Grouped options
 * - Custom option rendering
 * - Virtual scrolling for large lists
 *
 * @module
 */

import { generateId } from '../shared/aria';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal';
import { isBrowser } from '../shared/dom';
import {
  applyFloatingStyles,
  autoUpdate,
  computeFloatingPosition,
  type FloatingPlacement,
} from '../shared/floating';
import {
  createRovingFocus,
  createTypeahead,
  type RovingFocus,
  type Typeahead,
} from '../shared/keyboard';

// ============================================================================
// Types
// ============================================================================

/** Select option */
export interface SelectOption {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional group */
  group?: string;
  /** Custom data */
  data?: Record<string, unknown>;
}

/** Option group */
export interface SelectGroup {
  /** Group label */
  label: string;
  /** Options in this group */
  options: SelectOption[];
}

/** Select configuration */
export interface SelectConfig {
  /** Available options */
  options: (SelectOption | SelectGroup)[];
  /** Initially selected value(s) */
  value?: string | string[];
  /** Placeholder text */
  placeholder?: string;
  /** Allow multiple selections */
  multiple?: boolean;
  /** Enable search/filter */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Disable the select */
  disabled?: boolean;
  /** Clear button */
  clearable?: boolean;
  /** Maximum selections (multi-select) */
  maxSelections?: number;
  /** Dropdown placement */
  placement?: FloatingPlacement;
  /** Close on select (single mode) */
  closeOnSelect?: boolean;
  /** Custom filter function */
  filterFn?: (option: SelectOption, query: string) => boolean;
  /** Custom option renderer */
  renderOption?: (option: SelectOption, isSelected: boolean) => string;
  /** Custom selected value renderer */
  renderValue?: (options: SelectOption[]) => string;
  /** Callbacks */
  onChange?: (value: string | string[], options: SelectOption[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onSearch?: (query: string) => void;
}

/** Select instance */
export interface Select {
  /** Get current value(s) */
  getValue: () => string | string[];
  /** Get selected option(s) */
  getSelected: () => SelectOption[];
  /** Set value(s) */
  setValue: (value: string | string[]) => void;
  /** Open dropdown */
  open: () => void;
  /** Close dropdown */
  close: () => void;
  /** Toggle dropdown */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Focus the select */
  focus: () => void;
  /** Update options */
  setOptions: (options: (SelectOption | SelectGroup)[]) => void;
  /** Clear selection */
  clear: () => void;
  /** Enable/disable */
  setDisabled: (disabled: boolean) => void;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  ROOT: 'data-atlas-select',
  TRIGGER: 'data-atlas-select-trigger',
  CONTENT: 'data-atlas-select-content',
  SEARCH: 'data-atlas-select-search',
  OPTION: 'data-atlas-select-option',
  GROUP: 'data-atlas-select-group',
  GROUP_LABEL: 'data-atlas-select-group-label',
  VALUE: 'data-value',
  SELECTED: 'data-selected',
  DISABLED: 'data-disabled',
  HIGHLIGHTED: 'data-highlighted',
  EMPTY: 'data-empty',
} as const;

const CLASSES = {
  ROOT: 'atlas-select',
  TRIGGER: 'atlas-select-trigger',
  TRIGGER_TEXT: 'atlas-select-trigger-text',
  TRIGGER_ICON: 'atlas-select-trigger-icon',
  TRIGGER_CLEAR: 'atlas-select-trigger-clear',
  TAGS: 'atlas-select-tags',
  TAG: 'atlas-select-tag',
  TAG_REMOVE: 'atlas-select-tag-remove',
  CONTENT: 'atlas-select-content',
  SEARCH: 'atlas-select-search',
  SEARCH_INPUT: 'atlas-select-search-input',
  OPTIONS: 'atlas-select-options',
  OPTION: 'atlas-select-option',
  OPTION_CHECK: 'atlas-select-option-check',
  GROUP: 'atlas-select-group',
  GROUP_LABEL: 'atlas-select-group-label',
  EMPTY: 'atlas-select-empty',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/** Flatten grouped options */
function flattenOptions(options: (SelectOption | SelectGroup)[]): SelectOption[] {
  const result: SelectOption[] = [];
  for (const item of options) {
    if ('options' in item) {
      result.push(...item.options);
    } else {
      result.push(item);
    }
  }
  return result;
}

/** Check if item is a group */
function _isGroup(item: SelectOption | SelectGroup): item is SelectGroup {
  return 'options' in item;
}

/** Default filter function */
function defaultFilter(option: SelectOption, query: string): boolean {
  return option.label.toLowerCase().includes(query.toLowerCase());
}

/** Default option renderer */
function defaultRenderOption(option: SelectOption, isSelected: boolean): string {
  const checkmark = isSelected
    ? `<span class="${CLASSES.OPTION_CHECK}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
       </span>`
    : `<span class="${CLASSES.OPTION_CHECK}"></span>`;
  return `${checkmark}<span>${option.label}</span>`;
}

/** Default value renderer */
function defaultRenderValue(options: SelectOption[]): string {
  if (options.length === 0) return '';
  if (options.length === 1) return options[0].label;
  return `${options.length} selected`;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a Select instance
 *
 * @example
 * ```typescript
 * const select = createSelect(container, {
 *   options: [
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' },
 *     { value: '3', label: 'Option 3', disabled: true },
 *   ],
 *   placeholder: 'Select an option',
 *   searchable: true,
 *   onChange: (value) => console.log('Selected:', value)
 * });
 *
 * // Multi-select with groups
 * const multiSelect = createSelect(container, {
 *   multiple: true,
 *   options: [
 *     {
 *       label: 'Fruits',
 *       options: [
 *         { value: 'apple', label: 'Apple' },
 *         { value: 'banana', label: 'Banana' },
 *       ]
 *     },
 *     {
 *       label: 'Vegetables',
 *       options: [
 *         { value: 'carrot', label: 'Carrot' },
 *         { value: 'broccoli', label: 'Broccoli' },
 *       ]
 *     }
 *   ]
 * });
 * ```
 */
export function createSelect(container: HTMLElement, config: SelectConfig): Select {
  // SSR guard
  if (!isBrowser()) {
    return {
      getValue: () => (config.multiple ? [] : ''),
      getSelected: () => [],
      setValue: () => {},
      open: () => {},
      close: () => {},
      toggle: () => {},
      isOpen: () => false,
      focus: () => {},
      setOptions: () => {},
      clear: () => {},
      setDisabled: () => {},
      destroy: () => {},
    };
  }

  // State
  let options = config.options;
  let flatOptions = flattenOptions(options);
  const selectedValues: Set<string> = new Set(
    Array.isArray(config.value) ? config.value : config.value ? [config.value] : []
  );
  let isOpenState = false;
  let searchQuery = '';
  let highlightedIndex = -1;
  let disabled = config.disabled ?? false;

  const {
    placeholder = 'Select...',
    multiple = false,
    searchable = false,
    searchPlaceholder = 'Search...',
    clearable = false,
    maxSelections,
    placement = 'bottom-start',
    closeOnSelect = !multiple,
    filterFn = defaultFilter,
    renderOption = defaultRenderOption,
    renderValue = defaultRenderValue,
    onChange,
    onOpen,
    onClose,
    onSearch,
  } = config;

  // Generate IDs
  const id = generateId('select');
  const triggerId = `${id}-trigger`;
  const contentId = `${id}-content`;
  const searchId = `${id}-search`;
  const listboxId = `${id}-listbox`;

  // Elements (initialized in render(), placeholders for TypeScript)
  let triggerEl: HTMLButtonElement = null as unknown as HTMLButtonElement;
  let contentEl: HTMLDivElement = null as unknown as HTMLDivElement;
  let searchEl: HTMLInputElement | null = null;
  let optionsEl: HTMLDivElement = null as unknown as HTMLDivElement;

  // Controllers
  let rovingFocus: RovingFocus | null = null;
  let typeahead: Typeahead | null = null;
  let dismissHandler: DismissalHandler | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;

  // ============================================================================
  // Rendering
  // ============================================================================

  function render(): void {
    container.innerHTML = '';
    container.setAttribute(ATTRS.ROOT, '');
    container.classList.add(CLASSES.ROOT);

    // Create trigger button
    triggerEl = document.createElement('button');
    triggerEl.type = 'button';
    triggerEl.id = triggerId;
    triggerEl.className = CLASSES.TRIGGER;
    triggerEl.setAttribute(ATTRS.TRIGGER, '');
    triggerEl.setAttribute('aria-haspopup', 'listbox');
    triggerEl.setAttribute('aria-expanded', 'false');
    triggerEl.setAttribute('aria-controls', contentId);
    if (disabled) {
      triggerEl.disabled = true;
      triggerEl.setAttribute(ATTRS.DISABLED, '');
    }

    updateTriggerContent();
    container.appendChild(triggerEl);

    // Create content (dropdown)
    contentEl = document.createElement('div');
    contentEl.id = contentId;
    contentEl.className = CLASSES.CONTENT;
    contentEl.setAttribute(ATTRS.CONTENT, '');
    contentEl.setAttribute('role', 'dialog');
    contentEl.setAttribute('aria-labelledby', triggerId);
    contentEl.hidden = true;

    // Search input
    if (searchable) {
      const searchWrapper = document.createElement('div');
      searchWrapper.className = CLASSES.SEARCH;

      searchEl = document.createElement('input');
      searchEl.type = 'text';
      searchEl.id = searchId;
      searchEl.className = CLASSES.SEARCH_INPUT;
      searchEl.placeholder = searchPlaceholder;
      searchEl.setAttribute(ATTRS.SEARCH, '');
      searchEl.setAttribute('aria-controls', listboxId);
      searchEl.setAttribute('aria-autocomplete', 'list');

      searchWrapper.appendChild(searchEl);
      contentEl.appendChild(searchWrapper);
    }

    // Options list
    optionsEl = document.createElement('div');
    optionsEl.id = listboxId;
    optionsEl.className = CLASSES.OPTIONS;
    optionsEl.setAttribute('role', 'listbox');
    optionsEl.setAttribute('aria-multiselectable', String(multiple));

    renderOptions();
    contentEl.appendChild(optionsEl);

    document.body.appendChild(contentEl);
  }

  function updateTriggerContent(): void {
    const selected = getSelected();

    if (multiple && selected.length > 0) {
      // Render tags for multi-select
      const tagsHtml = selected
        .map(
          (opt) => `
          <span class="${CLASSES.TAG}" data-value="${opt.value}">
            ${opt.label}
            <button type="button" class="${CLASSES.TAG_REMOVE}" aria-label="Remove ${opt.label}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </span>
        `
        )
        .join('');

      triggerEl.innerHTML = `
        <span class="${CLASSES.TAGS}">${tagsHtml}</span>
        <span class="${CLASSES.TRIGGER_ICON}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      `;
    } else {
      // Single value or placeholder
      const text = selected.length > 0 ? renderValue(selected) : placeholder;
      const isPlaceholder = selected.length === 0;

      let clearBtn = '';
      if (clearable && selected.length > 0) {
        clearBtn = `
          <button type="button" class="${CLASSES.TRIGGER_CLEAR}" aria-label="Clear selection">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        `;
      }

      triggerEl.innerHTML = `
        <span class="${CLASSES.TRIGGER_TEXT}" ${isPlaceholder ? 'data-placeholder="true"' : ''}>${text}</span>
        ${clearBtn}
        <span class="${CLASSES.TRIGGER_ICON}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      `;
    }
  }

  function renderOptions(): void {
    const filteredOptions = searchQuery
      ? flatOptions.filter((opt) => filterFn(opt, searchQuery))
      : flatOptions;

    if (filteredOptions.length === 0) {
      optionsEl.innerHTML = `<div class="${CLASSES.EMPTY}" ${ATTRS.EMPTY}>No options found</div>`;
      optionsEl.setAttribute('aria-activedescendant', '');
      return;
    }

    // Group options if needed
    const grouped = new Map<string, SelectOption[]>();
    const ungrouped: SelectOption[] = [];

    for (const opt of filteredOptions) {
      if (opt.group) {
        const group = grouped.get(opt.group) || [];
        group.push(opt);
        grouped.set(opt.group, group);
      } else {
        ungrouped.push(opt);
      }
    }

    let html = '';

    // Render ungrouped options first
    for (const opt of ungrouped) {
      html += renderOptionHtml(opt);
    }

    // Render groups
    for (const [label, opts] of grouped) {
      html += `
        <div class="${CLASSES.GROUP}" ${ATTRS.GROUP} role="group" aria-label="${label}">
          <div class="${CLASSES.GROUP_LABEL}" ${ATTRS.GROUP_LABEL}>${label}</div>
          ${opts.map((opt) => renderOptionHtml(opt)).join('')}
        </div>
      `;
    }

    optionsEl.innerHTML = html;

    // Highlight first option if none highlighted
    if (highlightedIndex === -1 && filteredOptions.length > 0) {
      highlightOption(0);
    }
  }

  function renderOptionHtml(option: SelectOption): string {
    const isSelected = selectedValues.has(option.value);
    const isDisabled = option.disabled ?? false;
    const optionId = `${id}-option-${option.value}`;

    return `
      <div
        id="${optionId}"
        class="${CLASSES.OPTION}"
        role="option"
        ${ATTRS.OPTION}
        ${ATTRS.VALUE}="${option.value}"
        ${isSelected ? `${ATTRS.SELECTED}` : ''}
        ${isDisabled ? `${ATTRS.DISABLED}` : ''}
        aria-selected="${isSelected}"
        aria-disabled="${isDisabled}"
      >
        ${renderOption(option, isSelected)}
      </div>
    `;
  }

  function getVisibleOptions(): HTMLElement[] {
    return Array.from(
      optionsEl.querySelectorAll<HTMLElement>(`[${ATTRS.OPTION}]:not([${ATTRS.DISABLED}])`)
    );
  }

  function highlightOption(index: number): void {
    const visibleOptions = getVisibleOptions();

    // Remove previous highlight
    visibleOptions.forEach((el) => el.removeAttribute(ATTRS.HIGHLIGHTED));

    if (index >= 0 && index < visibleOptions.length) {
      const option = visibleOptions[index];
      option.setAttribute(ATTRS.HIGHLIGHTED, '');
      option.scrollIntoView({ block: 'nearest' });
      optionsEl.setAttribute('aria-activedescendant', option.id);
      highlightedIndex = index;
    }
  }

  // ============================================================================
  // Selection
  // ============================================================================

  function getSelected(): SelectOption[] {
    return flatOptions.filter((opt) => selectedValues.has(opt.value));
  }

  function selectOption(value: string): void {
    const option = flatOptions.find((opt) => opt.value === value);
    if (!option || option.disabled) return;

    if (multiple) {
      if (selectedValues.has(value)) {
        selectedValues.delete(value);
      } else {
        if (maxSelections && selectedValues.size >= maxSelections) return;
        selectedValues.add(value);
      }
    } else {
      selectedValues.clear();
      selectedValues.add(value);
    }

    updateTriggerContent();
    renderOptions();

    const selected = getSelected();
    const returnValue = multiple ? Array.from(selectedValues) : value;
    onChange?.(returnValue, selected);

    if (closeOnSelect) {
      close();
    }
  }

  function clearSelection(): void {
    selectedValues.clear();
    updateTriggerContent();
    renderOptions();

    const returnValue = multiple ? [] : '';
    onChange?.(returnValue, []);
  }

  // ============================================================================
  // Open/Close
  // ============================================================================

  function open(): void {
    if (isOpenState || disabled) return;

    isOpenState = true;
    contentEl.hidden = false;
    triggerEl.setAttribute('aria-expanded', 'true');

    // Position dropdown
    const updatePosition = () => {
      const result = computeFloatingPosition(triggerEl, contentEl, {
        placement,
        offset: 4,
        flip: true,
      });
      applyFloatingStyles(contentEl, result);
    };

    updatePosition();
    cleanupAutoUpdate = autoUpdate(triggerEl, contentEl, updatePosition);

    // Reset search
    if (searchEl) {
      searchEl.value = '';
      searchQuery = '';
      renderOptions();
      searchEl.focus();
    } else {
      // Focus first option
      highlightOption(0);
      optionsEl.focus();
    }

    // Set up keyboard navigation
    rovingFocus = createRovingFocus(optionsEl, {
      itemSelector: `[${ATTRS.OPTION}]:not([${ATTRS.DISABLED}])`,
      orientation: 'vertical',
      loop: true,
      onFocusChange: (_el, index) => {
        highlightedIndex = index;
      },
    });

    if (!searchable) {
      typeahead = createTypeahead(optionsEl, {
        itemSelector: `[${ATTRS.OPTION}]:not([${ATTRS.DISABLED}])`,
        onMatch: (_el, index) => {
          highlightOption(index);
        },
      });
    }

    // Dismiss handler
    dismissHandler = createDismissHandler(contentEl, {
      onDismiss: close,
      escapeKey: true,
      clickOutside: true,
      ignore: [triggerEl],
    });

    onOpen?.();
  }

  function close(): void {
    if (!isOpenState) return;

    isOpenState = false;
    contentEl.hidden = true;
    triggerEl.setAttribute('aria-expanded', 'false');

    // Clean up
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    rovingFocus?.destroy();
    rovingFocus = null;
    typeahead?.destroy();
    typeahead = null;
    dismissHandler?.destroy();
    dismissHandler = null;

    // Reset
    searchQuery = '';
    highlightedIndex = -1;

    triggerEl.focus();
    onClose?.();
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function handleTriggerClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Handle clear button
    if (target.closest(`.${CLASSES.TRIGGER_CLEAR}`)) {
      e.stopPropagation();
      clearSelection();
      return;
    }

    // Handle tag remove
    const tagRemove = target.closest(`.${CLASSES.TAG_REMOVE}`);
    if (tagRemove) {
      e.stopPropagation();
      const tag = tagRemove.closest(`.${CLASSES.TAG}`) as HTMLElement;
      const value = tag?.dataset.value;
      if (value) {
        selectedValues.delete(value);
        updateTriggerContent();
        renderOptions();
        const selected = getSelected();
        onChange?.(Array.from(selectedValues), selected);
      }
      return;
    }

    toggle();
  }

  function handleTriggerKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        open();
        break;
    }
  }

  function handleOptionsClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const option = target.closest(`[${ATTRS.OPTION}]`) as HTMLElement;

    if (option && !option.hasAttribute(ATTRS.DISABLED)) {
      const value = option.getAttribute(ATTRS.VALUE);
      if (value) {
        selectOption(value);
      }
    }
  }

  function handleOptionsKeydown(e: KeyboardEvent): void {
    const visibleOptions = getVisibleOptions();

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < visibleOptions.length) {
          const value = visibleOptions[highlightedIndex].getAttribute(ATTRS.VALUE);
          if (value) selectOption(value);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        highlightOption(Math.min(highlightedIndex + 1, visibleOptions.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        highlightOption(Math.max(highlightedIndex - 1, 0));
        break;

      case 'Home':
        e.preventDefault();
        highlightOption(0);
        break;

      case 'End':
        e.preventDefault();
        highlightOption(visibleOptions.length - 1);
        break;

      case 'Tab':
        close();
        break;
    }
  }

  function handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    searchQuery = input.value;
    highlightedIndex = -1;
    renderOptions();
    onSearch?.(searchQuery);
  }

  function handleSearchKeydown(e: KeyboardEvent): void {
    const visibleOptions = getVisibleOptions();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightOption(Math.min(highlightedIndex + 1, visibleOptions.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        highlightOption(Math.max(highlightedIndex - 1, 0));
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < visibleOptions.length) {
          const value = visibleOptions[highlightedIndex].getAttribute(ATTRS.VALUE);
          if (value) selectOption(value);
        }
        break;

      case 'Escape':
        close();
        break;
    }
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  render();

  // Event listeners
  triggerEl.addEventListener('click', handleTriggerClick);
  triggerEl.addEventListener('keydown', handleTriggerKeydown);
  optionsEl.addEventListener('click', handleOptionsClick);
  optionsEl.addEventListener('keydown', handleOptionsKeydown);

  if (searchEl !== null) {
    const el = searchEl as HTMLInputElement;
    el.addEventListener('input', handleSearchInput);
    el.addEventListener('keydown', handleSearchKeydown);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    getValue(): string | string[] {
      return multiple ? Array.from(selectedValues) : Array.from(selectedValues)[0] || '';
    },

    getSelected,

    setValue(value: string | string[]): void {
      selectedValues.clear();
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        if (flatOptions.some((opt) => opt.value === v)) {
          selectedValues.add(v);
        }
      }
      updateTriggerContent();
      renderOptions();
    },

    open,
    close,
    toggle,

    isOpen(): boolean {
      return isOpenState;
    },

    focus(): void {
      triggerEl.focus();
    },

    setOptions(newOptions: (SelectOption | SelectGroup)[]): void {
      options = newOptions;
      flatOptions = flattenOptions(options);
      // Remove invalid selections
      for (const value of selectedValues) {
        if (!flatOptions.some((opt) => opt.value === value)) {
          selectedValues.delete(value);
        }
      }
      updateTriggerContent();
      if (isOpenState) {
        renderOptions();
      }
    },

    clear(): void {
      clearSelection();
    },

    setDisabled(value: boolean): void {
      disabled = value;
      triggerEl.disabled = disabled;
      if (disabled) {
        triggerEl.setAttribute(ATTRS.DISABLED, '');
        close();
      } else {
        triggerEl.removeAttribute(ATTRS.DISABLED);
      }
    },

    destroy(): void {
      close();
      triggerEl.removeEventListener('click', handleTriggerClick);
      triggerEl.removeEventListener('keydown', handleTriggerKeydown);
      optionsEl.removeEventListener('click', handleOptionsClick);
      optionsEl.removeEventListener('keydown', handleOptionsKeydown);
      if (searchEl) {
        searchEl.removeEventListener('input', handleSearchInput);
        searchEl.removeEventListener('keydown', handleSearchKeydown);
      }
      contentEl.remove();
      container.innerHTML = '';
    },
  };
}

// ============================================================================
// Web Component
// ============================================================================

export class AtlasSelect extends HTMLElement {
  private _select: Select | null = null;
  private _options: (SelectOption | SelectGroup)[] = [];

  static get observedAttributes(): string[] {
    return ['placeholder', 'disabled', 'multiple', 'searchable', 'clearable', 'value'];
  }

  connectedCallback(): void {
    // Parse options from child elements or data attribute
    this._parseOptions();
    this._init();
  }

  disconnectedCallback(): void {
    this._select?.destroy();
    this._select = null;
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    if (!this._select) return;

    switch (name) {
      case 'disabled':
        this._select.setDisabled(newValue !== null);
        break;
      case 'value':
        if (newValue) {
          const values = newValue.includes(',') ? newValue.split(',') : newValue;
          this._select.setValue(values);
        }
        break;
    }
  }

  private _parseOptions(): void {
    // Try data attribute first
    const dataOptions = this.getAttribute('data-options');
    if (dataOptions) {
      try {
        this._options = JSON.parse(dataOptions);
        return;
      } catch {
        console.warn('[AtlasSelect] Invalid JSON in data-options');
      }
    }

    // Parse from child option/optgroup elements
    const options: (SelectOption | SelectGroup)[] = [];

    for (const child of Array.from(this.children)) {
      if (child.tagName === 'OPTGROUP') {
        const group: SelectGroup = {
          label: child.getAttribute('label') || '',
          options: [],
        };
        for (const opt of Array.from(child.children)) {
          if (opt.tagName === 'OPTION') {
            group.options.push({
              value: opt.getAttribute('value') || opt.textContent || '',
              label: opt.textContent || '',
              disabled: opt.hasAttribute('disabled'),
            });
          }
        }
        options.push(group);
      } else if (child.tagName === 'OPTION') {
        options.push({
          value: child.getAttribute('value') || child.textContent || '',
          label: child.textContent || '',
          disabled: child.hasAttribute('disabled'),
        });
      }
    }

    this._options = options;
  }

  private _init(): void {
    // Clear children (options parsed)
    this.innerHTML = '';

    this._select = createSelect(this, {
      options: this._options,
      placeholder: this.getAttribute('placeholder') || undefined,
      disabled: this.hasAttribute('disabled'),
      multiple: this.hasAttribute('multiple'),
      searchable: this.hasAttribute('searchable'),
      clearable: this.hasAttribute('clearable'),
      value: this.getAttribute('value') || undefined,
      onChange: (value, options) => {
        this.dispatchEvent(
          new CustomEvent('change', {
            detail: { value, options },
            bubbles: true,
          })
        );
      },
    });
  }

  // Public API
  get value(): string | string[] {
    return this._select?.getValue() || '';
  }

  set value(val: string | string[]) {
    this._select?.setValue(val);
  }

  get selected(): SelectOption[] {
    return this._select?.getSelected() || [];
  }

  open(): void {
    this._select?.open();
  }

  close(): void {
    this._select?.close();
  }

  clear(): void {
    this._select?.clear();
  }
}

// Register web component
if (isBrowser() && !customElements.get('atlas-select')) {
  customElements.define('atlas-select', AtlasSelect);
}
