/**
 * Combobox Component
 *
 * An accessible combobox (autocomplete) component with:
 * - Text input with dropdown suggestions
 * - Async data loading
 * - Debounced search
 * - Keyboard navigation
 * - Custom result rendering
 * - Create new items
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

// ============================================================================
// Types
// ============================================================================

/** Combobox option */
export interface ComboboxOption<T = unknown> {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: T;
}

/** Combobox configuration */
export interface ComboboxConfig<T = unknown> {
  /** Static options (or use onSearch for async) */
  options?: ComboboxOption<T>[];
  /** Initially selected value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the combobox */
  disabled?: boolean;
  /** Minimum characters before searching */
  minChars?: number;
  /** Debounce delay in ms */
  debounce?: number;
  /** Show loading indicator */
  showLoading?: boolean;
  /** Allow creating new items */
  allowCreate?: boolean;
  /** Create item label template */
  createLabel?: (query: string) => string;
  /** Dropdown placement */
  placement?: FloatingPlacement;
  /** Maximum visible options */
  maxOptions?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading message */
  loadingMessage?: string;
  /** Custom filter (for static options) */
  filterFn?: (option: ComboboxOption<T>, query: string) => boolean;
  /** Custom option renderer */
  renderOption?: (option: ComboboxOption<T>, isHighlighted: boolean) => string;
  /** Highlight matches in options */
  highlightMatches?: boolean;
  /** Callbacks */
  onSearch?: (query: string) => Promise<ComboboxOption<T>[]> | ComboboxOption<T>[];
  onChange?: (value: string, option: ComboboxOption<T> | null) => void;
  onCreate?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/** Combobox instance */
export interface Combobox<T = unknown> {
  /** Get current value */
  getValue: () => string;
  /** Get selected option */
  getSelected: () => ComboboxOption<T> | null;
  /** Set value */
  setValue: (value: string) => void;
  /** Set input text */
  setInputValue: (text: string) => void;
  /** Open dropdown */
  open: () => void;
  /** Close dropdown */
  close: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Focus input */
  focus: () => void;
  /** Update options */
  setOptions: (options: ComboboxOption<T>[]) => void;
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
  ROOT: 'data-atlas-combobox',
  INPUT: 'data-atlas-combobox-input',
  CONTENT: 'data-atlas-combobox-content',
  OPTION: 'data-atlas-combobox-option',
  VALUE: 'data-value',
  SELECTED: 'data-selected',
  DISABLED: 'data-disabled',
  HIGHLIGHTED: 'data-highlighted',
  LOADING: 'data-loading',
  EMPTY: 'data-empty',
  CREATE: 'data-create',
} as const;

const CLASSES = {
  ROOT: 'atlas-combobox',
  INPUT_WRAPPER: 'atlas-combobox-input-wrapper',
  INPUT: 'atlas-combobox-input',
  CLEAR: 'atlas-combobox-clear',
  LOADING: 'atlas-combobox-loading',
  CONTENT: 'atlas-combobox-content',
  OPTIONS: 'atlas-combobox-options',
  OPTION: 'atlas-combobox-option',
  OPTION_LABEL: 'atlas-combobox-option-label',
  HIGHLIGHT: 'atlas-combobox-highlight',
  EMPTY: 'atlas-combobox-empty',
  CREATE: 'atlas-combobox-create',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/** Default filter function */
function defaultFilter<T>(option: ComboboxOption<T>, query: string): boolean {
  return option.label.toLowerCase().includes(query.toLowerCase());
}

/** Highlight matching text */
function highlightText(text: string, query: string): string {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, `<mark class="${CLASSES.HIGHLIGHT}">$1</mark>`);
}

/** Escape regex special chars */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Debounce function */
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a Combobox instance
 *
 * @example
 * ```typescript
 * // Static options
 * const combobox = createCombobox(container, {
 *   options: [
 *     { value: '1', label: 'Apple' },
 *     { value: '2', label: 'Banana' },
 *     { value: '3', label: 'Cherry' },
 *   ],
 *   placeholder: 'Search fruits...',
 *   onChange: (value, option) => console.log('Selected:', option)
 * });
 *
 * // Async search
 * const asyncCombobox = createCombobox(container, {
 *   placeholder: 'Search users...',
 *   minChars: 2,
 *   debounce: 300,
 *   onSearch: async (query) => {
 *     const response = await fetch(`/api/users?q=${query}`);
 *     return response.json();
 *   },
 *   onChange: (value, option) => console.log('Selected:', option)
 * });
 * ```
 */
export function createCombobox<T = unknown>(
  container: HTMLElement,
  config: ComboboxConfig<T>
): Combobox<T> {
  // SSR guard
  if (!isBrowser()) {
    return {
      getValue: () => '',
      getSelected: () => null,
      setValue: () => {},
      setInputValue: () => {},
      open: () => {},
      close: () => {},
      isOpen: () => false,
      focus: () => {},
      setOptions: () => {},
      clear: () => {},
      setDisabled: () => {},
      destroy: () => {},
    };
  }

  // State
  let options: ComboboxOption<T>[] = config.options || [];
  let filteredOptions: ComboboxOption<T>[] = [];
  let selectedValue: string = config.value || '';
  let selectedOption: ComboboxOption<T> | null = null;
  let inputValue = '';
  let isOpenState = false;
  let isLoading = false;
  let highlightedIndex = -1;
  let disabled = config.disabled ?? false;

  const {
    placeholder = '',
    minChars = 0,
    debounce: debounceDelay = 150,
    showLoading = true,
    allowCreate = false,
    createLabel = (q) => `Create "${q}"`,
    placement = 'bottom-start',
    maxOptions = 10,
    emptyMessage = 'No results found',
    loadingMessage = 'Loading...',
    filterFn = defaultFilter,
    renderOption,
    highlightMatches = true,
    onSearch,
    onChange,
    onCreate,
    onFocus,
    onBlur,
  } = config;

  // Generate IDs
  const id = generateId('combobox');
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;

  // Elements (initialized in render(), placeholders for TypeScript)
  let inputEl: HTMLInputElement = null as unknown as HTMLInputElement;
  let contentEl: HTMLDivElement = null as unknown as HTMLDivElement;
  let optionsEl: HTMLDivElement = null as unknown as HTMLDivElement;
  let clearBtn: HTMLButtonElement | null = null;
  let loadingEl: HTMLDivElement | null = null;

  // Controllers
  let dismissHandler: DismissalHandler | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;

  // Set initial selected option
  if (selectedValue) {
    selectedOption = options.find((o) => o.value === selectedValue) || null;
    inputValue = selectedOption?.label || selectedValue;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  function render(): void {
    container.innerHTML = '';
    container.setAttribute(ATTRS.ROOT, '');
    container.classList.add(CLASSES.ROOT);

    // Input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = CLASSES.INPUT_WRAPPER;

    // Input
    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.id = inputId;
    inputEl.className = CLASSES.INPUT;
    inputEl.placeholder = placeholder;
    inputEl.value = inputValue;
    inputEl.setAttribute(ATTRS.INPUT, '');
    inputEl.setAttribute('role', 'combobox');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('aria-expanded', 'false');
    inputEl.setAttribute('aria-controls', listboxId);
    inputEl.setAttribute('autocomplete', 'off');
    if (disabled) {
      inputEl.disabled = true;
      inputEl.setAttribute(ATTRS.DISABLED, '');
    }

    inputWrapper.appendChild(inputEl);

    // Clear button
    clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = CLASSES.CLEAR;
    clearBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    clearBtn.setAttribute('aria-label', 'Clear');
    clearBtn.hidden = !inputValue;
    inputWrapper.appendChild(clearBtn);

    // Loading indicator
    if (showLoading) {
      loadingEl = document.createElement('div');
      loadingEl.className = CLASSES.LOADING;
      loadingEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="28" stroke-dashoffset="7">
            <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;
      loadingEl.hidden = true;
      inputWrapper.appendChild(loadingEl);
    }

    container.appendChild(inputWrapper);

    // Content (dropdown)
    contentEl = document.createElement('div');
    contentEl.id = `${id}-content`;
    contentEl.className = CLASSES.CONTENT;
    contentEl.setAttribute(ATTRS.CONTENT, '');
    contentEl.hidden = true;

    // Options list
    optionsEl = document.createElement('div');
    optionsEl.id = listboxId;
    optionsEl.className = CLASSES.OPTIONS;
    optionsEl.setAttribute('role', 'listbox');

    contentEl.appendChild(optionsEl);
    document.body.appendChild(contentEl);
  }

  function renderOptions(): void {
    const displayOptions = filteredOptions.slice(0, maxOptions);

    if (isLoading) {
      optionsEl.innerHTML = `<div class="${CLASSES.EMPTY}" ${ATTRS.LOADING}>${loadingMessage}</div>`;
      return;
    }

    if (displayOptions.length === 0) {
      let html = `<div class="${CLASSES.EMPTY}" ${ATTRS.EMPTY}>${emptyMessage}</div>`;

      // Add create option if allowed
      if (allowCreate && inputValue.trim()) {
        html += `
          <div
            class="${CLASSES.CREATE}"
            ${ATTRS.CREATE}
            role="option"
            tabindex="-1"
          >
            ${createLabel(inputValue.trim())}
          </div>
        `;
      }

      optionsEl.innerHTML = html;
      return;
    }

    let html = displayOptions
      .map((opt, i) => {
        const isSelected = opt.value === selectedValue;
        const isHighlighted = i === highlightedIndex;
        const optionId = `${id}-option-${i}`;

        let content: string;
        if (renderOption) {
          content = renderOption(opt, isHighlighted);
        } else {
          const label = highlightMatches ? highlightText(opt.label, inputValue) : opt.label;
          content = `<span class="${CLASSES.OPTION_LABEL}">${label}</span>`;
        }

        return `
          <div
            id="${optionId}"
            class="${CLASSES.OPTION}"
            role="option"
            ${ATTRS.OPTION}
            ${ATTRS.VALUE}="${opt.value}"
            ${isSelected ? ATTRS.SELECTED : ''}
            ${isHighlighted ? ATTRS.HIGHLIGHTED : ''}
            ${opt.disabled ? ATTRS.DISABLED : ''}
            aria-selected="${isSelected}"
            aria-disabled="${opt.disabled || false}"
          >
            ${content}
          </div>
        `;
      })
      .join('');

    // Add create option at the end if allowed
    if (
      allowCreate &&
      inputValue.trim() &&
      !displayOptions.some((o) => o.label.toLowerCase() === inputValue.toLowerCase())
    ) {
      html += `
        <div
          class="${CLASSES.CREATE}"
          ${ATTRS.CREATE}
          role="option"
          tabindex="-1"
        >
          ${createLabel(inputValue.trim())}
        </div>
      `;
    }

    optionsEl.innerHTML = html;

    // Update aria-activedescendant
    if (highlightedIndex >= 0 && highlightedIndex < displayOptions.length) {
      inputEl.setAttribute('aria-activedescendant', `${id}-option-${highlightedIndex}`);
    } else {
      inputEl.removeAttribute('aria-activedescendant');
    }
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
      inputEl.setAttribute('aria-activedescendant', option.id);
      highlightedIndex = index;
    } else {
      highlightedIndex = -1;
      inputEl.removeAttribute('aria-activedescendant');
    }
  }

  // ============================================================================
  // Filtering
  // ============================================================================

  const performSearch = debounce(async (query: string) => {
    if (query.length < minChars) {
      filteredOptions = [];
      renderOptions();
      return;
    }

    if (onSearch) {
      // Async search
      isLoading = true;
      renderOptions();

      try {
        const results = await onSearch(query);
        filteredOptions = results;
      } catch (error) {
        console.error('[Combobox] Search error:', error);
        filteredOptions = [];
      } finally {
        isLoading = false;
      }
    } else {
      // Local filter
      filteredOptions = options.filter((opt) => filterFn(opt, query));
    }

    highlightedIndex = filteredOptions.length > 0 ? 0 : -1;
    renderOptions();
  }, debounceDelay);

  // ============================================================================
  // Selection
  // ============================================================================

  function selectOption(option: ComboboxOption<T>): void {
    selectedValue = option.value;
    selectedOption = option;
    inputValue = option.label;
    inputEl.value = inputValue;

    if (clearBtn) clearBtn.hidden = false;

    close();
    onChange?.(selectedValue, selectedOption);
  }

  function createItem(value: string): void {
    onCreate?.(value);
    inputValue = value;
    selectedValue = value;
    selectedOption = null;

    if (clearBtn) clearBtn.hidden = false;

    close();
  }

  function clearSelection(): void {
    selectedValue = '';
    selectedOption = null;
    inputValue = '';
    inputEl.value = '';

    if (clearBtn) clearBtn.hidden = true;

    filteredOptions = [];
    renderOptions();

    onChange?.('', null);
  }

  // ============================================================================
  // Open/Close
  // ============================================================================

  function open(): void {
    if (isOpenState || disabled) return;

    isOpenState = true;
    contentEl.hidden = false;
    inputEl.setAttribute('aria-expanded', 'true');

    // Position dropdown
    const updatePosition = () => {
      const result = computeFloatingPosition(inputEl, contentEl, {
        placement,
        offset: 4,
        flip: true,
      });
      applyFloatingStyles(contentEl, result);
      // Match input width
      contentEl.style.minWidth = `${inputEl.offsetWidth}px`;
    };

    updatePosition();
    cleanupAutoUpdate = autoUpdate(inputEl, contentEl, updatePosition);

    // Initial filter
    performSearch(inputValue);

    // Dismiss handler
    dismissHandler = createDismissHandler(contentEl, {
      onDismiss: close,
      escapeKey: true,
      clickOutside: true,
      ignore: [container],
    });
  }

  function close(): void {
    if (!isOpenState) return;

    isOpenState = false;
    contentEl.hidden = true;
    inputEl.setAttribute('aria-expanded', 'false');
    inputEl.removeAttribute('aria-activedescendant');

    // Clean up
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    dismissHandler?.destroy();
    dismissHandler = null;

    // Reset
    highlightedIndex = -1;
    isLoading = false;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function handleInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    inputValue = input.value;

    if (clearBtn) clearBtn.hidden = !inputValue;

    // Clear selection if input changed
    if (selectedOption && inputValue !== selectedOption.label) {
      selectedValue = '';
      selectedOption = null;
    }

    if (!isOpenState && inputValue.length >= minChars) {
      open();
    } else if (isOpenState) {
      performSearch(inputValue);
    }
  }

  function handleFocus(): void {
    onFocus?.();
    if (inputValue.length >= minChars || options.length > 0) {
      open();
    }
  }

  function handleBlur(): void {
    onBlur?.();
    // Delay close to allow click on options
    setTimeout(() => {
      if (!contentEl.contains(document.activeElement)) {
        close();
      }
    }, 150);
  }

  function handleKeydown(e: KeyboardEvent): void {
    const visibleOptions = getVisibleOptions();
    const hasCreateOption =
      allowCreate && inputValue.trim() && optionsEl.querySelector(`[${ATTRS.CREATE}]`);
    const totalOptions = visibleOptions.length + (hasCreateOption ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpenState) {
          open();
        } else {
          highlightOption(Math.min(highlightedIndex + 1, totalOptions - 1));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpenState) {
          highlightOption(Math.max(highlightedIndex - 1, 0));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpenState) {
          // Check if create option is highlighted
          if (hasCreateOption && highlightedIndex === visibleOptions.length) {
            createItem(inputValue.trim());
          } else if (highlightedIndex >= 0 && highlightedIndex < visibleOptions.length) {
            const value = visibleOptions[highlightedIndex].getAttribute(ATTRS.VALUE);
            const option = filteredOptions.find((o) => o.value === value);
            if (option) selectOption(option);
          }
        } else if (inputValue.length >= minChars) {
          open();
        }
        break;

      case 'Escape':
        if (isOpenState) {
          e.preventDefault();
          close();
        }
        break;

      case 'Tab':
        close();
        break;

      case 'Home':
        if (isOpenState) {
          e.preventDefault();
          highlightOption(0);
        }
        break;

      case 'End':
        if (isOpenState) {
          e.preventDefault();
          highlightOption(totalOptions - 1);
        }
        break;
    }
  }

