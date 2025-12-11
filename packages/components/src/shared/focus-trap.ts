/**
 * Focus trap utility for modal components
 * Keeps focus within a container for accessibility
 */

import { addListener, getDocument, getFocusableElements } from './dom';

export interface FocusTrapOptions {
  /** The container to trap focus within */
  container: HTMLElement;
  /** Element to focus when trap is activated */
  initialFocus?: HTMLElement | 'first' | 'container';
  /** Element to focus when trap is deactivated */
  returnFocus?: HTMLElement | 'previous';
  /** Called when user tries to escape (Escape key) */
  onEscape?: () => void;
}

export interface FocusTrap {
  /** Activate the focus trap */
  activate: () => void;
  /** Deactivate the focus trap */
  deactivate: () => void;
  /** Update focusable elements (call after DOM changes) */
  updateElements: () => void;
}

export const createFocusTrap = (options: FocusTrapOptions): FocusTrap => {
  const { container, initialFocus = 'first', returnFocus = 'previous', onEscape } = options;

  let isActive = false;
  let previouslyFocused: HTMLElement | null = null;
  let focusableElements: HTMLElement[] = [];
  let cleanupListeners: (() => void)[] = [];

  const updateElements = () => {
    focusableElements = getFocusableElements(container);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape?.();
      return;
    }

    if (e.key === 'Tab') {
      updateElements();

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const doc = getDocument();
      if (!doc) return;

      if (e.shiftKey) {
        // Shift + Tab
        if (doc.activeElement === firstElement || doc.activeElement === container) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (doc.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const handleFocusOut = (e: FocusEvent) => {
    if (!isActive) return;

    const relatedTarget = e.relatedTarget as HTMLElement | null;

    // If focus is leaving the container, bring it back
    if (relatedTarget && !container.contains(relatedTarget)) {
      e.preventDefault();
      focusableElements[0]?.focus();
    }
  };

  const activate = () => {
    if (isActive) return;
    isActive = true;

    const doc = getDocument();
    if (!doc) return;

    // Store previously focused element
    previouslyFocused = doc.activeElement as HTMLElement;

    // Update focusable elements
    updateElements();

    // Set initial focus
    requestAnimationFrame(() => {
      if (initialFocus === 'first' && focusableElements.length > 0) {
        focusableElements[0].focus();
      } else if (initialFocus === 'container') {
        container.setAttribute('tabindex', '-1');
        container.focus();
      } else if (initialFocus instanceof HTMLElement) {
        initialFocus.focus();
      }
    });

    // Add event listeners
    cleanupListeners.push(
      addListener(doc, 'keydown', handleKeyDown as (ev: DocumentEventMap['keydown']) => void),
      addListener(
        container,
        'focusout',
        handleFocusOut as (ev: DocumentEventMap['focusout']) => void
      )
    );
  };

  const deactivate = () => {
    if (!isActive) return;
    isActive = false;

    // Clean up listeners
    cleanupListeners.forEach((cleanup) => cleanup());
    cleanupListeners = [];

    // Remove tabindex if we added it
    if (container.getAttribute('tabindex') === '-1') {
      container.removeAttribute('tabindex');
    }

    // Return focus
    if (returnFocus === 'previous' && previouslyFocused) {
      previouslyFocused.focus();
    } else if (returnFocus instanceof HTMLElement) {
      returnFocus.focus();
    }

    previouslyFocused = null;
  };

  return {
    activate,
    deactivate,
    updateElements,
  };
};
