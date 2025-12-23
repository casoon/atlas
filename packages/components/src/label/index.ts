/**
 * Label Component
 *
 * Accessible form label with proper association and styling.
 *
 * Features:
 * - Automatic for/id association
 * - Required indicator
 * - Optional indicator
 * - Error state styling
 * - Click-to-focus behavior
 *
 * @example
 * ```typescript
 * const label = createLabel(element, {
 *   for: 'email-input',
 *   required: true,
 * });
 *
 * // Mark as having error
 * label.setError(true);
 * ```
 */

import { addListener, isBrowser } from '../shared/dom';

export interface LabelOptions {
  /** ID of the associated input element */
  for?: string;
  /** Show required indicator (default: false) */
  required?: boolean;
  /** Show optional indicator (default: false) */
  optional?: boolean;
  /** Custom required text (default: '*') */
  requiredText?: string;
  /** Custom optional text (default: '(optional)') */
  optionalText?: string;
  /** Initial error state */
  hasError?: boolean;
}

export interface LabelState {
  /** Whether label shows error state */
  readonly hasError: boolean;
  /** Associated input element */
  readonly associatedInput: HTMLElement | null;
  /** Set error state */
  setError: (hasError: boolean) => void;
  /** Set required indicator */
  setRequired: (required: boolean) => void;
  /** Update the associated input */
  setFor: (inputId: string) => void;
  /** Clean up */
  destroy: () => void;
}

export function createLabel(element: HTMLElement, options: LabelOptions = {}): LabelState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopLabelState();
  }

  const {
    for: forId,
    required = false,
    optional = false,
    requiredText = '*',
    optionalText = '(optional)',
    hasError: initialError = false,
  } = options;

  let hasError = initialError;
  let requiredIndicator: HTMLElement | null = null;
  let optionalIndicator: HTMLElement | null = null;
  let associatedInput: HTMLElement | null = null;
  const cleanupListeners: (() => void)[] = [];

  // Apply base class
  element.classList.add('atlas-label');

  // Set for attribute if provided
  if (forId) {
    if (element.tagName.toLowerCase() === 'label') {
      (element as HTMLLabelElement).htmlFor = forId;
    }
    associatedInput = document.getElementById(forId);
  }

  // Add required indicator
  if (required) {
    addRequiredIndicator();
  }

  // Add optional indicator
  if (optional && !required) {
    addOptionalIndicator();
  }

  // Apply initial error state
  if (hasError) {
    element.classList.add('atlas-label-error');
  }

  // Handle click to focus input (for non-label elements)
  if (element.tagName.toLowerCase() !== 'label' && forId) {
    const handleClick = (): void => {
      const input = document.getElementById(forId);
      if (input && 'focus' in input) {
        (input as HTMLElement).focus();
      }
    };

    cleanupListeners.push(addListener(element, 'click', handleClick));
    element.style.cursor = 'pointer';
  }

  function addRequiredIndicator(): void {
    if (requiredIndicator) return;

    requiredIndicator = document.createElement('span');
    requiredIndicator.className = 'atlas-label-required';
    requiredIndicator.textContent = requiredText;
    requiredIndicator.setAttribute('aria-hidden', 'true');
    requiredIndicator.style.cssText = `
      color: hsl(var(--atlas-destructive));
      margin-left: 0.25rem;
    `;
    element.appendChild(requiredIndicator);
  }

  function removeRequiredIndicator(): void {
    if (requiredIndicator) {
      requiredIndicator.remove();
      requiredIndicator = null;
    }
  }

  function addOptionalIndicator(): void {
    if (optionalIndicator) return;

    optionalIndicator = document.createElement('span');
    optionalIndicator.className = 'atlas-label-optional';
    optionalIndicator.textContent = ` ${optionalText}`;
    optionalIndicator.style.cssText = `
      color: hsl(var(--atlas-muted-foreground));
      font-weight: normal;
      font-size: 0.875em;
    `;
    element.appendChild(optionalIndicator);
  }

  function removeOptionalIndicator(): void {
    if (optionalIndicator) {
      optionalIndicator.remove();
      optionalIndicator = null;
    }
  }

  const setError = (error: boolean): void => {
    hasError = error;
    if (error) {
      element.classList.add('atlas-label-error');
    } else {
      element.classList.remove('atlas-label-error');
    }
  };

  const setRequired = (required: boolean): void => {
    if (required) {
      removeOptionalIndicator();
      addRequiredIndicator();
    } else {
      removeRequiredIndicator();
    }
  };

  const setFor = (inputId: string): void => {
    if (element.tagName.toLowerCase() === 'label') {
      (element as HTMLLabelElement).htmlFor = inputId;
    }
    associatedInput = document.getElementById(inputId);
  };

  const destroy = (): void => {
    cleanupListeners.forEach((cleanup) => cleanup());
    removeRequiredIndicator();
    removeOptionalIndicator();
    element.classList.remove('atlas-label', 'atlas-label-error');
  };

  return {
    get hasError() {
      return hasError;
    },
    get associatedInput() {
      return associatedInput;
    },
    setError,
    setRequired,
    setFor,
    destroy,
  };
}

function createNoopLabelState(): LabelState {
  return {
    get hasError() {
      return false;
    },
    get associatedInput() {
      return null;
    },
    setError: () => {},
    setRequired: () => {},
    setFor: () => {},
    destroy: () => {},
  };
}