  function handleOptionsClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Handle create option
    const createEl = target.closest(`[${ATTRS.CREATE}]`);
    if (createEl) {
      createItem(inputValue.trim());
      return;
    }

    // Handle regular option
    const optionEl = target.closest(`[${ATTRS.OPTION}]`) as HTMLElement;
    if (optionEl && !optionEl.hasAttribute(ATTRS.DISABLED)) {
      const value = optionEl.getAttribute(ATTRS.VALUE);
      const option = filteredOptions.find((o) => o.value === value);
      if (option) selectOption(option);
    }
  }

  function handleClearClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    clearSelection();
    inputEl.focus();
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  render();

  // Event listeners
  inputEl.addEventListener('input', handleInput);
  inputEl.addEventListener('focus', handleFocus);
  inputEl.addEventListener('blur', handleBlur);
  inputEl.addEventListener('keydown', handleKeydown);
  optionsEl.addEventListener('click', handleOptionsClick);
  if (clearBtn !== null) {
    const btn = clearBtn as HTMLButtonElement;
    btn.addEventListener('click', handleClearClick);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    getValue(): string {
      return selectedValue;
    },

    getSelected(): ComboboxOption<T> | null {
      return selectedOption;
    },

    setValue(value: string): void {
      const option = options.find((o) => o.value === value);
      if (option) {
        selectOption(option);
      } else {
        selectedValue = value;
        selectedOption = null;
        inputValue = value;
        inputEl.value = value;
      }
    },

    setInputValue(text: string): void {
      inputValue = text;
      inputEl.value = text;
      if (clearBtn) clearBtn.hidden = !text;
    },

    open,
    close,

    isOpen(): boolean {
      return isOpenState;
    },

    focus(): void {
      inputEl.focus();
    },

    setOptions(newOptions: ComboboxOption<T>[]): void {
      options = newOptions;
      if (isOpenState) {
        performSearch(inputValue);
      }
    },

    clear(): void {
      clearSelection();
    },

    setDisabled(value: boolean): void {
      disabled = value;
      inputEl.disabled = disabled;
      if (disabled) {
        inputEl.setAttribute(ATTRS.DISABLED, '');
        close();
      } else {
        inputEl.removeAttribute(ATTRS.DISABLED);
      }
    },

    destroy(): void {
      close();
      inputEl.removeEventListener('input', handleInput);
      inputEl.removeEventListener('focus', handleFocus);
      inputEl.removeEventListener('blur', handleBlur);
      inputEl.removeEventListener('keydown', handleKeydown);
      optionsEl.removeEventListener('click', handleOptionsClick);
      clearBtn?.removeEventListener('click', handleClearClick);
      contentEl.remove();
      container.innerHTML = '';
    },
  };
}

