/**
 * Textarea Component
 *
 * Multi-line text input with auto-resize and character count.
 *
 * Features:
 * - Auto-resize based on content
 * - Character count with limit
 * - Validation states
 * - Focus glow effect
 * - Min/max height constraints
 *
 * @example
 * ```typescript
 * const textarea = createTextarea(element, {
 *   autoResize: true,
 *   maxLength: 500,
 *   showCount: true,
 *   onChange: (value) => console.log('Value:', value),
 * });
 *
 * // Set value programmatically
 * textarea.setValue('Hello world');
 *
 * // Validate
 * textarea.validate();
 * ```
 */

import { generateId } from '../shared/aria';
import { addListener, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export type TextareaSize = 'sm' | 'md' | 'lg';

export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both' | 'auto';

export interface TextareaOptions {
  /** Size (default: 'md') */
  size?: TextareaSize;
  /** Enable auto-resize based on content (default: false) */
  autoResize?: boolean;
  /** Resize behavior when not auto (default: 'vertical') */
  resize?: TextareaResize;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Initial rows (default: 3) */
  rows?: number;
  /** Maximum character length */
  maxLength?: number;
  /** Show character count (default: false) */
  showCount?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state (default: false) */
  disabled?: boolean;
  /** Read-only state (default: false) */
  readOnly?: boolean;
  /** Enable focus glow effect (default: true) */
  focusGlow?: boolean;
  /** Validation function */
  validate?: (value: string) => string | null;
  /** Debounce validation in ms (default: 300) */
  validateDebounce?: number;
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;
  /** Validate on input (default: false) */
  validateOnInput?: boolean;
  /** Form input name */
  name?: string;
  /** Called when value changes */
  onChange?: (value: string) => void;
  /** Called when validation state changes */
  onValidate?: (isValid: boolean, message?: string) => void;
  /** Called on focus */
  onFocus?: () => void;
  /** Called on blur */
  onBlur?: () => void;
}

export interface TextareaState {
  /** Current value */
  readonly value: string;
  /** Whether textarea is valid */
  readonly isValid: boolean;
  /** Current error message */
  readonly errorMessage: string | null;
  /** Whether textarea is focused */
  readonly isFocused: boolean;
  /** Whether textarea is disabled */
  readonly isDisabled: boolean;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Trigger validation */
  validate: () => boolean;
  /** Set error state manually */
  setError: (message: string) => void;
  /** Clear error state */
  clearError: () => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Focus the textarea */
  focus: () => void;
  /** Blur the textarea */
  blur: () => void;
  /** Select all text */
  selectAll: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createTextarea(
  element: HTMLTextAreaElement,
  options: TextareaOptions = {}
): TextareaState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopTextareaState();
  }

  const {
    size = 'md',
    autoResize = false,
    resize = 'vertical',
    minHeight,
    maxHeight,
    rows = 3,
    maxLength,
    showCount = false,
    placeholder,
    disabled: initialDisabled = false,
    readOnly = false,
    focusGlow = true,
    validate,
    validateDebounce = 300,
    validateOnBlur = true,
    validateOnInput = false,
    name,
    onChange,
    onValidate,
    onFocus,
    onBlur,
  } = options;

  const id = generateId('textarea');
  let isValid = true;
  let errorMessage: string | null = null;
  let isFocused = false;
  let isDisabled = initialDisabled;
  let validateTimeout: ReturnType<typeof setTimeout> | null = null;
  let countElement: HTMLElement | null = null;
  let wrapper: HTMLElement | null = null;
  const cleanupListeners: (() => void)[] = [];

  // Store original styles
  const originalStyles = {
    transition: element.style.transition,
    boxShadow: element.style.boxShadow,
    resize: element.style.resize,
    overflow: element.style.overflow,
  };

  // Apply base styles and classes
  element.classList.add('atlas-textarea', `atlas-textarea-${size}`);
  element.setAttribute('data-atlas-textarea', '');

  if (!element.id) {
    element.id = id;
  }

  // Set attributes
  element.rows = rows;
  if (name) element.name = name;
  if (placeholder) element.placeholder = placeholder;
  if (maxLength !== undefined) element.maxLength = maxLength;
  if (readOnly) element.readOnly = true;
  element.disabled = isDisabled;

  // Apply styles
  const sizeStyles: Record<TextareaSize, { fontSize: string; padding: string }> = {
    sm: { fontSize: '0.875rem', padding: '0.5rem 0.75rem' },
    md: { fontSize: '1rem', padding: '0.625rem 0.875rem' },
    lg: { fontSize: '1.125rem', padding: '0.75rem 1rem' },
  };

  const { fontSize, padding } = sizeStyles[size];

  element.style.cssText = `
    width: 100%;
    font-size: ${fontSize};
    padding: ${padding};
    border: 1px solid var(--atlas-border, hsl(214.3 31.8% 91.4%));
    border-radius: 6px;
    background: var(--atlas-background, hsl(0 0% 100%));
    color: var(--atlas-foreground, hsl(222.2 84% 4.9%));
    outline: none;
    font-family: inherit;
    line-height: 1.5;
    resize: ${autoResize ? 'none' : resize};
    transition: border-color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
                box-shadow ${ANIMATION_DURATION.fast}ms ${EASING.standard};
  `;

  if (minHeight) {
    element.style.minHeight = `${minHeight}px`;
  }

  if (maxHeight) {
    element.style.maxHeight = `${maxHeight}px`;
  }

  // Create wrapper for count element
  if (showCount) {
    const parent = element.parentElement;
    if (parent && !parent.classList.contains('atlas-textarea-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.className = 'atlas-textarea-wrapper';
      wrapper.style.cssText = 'position: relative; width: 100%;';
      parent.insertBefore(wrapper, element);
      wrapper.appendChild(element);
    } else {
      wrapper = parent;
    }

    // Create count element
    countElement = document.createElement('span');
    countElement.className = 'atlas-textarea-count';
    countElement.style.cssText = `
      position: absolute;
      right: 0.75rem;
      bottom: 0.5rem;
      font-size: 0.75rem;
      color: var(--atlas-muted-foreground, hsl(215.4 16.3% 46.9%));
      pointer-events: none;
      background: var(--atlas-background, hsl(0 0% 100%));
      padding: 0 0.25rem;
    `;
    updateCount();
    wrapper?.appendChild(countElement);
  }

  // Auto-resize functionality
  function adjustHeight(): void {
    if (!autoResize) return;

    // Reset height to auto to get proper scrollHeight
    element.style.height = 'auto';

    // Calculate new height
    let newHeight = element.scrollHeight;

    // Apply constraints
    if (minHeight && newHeight < minHeight) {
      newHeight = minHeight;
    }
    if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
      element.style.overflowY = 'auto';
    } else {
      element.style.overflowY = 'hidden';
    }

    element.style.height = `${newHeight}px`;
  }

  function updateCount(): void {
    if (!countElement) return;

    const current = element.value.length;
    const max = maxLength;
    countElement.textContent = max ? `${current}/${max}` : String(current);

    // Change color based on limit
    if (max) {
      if (current >= max) {
        countElement.style.color = 'var(--atlas-destructive, hsl(0 84.2% 60.2%))';
      } else if (current >= max * 0.9) {
        countElement.style.color = 'var(--atlas-warning, hsl(38 92% 50%))';
      } else {
        countElement.style.color = 'var(--atlas-muted-foreground, hsl(215.4 16.3% 46.9%))';
      }
    }
  }

  function applyFocusGlow(): void {
    if (!focusGlow) return;
    element.style.borderColor = 'var(--atlas-ring, hsl(215 20.2% 65.1%))';
    element.style.boxShadow = '0 0 0 3px hsl(var(--atlas-ring) / 0.2)';
  }

  function removeFocusGlow(): void {
    if (!isValid) {
      element.style.borderColor = 'var(--atlas-destructive, hsl(0 84.2% 60.2%))';
      element.style.boxShadow = '0 0 0 3px hsl(var(--atlas-destructive) / 0.2)';
    } else {
      element.style.borderColor = 'var(--atlas-border, hsl(214.3 31.8% 91.4%))';
      element.style.boxShadow = 'none';
    }
  }

  function shakeElement(): void {
    if (!element.animate) return;

    element.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ],
      {
        duration: 400,
        easing: 'ease-in-out',
      }
    );
  }

  function runValidation(): boolean {
    if (!validate) {
      isValid = true;
      errorMessage = null;
      return true;
    }

    const result = validate(element.value);
    isValid = result === null;
    errorMessage = result;

    if (isValid) {
      element.classList.remove('atlas-textarea-error');
      element.removeAttribute('aria-invalid');
      removeFocusGlow();
    } else {
      element.classList.add('atlas-textarea-error');
      element.setAttribute('aria-invalid', 'true');
      element.style.borderColor = 'var(--atlas-destructive, hsl(0 84.2% 60.2%))';
      element.style.boxShadow = '0 0 0 3px hsl(var(--atlas-destructive) / 0.2)';
      shakeElement();
    }

    onValidate?.(isValid, errorMessage || undefined);
    return isValid;
  }

  function debouncedValidate(): void {
    if (validateTimeout) {
      clearTimeout(validateTimeout);
    }
    validateTimeout = setTimeout(() => {
      runValidation();
    }, validateDebounce);
  }

  // Event handlers
  const handleFocus = (): void => {
    isFocused = true;
    applyFocusGlow();
    onFocus?.();
  };

  const handleBlur = (): void => {
    isFocused = false;
    removeFocusGlow();

    if (validateOnBlur && validate) {
      runValidation();
    }

    onBlur?.();
  };

  const handleInput = (): void => {
    onChange?.(element.value);

    if (showCount) {
      updateCount();
    }

    if (autoResize) {
      adjustHeight();
    }

    if (validateOnInput && validate) {
      debouncedValidate();
    }

    // Clear error state on input if currently invalid
    if (!isValid && element.value) {
      element.classList.remove('atlas-textarea-error');
      if (isFocused) {
        applyFocusGlow();
      } else {
        element.style.borderColor = 'var(--atlas-border, hsl(214.3 31.8% 91.4%))';
        element.style.boxShadow = 'none';
      }
    }
  };

  // Set up listeners
  cleanupListeners.push(
    addListener(element, 'focus', handleFocus as EventListener),
    addListener(element, 'blur', handleBlur as EventListener),
    addListener(element, 'input', handleInput as EventListener)
  );

  // Initial auto-resize
  if (autoResize) {
    requestAnimationFrame(adjustHeight);
  }

  // Public API
  const setValue = (value: string): void => {
    element.value = value;

    if (showCount) {
      updateCount();
    }

    if (autoResize) {
      adjustHeight();
    }

    onChange?.(value);
  };

  const validateFn = (): boolean => {
    return runValidation();
  };

  const setError = (message: string): void => {
    isValid = false;
    errorMessage = message;
    element.classList.add('atlas-textarea-error');
    element.setAttribute('aria-invalid', 'true');
    element.style.borderColor = 'var(--atlas-destructive, hsl(0 84.2% 60.2%))';
    element.style.boxShadow = '0 0 0 3px hsl(var(--atlas-destructive) / 0.2)';
    shakeElement();
    onValidate?.(false, message);
  };

  const clearError = (): void => {
    isValid = true;
    errorMessage = null;
    element.classList.remove('atlas-textarea-error');
    element.removeAttribute('aria-invalid');
    if (isFocused) {
      applyFocusGlow();
    } else {
      element.style.borderColor = 'var(--atlas-border, hsl(214.3 31.8% 91.4%))';
      element.style.boxShadow = 'none';
    }
    onValidate?.(true);
  };

  const setDisabled = (disabled: boolean): void => {
    isDisabled = disabled;
    element.disabled = disabled;

    if (disabled) {
      element.style.opacity = '0.5';
      element.style.cursor = 'not-allowed';
    } else {
      element.style.opacity = '1';
      element.style.cursor = 'text';
    }
  };

  const focus = (): void => {
    element.focus();
  };

  const blur = (): void => {
    element.blur();
  };

  const selectAll = (): void => {
    element.select();
  };

  const destroy = (): void => {
    if (validateTimeout) {
      clearTimeout(validateTimeout);
    }

    cleanupListeners.forEach((cleanup) => cleanup());

    // Restore original styles
    element.style.transition = originalStyles.transition;
    element.style.boxShadow = originalStyles.boxShadow;
    element.style.resize = originalStyles.resize;
    element.style.overflow = originalStyles.overflow;

    element.classList.remove('atlas-textarea', `atlas-textarea-${size}`, 'atlas-textarea-error');
    element.removeAttribute('data-atlas-textarea');
    element.removeAttribute('aria-invalid');

    // Remove count element
    if (countElement) {
      countElement.remove();
    }

    // Unwrap if we created the wrapper
    if (wrapper?.classList.contains('atlas-textarea-wrapper')) {
      const parent = wrapper.parentElement;
      if (parent) {
        parent.insertBefore(element, wrapper);
        wrapper.remove();
      }
    }
  };

  return {
    get value() {
      return element.value;
    },
    get isValid() {
      return isValid;
    },
    get errorMessage() {
      return errorMessage;
    },
    get isFocused() {
      return isFocused;
    },
    get isDisabled() {
      return isDisabled;
    },
    setValue,
    validate: validateFn,
    setError,
    clearError,
    setDisabled,
    focus,
    blur,
    selectAll,
    destroy,
  };
}

