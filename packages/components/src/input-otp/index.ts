/**
 * Input OTP Component
 *
 * OTP/PIN input with individual digit boxes and smooth focus transitions.
 *
 * Features:
 * - Individual digit boxes with auto-advance
 * - Paste support for full OTP codes
 * - Keyboard navigation (arrows, backspace)
 * - Masked input option for security
 * - Configurable length and separator
 * - Auto-submit on completion
 *
 * @example
 * ```typescript
 * const otp = createInputOtp(element, {
 *   length: 6,
 *   onComplete: (value) => console.log('OTP entered:', value),
 *   onChange: (value) => console.log('Current:', value),
 * });
 *
 * // Get current value
 * console.log(otp.value);
 *
 * // Focus first input
 * otp.focus();
 *
 * // Clear all inputs
 * otp.clear();
 * ```
 */

import { generateId } from '../shared/aria';
import { addListener, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export type InputOtpType = 'numeric' | 'alphanumeric' | 'alphabetic';

export interface InputOtpOptions {
  /** Number of digits/characters (default: 6) */
  length?: number;
  /** Input type constraint (default: 'numeric') */
  type?: InputOtpType;
  /** Mask input like password (default: false) */
  masked?: boolean;
  /** Disabled state (default: false) */
  disabled?: boolean;
  /** Show separator after specific positions (e.g., [3] for 6-digit OTP) */
  separatorAfter?: number[];
  /** Separator character (default: '-') */
  separatorChar?: string;
  /** Auto-focus first input on mount (default: true) */
  autoFocus?: boolean;
  /** Form input name */
  name?: string;
  /** Placeholder character (default: '○') */
  placeholder?: string;
  /** Called when value changes */
  onChange?: (value: string) => void;
  /** Called when all digits are entered */
  onComplete?: (value: string) => void;
  /** Called on focus */
  onFocus?: () => void;
  /** Called on blur */
  onBlur?: () => void;
}

export interface InputOtpState {
  /** Current OTP value */
  readonly value: string;
  /** Whether OTP is complete */
  readonly isComplete: boolean;
  /** Whether input is disabled */
  readonly isDisabled: boolean;
  /** Whether input is focused */
  readonly isFocused: boolean;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Clear all inputs */
  clear: () => void;
  /** Focus the first empty input or first input */
  focus: () => void;
  /** Blur the input */
  blur: () => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Set error state */
  setError: (hasError: boolean) => void;
  /** Clean up */
  destroy: () => void;
}

export function createInputOtp(element: HTMLElement, options: InputOtpOptions = {}): InputOtpState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopInputOtpState();
  }

  const {
    length = 6,
    type = 'numeric',
    masked = false,
    disabled: initialDisabled = false,
    separatorAfter = [],
    separatorChar = '-',
    autoFocus = true,
    name,
    placeholder = '○',
    onChange,
    onComplete,
    onFocus,
    onBlur,
  } = options;

  const id = generateId('otp');
  let values: string[] = new Array(length).fill('');
  let isDisabled = initialDisabled;
  let isFocused = false;
  let hasError = false;
  const inputs: HTMLInputElement[] = [];
  const cleanupListeners: (() => void)[] = [];

  // Build regex pattern based on type
  const getPattern = (): RegExp => {
    switch (type) {
      case 'numeric':
        return /^[0-9]$/;
      case 'alphabetic':
        return /^[a-zA-Z]$/;
      case 'alphanumeric':
        return /^[a-zA-Z0-9]$/;
      default:
        return /^[0-9]$/;
    }
  };

  const pattern = getPattern();

  // Create input structure
  function createStructure(): void {
    element.innerHTML = '';
    element.classList.add('atlas-input-otp');
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', `OTP input with ${length} characters`);
    element.setAttribute('data-atlas-input-otp', '');

    element.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
    `;

    // Create hidden input for form submission
    if (name) {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = name;
      hiddenInput.id = `${id}-hidden`;
      element.appendChild(hiddenInput);
    }

    for (let i = 0; i < length; i++) {
      // Create input container
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'atlas-input-otp-slot';
      inputWrapper.style.cssText = `
        position: relative;
        width: 40px;
        height: 48px;
      `;

      // Create input
      const input = document.createElement('input');
      input.type = masked ? 'password' : 'text';
      input.inputMode = type === 'numeric' ? 'numeric' : 'text';
      input.maxLength = 1;
      input.className = 'atlas-input-otp-input';
      input.id = `${id}-${i}`;
      input.setAttribute('aria-label', `Character ${i + 1} of ${length}`);
      input.setAttribute('autocomplete', 'one-time-code');
      input.placeholder = placeholder;
      input.disabled = isDisabled;

      input.style.cssText = `
        width: 100%;
        height: 100%;
        text-align: center;
        font-size: 1.25rem;
        font-weight: 600;
        border: 2px solid var(--atlas-border, hsl(214.3 31.8% 91.4%));
        border-radius: 8px;
        background: var(--atlas-background, hsl(0 0% 100%));
        color: var(--atlas-foreground, hsl(222.2 84% 4.9%));
        outline: none;
        transition: border-color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
                    box-shadow ${ANIMATION_DURATION.fast}ms ${EASING.standard},
                    transform ${ANIMATION_DURATION.fast}ms ${EASING.standard};
      `;

      inputs.push(input);
      inputWrapper.appendChild(input);
      element.appendChild(inputWrapper);

      // Add separator if needed
      if (separatorAfter.includes(i + 1) && i < length - 1) {
        const separator = document.createElement('span');
        separator.className = 'atlas-input-otp-separator';
        separator.textContent = separatorChar;
        separator.style.cssText = `
          color: var(--atlas-muted-foreground, hsl(215.4 16.3% 46.9%));
          font-size: 1.25rem;
          user-select: none;
        `;
        element.appendChild(separator);
      }

      // Set up event listeners for this input
      setupInputListeners(input, i);
    }

    // Auto-focus first input
    if (autoFocus && !isDisabled) {
      requestAnimationFrame(() => {
        inputs[0]?.focus();
      });
    }
  }

  function setupInputListeners(input: HTMLInputElement, index: number): void {
    // Handle input
    cleanupListeners.push(
      addListener(input, 'input', ((e: Event) => {
        const inputEvent = e as InputEvent;
        const value = input.value;

        // Handle paste in input event (some browsers)
        if (inputEvent.inputType === 'insertFromPaste') {
          return; // Handled by paste event
        }

        if (value && !pattern.test(value)) {
          input.value = values[index];
          shakeInput(input);
          return;
        }

        values[index] = value;
        updateHiddenInput();
        onChange?.(getValue());

        // Auto-advance to next input
        if (value && index < length - 1) {
          inputs[index + 1].focus();
        }

        // Check completion
        checkCompletion();
      }) as EventListener)
    );

    // Handle keydown for navigation
    cleanupListeners.push(
      addListener(input, 'keydown', ((e: KeyboardEvent) => {
        switch (e.key) {
          case 'Backspace':
            if (!input.value && index > 0) {
              e.preventDefault();
              inputs[index - 1].focus();
              inputs[index - 1].value = '';
              values[index - 1] = '';
              updateHiddenInput();
              onChange?.(getValue());
            } else if (input.value) {
              values[index] = '';
              updateHiddenInput();
              onChange?.(getValue());
            }
            break;

          case 'Delete':
            values[index] = '';
            input.value = '';
            updateHiddenInput();
            onChange?.(getValue());
            break;

          case 'ArrowLeft':
            e.preventDefault();
            if (index > 0) {
              inputs[index - 1].focus();
            }
            break;

          case 'ArrowRight':
            e.preventDefault();
            if (index < length - 1) {
              inputs[index + 1].focus();
            }
            break;

          case 'Home':
            e.preventDefault();
            inputs[0].focus();
            break;

          case 'End':
            e.preventDefault();
            inputs[length - 1].focus();
            break;
        }
      }) as EventListener)
    );

    // Handle paste
    cleanupListeners.push(
      addListener(input, 'paste', ((e: ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData?.getData('text') || '';
        handlePaste(pastedData, index);
      }) as EventListener)
    );

    // Handle focus
    cleanupListeners.push(
      addListener(input, 'focus', (() => {
        isFocused = true;
        input.style.borderColor = 'var(--atlas-ring, hsl(215 20.2% 65.1%))';
        input.style.boxShadow = '0 0 0 3px hsl(var(--atlas-ring) / 0.2)';
        input.style.transform = 'scale(1.05)';
        input.select();
        onFocus?.();
      }) as EventListener)
    );

    // Handle blur
    cleanupListeners.push(
      addListener(input, 'blur', (() => {
        // Check if focus moved to another OTP input
        requestAnimationFrame(() => {
          const activeElement = document.activeElement;
          const stillFocused = inputs.some((inp) => inp === activeElement);

          if (!stillFocused) {
            isFocused = false;
            onBlur?.();
          }
        });

        input.style.borderColor = hasError
          ? 'var(--atlas-destructive, hsl(0 84.2% 60.2%))'
          : 'var(--atlas-border, hsl(214.3 31.8% 91.4%))';
        input.style.boxShadow = hasError ? '0 0 0 3px hsl(var(--atlas-destructive) / 0.2)' : 'none';
        input.style.transform = 'scale(1)';
      }) as EventListener)
    );
  }

  function handlePaste(data: string, startIndex: number): void {
    // Filter characters based on type
    const validChars = data.split('').filter((char) => pattern.test(char));

    // Fill inputs starting from current position
    for (let i = 0; i < validChars.length && startIndex + i < length; i++) {
      const idx = startIndex + i;
      values[idx] = validChars[i];
      inputs[idx].value = validChars[i];
    }

    updateHiddenInput();
    onChange?.(getValue());

    // Focus next empty input or last filled
    const nextEmptyIndex = values.findIndex((v) => !v);
    if (nextEmptyIndex !== -1) {
      inputs[nextEmptyIndex].focus();
    } else {
      inputs[length - 1].focus();
    }

    checkCompletion();
  }

  function shakeInput(input: HTMLInputElement): void {
    if (!input.animate) return;

    input.animate(
      [
        { transform: 'translateX(0) scale(1.05)' },
        { transform: 'translateX(-3px) scale(1.05)' },
        { transform: 'translateX(3px) scale(1.05)' },
        { transform: 'translateX(-3px) scale(1.05)' },
        { transform: 'translateX(0) scale(1.05)' },
      ],
      {
        duration: 300,
        easing: 'ease-in-out',
      }
    );
  }

  function getValue(): string {
    return values.join('');
  }

  function updateHiddenInput(): void {
    if (name) {
      const hiddenInput = element.querySelector<HTMLInputElement>(`#${id}-hidden`);
      if (hiddenInput) {
        hiddenInput.value = getValue();
      }
    }
  }

  function checkCompletion(): void {
    const value = getValue();
    if (value.length === length && values.every((v) => v)) {
      onComplete?.(value);
    }
  }

  function updateDisabledState(): void {
    inputs.forEach((input) => {
      input.disabled = isDisabled;
      if (isDisabled) {
        input.style.opacity = '0.5';
        input.style.cursor = 'not-allowed';
      } else {
        input.style.opacity = '1';
        input.style.cursor = 'text';
      }
    });

    if (isDisabled) {
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.removeAttribute('aria-disabled');
    }
  }

  function updateErrorState(): void {
    inputs.forEach((input) => {
      if (hasError) {
        input.style.borderColor = 'var(--atlas-destructive, hsl(0 84.2% 60.2%))';
        if (document.activeElement !== input) {
          input.style.boxShadow = '0 0 0 3px hsl(var(--atlas-destructive) / 0.2)';
        }
      } else {
        input.style.borderColor = 'var(--atlas-border, hsl(214.3 31.8% 91.4%))';
        if (document.activeElement !== input) {
          input.style.boxShadow = 'none';
        }
      }
    });

    if (hasError) {
      element.setAttribute('aria-invalid', 'true');
    } else {
      element.removeAttribute('aria-invalid');
    }
  }

  // Initialize
  createStructure();

  // Public API
  const setValue = (value: string): void => {
    const chars = value.split('').slice(0, length);
    values = new Array(length).fill('');

    chars.forEach((char, i) => {
      if (pattern.test(char)) {
        values[i] = char;
        inputs[i].value = char;
      }
    });

    updateHiddenInput();
    onChange?.(getValue());
    checkCompletion();
  };

  const clear = (): void => {
    values = new Array(length).fill('');
    inputs.forEach((input) => {
      input.value = '';
    });
    updateHiddenInput();
    onChange?.('');
    inputs[0]?.focus();
  };

  const focus = (): void => {
    const firstEmptyIndex = values.findIndex((v) => !v);
    const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
    inputs[targetIndex]?.focus();
  };

  const blur = (): void => {
    inputs.forEach((input) => input.blur());
  };

  const setDisabled = (disabled: boolean): void => {
    isDisabled = disabled;
    updateDisabledState();
  };

  const setError = (error: boolean): void => {
    hasError = error;
    updateErrorState();

    if (error) {
      // Shake all inputs
      inputs.forEach((input) => shakeInput(input));
    }
  };

  const destroy = (): void => {
    cleanupListeners.forEach((cleanup) => cleanup());
    element.innerHTML = '';
    element.classList.remove('atlas-input-otp');
    element.removeAttribute('role');
    element.removeAttribute('aria-label');
    element.removeAttribute('aria-disabled');
    element.removeAttribute('aria-invalid');
    element.removeAttribute('data-atlas-input-otp');
    element.style.cssText = '';
  };

  return {
    get value() {
      return getValue();
    },
    get isComplete() {
      return getValue().length === length && values.every((v) => v);
    },
    get isDisabled() {
      return isDisabled;
    },
    get isFocused() {
      return isFocused;
    },
    setValue,
    clear,
    focus,
    blur,
    setDisabled,
    setError,
    destroy,
  };
}