// ============================================================================
// Web Component
// ============================================================================

export class AtlasCombobox extends HTMLElement {
  private _combobox: Combobox | null = null;
  private _options: ComboboxOption[] = [];

  static get observedAttributes(): string[] {
    return ['placeholder', 'disabled', 'value', 'min-chars'];
  }

  connectedCallback(): void {
    this._parseOptions();
    this._init();
  }

  disconnectedCallback(): void {
    this._combobox?.destroy();
    this._combobox = null;
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    if (!this._combobox) return;

    switch (name) {
      case 'disabled':
        this._combobox.setDisabled(newValue !== null);
        break;
      case 'value':
        if (newValue) {
          this._combobox.setValue(newValue);
        }
        break;
    }
  }

  private _parseOptions(): void {
    const dataOptions = this.getAttribute('data-options');
    if (dataOptions) {
      try {
        this._options = JSON.parse(dataOptions);
        return;
      } catch {
        console.warn('[AtlasCombobox] Invalid JSON in data-options');
      }
    }

    // Parse from datalist
    const datalistId = this.getAttribute('list');
    if (datalistId) {
      const datalist = document.getElementById(datalistId);
      if (datalist) {
        this._options = Array.from(datalist.querySelectorAll('option')).map((opt) => ({
          value: opt.value,
          label: opt.textContent || opt.value,
        }));
      }
    }
  }

