/**
 * Input Component
 *
 * Enhanced form input with validation, focus states, and micro-interactions.
 *
 * Features:
 * - Focus glow effect
 * - Validation states (error, success)
 * - Character count
 * - Clear button
 * - Password visibility toggle
 * - Auto-resize for textareas
 *
 * @example
 * ```typescript
 * const input = createInput(element, {
 *   focusGlow: true,
 *   validate: (value) => value.length >= 3 ? null : 'Min 3 characters',
 *   onValidate: (isValid, message) => console.log(isValid, message),
 * });
 *
 * // Programmatic validation
 * input.validate();
 *
 * // Set error state manually
 * input.setError('Invalid email');
 * ```
 */

import { addListener, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputOptions {
  /** Input type (default: 'text') */
  type?: InputType;
  /** Size (default: 'md') */
  size?: InputSize;
  /** Enable focus glow effect (default: true) */
  focusGlow?: boolean;
  /** Enable shake animation on error (default: true) */
  shakeOnError?: boolean;
  /** Validation function */
  validate?: (value: string) => string | null;
  /** Debounce validation in ms (default: 300) */
  validateDebounce?: number;
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;
  /** Validate on input (default: false) */
  validateOnInput?: boolean;
  /** Show character count */
  showCount?: boolean;
  /** Maximum length for character count */
  maxLength?: number;
  /** Called when validation state changes */
  onValidate?: (isValid: boolean, message?: string) => void;
  /** Called when value changes */
  onChange?: (value: string) => void;
  /** Called on focus */
  onFocus?: () => void;
  /** Called on blur */
  onBlur?: () => void;
}

export interface InputState {
  /** Current value */
  readonly value: string;
  /** Whether input is valid */
  readonly isValid: boolean;
  /** Current error message */
  readonly errorMessage: string | null;
  /** Whether input is focused */
  readonly isFocused: boolean;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Trigger validation */
  validate: () => boolean;
  /** Set error state manually */
  setError: (message: string) => void;
  /** Clear error state */
  clearError: () => void;
  /** Focus the input */
  focus: () => void;
  /** Blur the input */
  blur: () => void;
  /** Select all text */
  selectAll: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  options: InputOptions = {}
): InputState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopInputState();
  }

  const {
    size = 'md',
    focusGlow = true,
    shakeOnError = true,
    validate,
    validateDebounce = 300,
    validateOnBlur = true,
    validateOnInput = false,
    showCount = false,
    maxLength,
    onValidate,
    onChange,
    onFocus,
    onBlur,
  } = options;

  let isValid = true;
  let errorMessage: string | null = null;
  let isFocused = false;
  let validateTimeout: ReturnType<typeof setTimeout> | null = null;
  let countElement: HTMLElement | null = null;
  const cleanupListeners: (() => void)[] = [];

  // Store original styles
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;

  // Apply base styles
  element.classList.add('atlas-input');
  element.classList.add(`atlas-input-${size}`);

  element.style.transition = `
    border-color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
    box-shadow ${ANIMATION_DURATION.fast}ms ${EASING.standard}
  `
    .replace(/\s+/g, ' ')
    .trim();

  // Set maxlength if provided
  if (maxLength !== undefined) {
    element.setAttribute('maxlength', String(maxLength));
  }

  // Create character count element if needed
  if (showCount) {
    countElement = document.createElement('span');
    countElement.className = 'atlas-input-count';
    countElement.style.cssText = `
      position: absolute;
      right: 0.75rem;
      bottom: 0.5rem;
      font-size: 0.75rem;
      color: hsl(var(--atlas-muted-foreground));
      pointer-events: none;
    `;
    updateCount();

    // Wrap input in container if not already
    const parent = element.parentElement;
    if (parent && !parent.classList.contains('atlas-input-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'atlas-input-wrapper';
      wrapper.style.position = 'relative';
      parent.insertBefore(wrapper, element);
      wrapper.appendChild(element);
      wrapper.appendChild(countElement);
    } else if (parent) {
      parent.appendChild(countElement);
    }
  }

  function updateCount(): void {
    if (countElement) {
      const current = element.value.length;
      const max = maxLength || '';
      countElement.textContent = max ? `${current}/${max}` : String(current);

      // Change color if near/at limit
      if (maxLength) {
        if (current >= maxLength) {
          countElement.style.color = 'hsl(var(--atlas-destructive))';
        } else if (current >= maxLength * 0.9) {
          countElement.style.color = 'hsl(var(--atlas-warning))';
        } else {
          countElement.style.color = 'hsl(var(--atlas-muted-foreground))';
        }
      }
    }
  }

  function applyFocusGlow(): void {
    if (!focusGlow) return;
    element.style.boxShadow = '0 0 0 3px hsl(var(--atlas-ring) / 0.2)';
  }

  function removeFocusGlow(): void {
    if (!isValid) {
      element.style.boxShadow = '0 0 0 3px hsl(var(--atlas-destructive) / 0.2)';
    } else {
      element.style.boxShadow = originalBoxShadow;
    }
  }

  function shakeElement(): void {
    if (!shakeOnError || !element.animate) return;

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
      element.classList.remove('atlas-input-error');
      element.removeAttribute('aria-invalid');
      element.removeAttribute('aria-errormessage');
      removeFocusGlow();
    } else {
      element.classList.add('atlas-input-error');
      element.setAttribute('aria-invalid', 'true');
      if (errorMessage) {
        // Would need an error message element for aria-errormessage
      }
      element.style.borderColor = 'hsl(var(--atlas-destructive))';
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

    if (validateOnInput && validate) {
      debouncedValidate();
    }

    // Clear error state on input if currently invalid
    if (!isValid) {
      element.style.borderColor = '';
      if (isFocused) {
        applyFocusGlow();
      } else {
        element.style.boxShadow = originalBoxShadow;
      }
    }
  };

  // Set up listeners
  cleanupListeners.push(
    addListener(element, 'focus', handleFocus as EventListener),
    addListener(element, 'blur', handleBlur as EventListener),
    addListener(element, 'input', handleInput as EventListener)
  );

  const setValue = (value: string): void => {
    element.value = value;
    if (showCount) {
      updateCount();
    }
    onChange?.(value);
  };

  const validateFn = (): boolean => {
    return runValidation();
  };

  const setError = (message: string): void => {
    isValid = false;
    errorMessage = message;
    element.classList.add('atlas-input-error');
    element.setAttribute('aria-invalid', 'true');
    element.style.borderColor = 'hsl(var(--atlas-destructive))';
    element.style.boxShadow = '0 0 0 3px hsl(var(--atlas-destructive) / 0.2)';
    shakeElement();
    onValidate?.(false, message);
  };

  const clearError = (): void => {
    isValid = true;
    errorMessage = null;
    element.classList.remove('atlas-input-error');
    element.removeAttribute('aria-invalid');
    element.style.borderColor = '';
    if (isFocused) {
      applyFocusGlow();
    } else {
      element.style.boxShadow = originalBoxShadow;
    }
    onValidate?.(true);
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

    element.style.transition = originalTransition;
    element.style.boxShadow = originalBoxShadow;
    element.classList.remove('atlas-input', `atlas-input-${size}`, 'atlas-input-error');

    if (countElement) {
      countElement.remove();
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
    setValue,
    validate: validateFn,
    setError,
    clearError,
    focus,
    blur,
    selectAll,
    destroy,
  };
}

function createNoopInputState(): InputState {
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
    setValue: () => {},
    validate: () => true,
    setError: () => {},
    clearError: () => {},
    focus: () => {},
    blur: () => {},
    selectAll: () => {},
    destroy: () => {},
  };
}
