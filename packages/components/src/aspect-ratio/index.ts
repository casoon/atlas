/**
 * @fileoverview Aspect Ratio component - maintains aspect ratio for content
 * @module @atlas/components/aspect-ratio
 */

import { generateId } from '../shared/aria.js';
import { isBrowser } from '../shared/dom.js';

// ============================================================================
// Types
// ============================================================================

export interface AspectRatioOptions {
  /** Aspect ratio (e.g., "16/9", "4/3", "1/1", or number like 1.777) */
  ratio?: string | number;
}

export interface AspectRatio {
  /** Root element */
  readonly element: HTMLElement;
  /** Set aspect ratio */
  setRatio: (ratio: string | number) => void;
  /** Get current ratio */
  getRatio: () => string;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CLASSES = {
  ROOT: 'atlas-aspect-ratio',
  CONTENT: 'atlas-aspect-ratio-content',
} as const;

const ATTRS = {
  ROOT: 'data-atlas-aspect-ratio',
  CONTENT: 'data-atlas-aspect-ratio-content',
} as const;

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates an Aspect Ratio instance
 */
export function createAspectRatio(
  element: HTMLElement,
  options: AspectRatioOptions = {}
): AspectRatio {
  if (!isBrowser()) {
    return createServerAspectRatio(element);
  }

  const { ratio: initialRatio = '1/1' } = options;

  // State
  let currentRatio = normalizeRatio(initialRatio);

  // Elements
  const id = generateId('aspect-ratio');
  let contentEl: HTMLElement | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');
    element.id = id;

    // Wrap existing content
    const existingContent = Array.from(element.childNodes);

    contentEl = document.createElement('div');
    contentEl.className = CLASSES.CONTENT;
    contentEl.setAttribute(ATTRS.CONTENT, '');

    existingContent.forEach((child) => {
      contentEl?.appendChild(child);
    });

    element.appendChild(contentEl);

    applyRatio();
  }

  function normalizeRatio(ratio: string | number): string {
    if (typeof ratio === 'number') {
      // Convert decimal to fraction approximation
      return `${ratio}/1`;
    }
    return ratio;
  }

  function applyRatio(): void {
    element.style.aspectRatio = currentRatio;
  }

  function setRatio(ratio: string | number): void {
    currentRatio = normalizeRatio(ratio);
    element.setAttribute('data-ratio', currentRatio);
    applyRatio();
  }

  function getRatio(): string {
    return currentRatio;
  }

  function destroy(): void {
    // Unwrap content
    if (contentEl) {
      const children = Array.from(contentEl.childNodes);
      children.forEach((child) => {
        element.appendChild(child);
      });
      contentEl.remove();
    }

    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute(ATTRS.ROOT);
    element.style.aspectRatio = '';
  }

  // Initialize
  init();

  return {
    element,
    setRatio,
    getRatio,
    destroy,
  };
}

// ============================================================================
// Server-side stub
// ============================================================================

function createServerAspectRatio(element: HTMLElement): AspectRatio {
  return {
    element,
    setRatio: () => {},
    getRatio: () => '1/1',
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initAspectRatios(root: Document | HTMLElement = document): AspectRatio[] {
  if (!isBrowser()) return [];

  const elements = root.querySelectorAll<HTMLElement>(
    `[${ATTRS.ROOT}]:not([data-atlas-aspect-ratio-initialized])`
  );
  const instances: AspectRatio[] = [];

  elements.forEach((element) => {
    const options: AspectRatioOptions = {
      ratio: element.getAttribute('data-ratio') ?? '1/1',
    };

    const instance = createAspectRatio(element, options);
    element.setAttribute('data-atlas-aspect-ratio-initialized', '');
    instances.push(instance);
  });

  return instances;
}
