/**
 * Separator Component
 *
 * A visual divider for separating content sections.
 * Supports horizontal and vertical orientations with proper ARIA.
 *
 * @example
 * ```typescript
 * const separator = createSeparator(element, {
 *   orientation: 'horizontal',
 *   decorative: true,
 * });
 *
 * // Change orientation
 * separator.setOrientation('vertical');
 * ```
 */

import { isBrowser } from '../shared/dom';

export type SeparatorOrientation = 'horizontal' | 'vertical';

export interface SeparatorOptions {
  /** Orientation (default: 'horizontal') */
  orientation?: SeparatorOrientation;
  /** Whether separator is purely decorative (default: true) */
  decorative?: boolean;
  /** Custom label for non-decorative separators */
  label?: string;
}

export interface SeparatorState {
  /** Current orientation */
  readonly orientation: SeparatorOrientation;
  /** Set orientation */
  setOrientation: (orientation: SeparatorOrientation) => void;
  /** Clean up */
  destroy: () => void;
}

export function createSeparator(
  element: HTMLElement,
  options: SeparatorOptions = {}
): SeparatorState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopSeparatorState();
  }

  const { orientation: initialOrientation = 'horizontal', decorative = true, label } = options;

  let orientation = initialOrientation;

  // Apply base class
  element.classList.add('atlas-separator');
  applyOrientation(orientation);

  // Set ARIA attributes
  if (decorative) {
    element.setAttribute('role', 'none');
    element.setAttribute('aria-hidden', 'true');
  } else {
    element.setAttribute('role', 'separator');
    element.setAttribute('aria-orientation', orientation);
    if (label) {
      element.setAttribute('aria-label', label);
    }
  }

  function applyOrientation(orient: SeparatorOrientation): void {
    element.classList.remove('atlas-separator-horizontal', 'atlas-separator-vertical');
    element.classList.add(`atlas-separator-${orient}`);

    if (!decorative) {
      element.setAttribute('aria-orientation', orient);
    }

    // Apply dimension styles
    if (orient === 'horizontal') {
      element.style.height = '1px';
      element.style.width = '100%';
    } else {
      element.style.width = '1px';
      element.style.height = '100%';
    }
  }

  const setOrientation = (newOrientation: SeparatorOrientation): void => {
    orientation = newOrientation;
    applyOrientation(orientation);
  };

  const destroy = (): void => {
    element.classList.remove(
      'atlas-separator',
      'atlas-separator-horizontal',
      'atlas-separator-vertical'
    );
    element.removeAttribute('role');
    element.removeAttribute('aria-hidden');
    element.removeAttribute('aria-orientation');
    element.removeAttribute('aria-label');
    element.style.width = '';
    element.style.height = '';
  };

  return {
    get orientation() {
      return orientation;
    },
    setOrientation,
    destroy,
  };
}

function createNoopSeparatorState(): SeparatorState {
  return {
    get orientation(): SeparatorOrientation {
      return 'horizontal';
    },
    setOrientation: () => {},
    destroy: () => {},
  };
}