function createNoopInputOtpState(): InputOtpState {
  return {
    get value() {
      return '';
    },
    get isComplete() {
      return false;
    },
    get isDisabled() {
      return false;
    },
    get isFocused() {
      return false;
    },
    setValue: () => {},
    clear: () => {},
    focus: () => {},
    blur: () => {},
    setDisabled: () => {},
    setError: () => {},
    destroy: () => {},
  };
}

/**
 * Auto-initialize all OTP inputs with data-atlas-input-otp attribute
 */
export function initInputOtps(
  root: Document | HTMLElement = document
): Map<HTMLElement, InputOtpState> {
  const instances = new Map<HTMLElement, InputOtpState>();

  if (!isBrowser()) return instances;

  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-input-otp]');

  elements.forEach((element) => {
    // Skip if already initialized
    if (element.querySelector('.atlas-input-otp-input')) return;

    const options: InputOtpOptions = {
      length: parseInt(element.dataset.length || '6', 10),
      type: (element.dataset.type as InputOtpType) || 'numeric',
      masked: element.dataset.masked === 'true',
      disabled: element.dataset.disabled === 'true',
      separatorAfter: element.dataset.separatorAfter
        ? element.dataset.separatorAfter.split(',').map(Number)
        : [],
      separatorChar: element.dataset.separatorChar || '-',
      autoFocus: element.dataset.autoFocus !== 'false',
      name: element.dataset.name,
      placeholder: element.dataset.placeholder || '○',
    };

    const instance = createInputOtp(element, options);
    instances.set(element, instance);
  });

  return instances;
}
