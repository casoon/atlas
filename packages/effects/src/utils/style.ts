/**
 * Stores and manages element styles with safe restoration.
 */
export class StyleManager {
  private originalStyles = new Map<HTMLElement, Map<string, string>>();

  /**
   * Saves the current value of a CSS property.
   *
   * @param element - The target element
   * @param property - The CSS property name
   */
  private saveStyle(element: HTMLElement, property: string): void {
    if (!this.originalStyles.has(element)) {
      this.originalStyles.set(element, new Map());
    }

    const elementStyles = this.originalStyles.get(element)!;
    if (!elementStyles.has(property)) {
      const computedValue = element.style.getPropertyValue(property);
      elementStyles.set(property, computedValue);
    }
  }

  /**
   * Sets a CSS property value while preserving the original value.
   *
   * @param element - The target element
   * @param property - The CSS property name
   * @param value - The new value to set
   */
  setStyle(element: HTMLElement, property: string, value: string): void {
    this.saveStyle(element, property);
    element.style.setProperty(property, value);
  }

  /**
   * Sets multiple CSS properties at once.
   *
   * @param element - The target element
   * @param styles - An object of CSS property-value pairs
   */
  setStyles(element: HTMLElement, styles: Record<string, string>): void {
    Object.entries(styles).forEach(([property, value]) => {
      this.setStyle(element, property, value);
    });
  }

  /**
   * Restores all original styles for an element.
   *
   * @param element - The target element
   */
  restore(element: HTMLElement): void {
    const elementStyles = this.originalStyles.get(element);
    if (!elementStyles) return;

    elementStyles.forEach((value, property) => {
      if (value === '') {
        element.style.removeProperty(property);
      } else {
        element.style.setProperty(property, value);
      }
    });

    this.originalStyles.delete(element);
  }

  /**
   * Restores all styles for all managed elements.
   */
  restoreAll(): void {
    this.originalStyles.forEach((_, element) => {
      this.restore(element);
    });
  }

  /**
   * Clears all stored styles without restoring them.
   * Use this if the element has been removed from the DOM.
   */
  clear(element?: HTMLElement): void {
    if (element) {
      this.originalStyles.delete(element);
    } else {
      this.originalStyles.clear();
    }
  }
}

/**
 * Creates a new StyleManager instance for managing element styles.
 *
 * @returns A new StyleManager instance
 *
 * @example
 * ```typescript
 * const styleManager = createStyleManager();
 * styleManager.setStyle(element, 'opacity', '0.5');
 * styleManager.setStyles(element, {
 *   'transform': 'scale(1.1)',
 *   'transition': 'all 0.3s'
 * });
 *
 * // Later, restore original styles:
 * styleManager.restore(element);
 * ```
 */
export function createStyleManager(): StyleManager {
  return new StyleManager();
}

/**
 * Preserves the position style and ensures the element is positioned.
 *
 * @param element - The target element
 * @returns A cleanup function to restore the original position
 */
export function ensurePositioned(element: HTMLElement): () => void {
  const computedStyle = window.getComputedStyle(element);
  const originalPosition = computedStyle.position;

  if (originalPosition === 'static') {
    const originalValue = element.style.position;
    element.style.position = 'relative';

    return () => {
      element.style.position = originalValue;
    };
  }

  return () => {}; // No-op cleanup
}