function createNoopTextareaState(): TextareaState {
  return {
    get value() {
      return '';
    },
    get isValid() {
      return true;
    },
    get errorMessage() {
      return null;
    },
    get isFocused() {
      return false;
    },
    get isDisabled() {
      return false;
    },
    setValue: () => {},
    validate: () => true,
    setError: () => {},
    clearError: () => {},
    setDisabled: () => {},
    focus: () => {},
    blur: () => {},
    selectAll: () => {},
    destroy: () => {},
  };
}

/**
 * Auto-initialize all textareas with data-atlas-textarea attribute
 */
export function initTextareas(
  root: Document | HTMLElement = document
): Map<HTMLTextAreaElement, TextareaState> {
  const instances = new Map<HTMLTextAreaElement, TextareaState>();

  if (!isBrowser()) return instances;

  const elements = root.querySelectorAll<HTMLTextAreaElement>('textarea[data-atlas-textarea]');

  elements.forEach((element) => {
    // Skip if already initialized
    if (element.classList.contains('atlas-textarea')) return;

    const options: TextareaOptions = {
      size: (element.dataset.size as TextareaSize) || 'md',
      autoResize: element.dataset.autoResize === 'true',
      resize: (element.dataset.resize as TextareaResize) || 'vertical',
      minHeight: element.dataset.minHeight ? parseInt(element.dataset.minHeight, 10) : undefined,
      maxHeight: element.dataset.maxHeight ? parseInt(element.dataset.maxHeight, 10) : undefined,
      rows: element.dataset.rows ? parseInt(element.dataset.rows, 10) : 3,
      maxLength: element.dataset.maxLength ? parseInt(element.dataset.maxLength, 10) : undefined,
      showCount: element.dataset.showCount === 'true',
      placeholder: element.dataset.placeholder || element.placeholder,
      disabled: element.disabled,
      readOnly: element.readOnly,
      focusGlow: element.dataset.focusGlow !== 'false',
      name: element.name || element.dataset.name,
    };

    const instance = createTextarea(element, options);
    instances.set(element, instance);
  });

  return instances;
}