  private _init(): void {
    this._combobox = createCombobox(this, {
      options: this._options,
      placeholder: this.getAttribute('placeholder') || undefined,
      disabled: this.hasAttribute('disabled'),
      value: this.getAttribute('value') || undefined,
      minChars: parseInt(this.getAttribute('min-chars') || '0', 10),
      allowCreate: this.hasAttribute('allow-create'),
      onChange: (value, option) => {
        this.dispatchEvent(
          new CustomEvent('change', {
            detail: { value, option },
            bubbles: true,
          })
        );
      },
      onCreate: (value) => {
        this.dispatchEvent(
          new CustomEvent('create', {
            detail: { value },
            bubbles: true,
          })
        );
      },
    });
  }

  // Public API
  get value(): string {
    return this._combobox?.getValue() || '';
  }

  set value(val: string) {
    this._combobox?.setValue(val);
  }

  get selected(): ComboboxOption | null {
    return this._combobox?.getSelected() || null;
  }

  open(): void {
    this._combobox?.open();
  }

  close(): void {
    this._combobox?.close();
  }

  clear(): void {
    this._combobox?.clear();
  }

  focus(): void {
    this._combobox?.focus();
  }
}

// Register web component
if (isBrowser() && !customElements.get('atlas-combobox')) {
  customElements.define('atlas-combobox', AtlasCombobox);
}
