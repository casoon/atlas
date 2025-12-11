/**
 * Resolves a target to an HTML element.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @returns The resolved HTMLElement, or null if not found
 *
 * @example
 * ```typescript
 * const el = resolveElement('#my-element');
 * const el2 = resolveElement(document.querySelector('#my-element'));
 * ```
 */
export function resolveElement(target: string | HTMLElement | null): HTMLElement | null {
  if (!target) {
    return null;
  }

  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target);
  }

  return target;
}

/**
 * Type guard to check if an element is valid and exists in the DOM.
 *
 * @param element - The element to check
 * @returns True if the element exists and is connected to the DOM
 */
export function isValidElement(element: HTMLElement | null): element is HTMLElement {
  return element !== null && element.isConnected === true;
}

/**
 * Safely gets an element with error handling.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param errorMessage - Optional custom error message
 * @returns The resolved HTMLElement
 * @throws Error if element is not found
 */
export function getElementOrThrow(
  target: string | HTMLElement,
  errorMessage?: string
): HTMLElement {
  const element = resolveElement(target);

  if (!isValidElement(element)) {
    const selector = typeof target === 'string' ? target : 'provided element';
    throw new Error(errorMessage || `Element not found or not connected to DOM: ${selector}`);
  }

  return element;
}
