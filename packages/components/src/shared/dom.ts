/**
 * SSR-safe DOM utilities for Atlas components
 * All DOM operations should go through these helpers
 */

/** Check if we're in a browser environment */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/** Safely get the document object */
export const getDocument = (): Document | null => {
  return isBrowser() ? document : null;
};

/** Safely get the window object */
export const getWindow = (): Window | null => {
  return isBrowser() ? window : null;
};

/** Create an element with attributes and styles */
export const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    attributes?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    className?: string;
    dataset?: Record<string, string>;
  } = {}
): HTMLElementTagNameMap[K] | null => {
  const doc = getDocument();
  if (!doc) return null;

  const element = doc.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }

  if (options.styles) {
    Object.assign(element.style, options.styles);
  }

  if (options.dataset) {
    for (const [key, value] of Object.entries(options.dataset)) {
      element.dataset[key] = value;
    }
  }

  return element;
};

/** Get all focusable elements within a container */
export const getFocusableElements = (container: Element): HTMLElement[] => {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null // visible
  );
};

/** Lock body scroll */
export const lockScroll = (): (() => void) => {
  const doc = getDocument();
  if (!doc) return () => {};

  const scrollY = window.scrollY;
  const body = doc.body;
  const originalStyle = body.style.cssText;

  body.style.cssText = `
    position: fixed;
    top: -${scrollY}px;
    left: 0;
    right: 0;
    overflow: hidden;
  `;

  return () => {
    body.style.cssText = originalStyle;
    window.scrollTo(0, scrollY);
  };
};

/** Add event listener with automatic cleanup */
export const addListener = <K extends keyof DocumentEventMap>(
  target: EventTarget,
  type: K,
  listener: (ev: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions
): (() => void) => {
  target.addEventListener(type, listener as EventListener, options);
  return () => target.removeEventListener(type, listener as EventListener, options);
};
