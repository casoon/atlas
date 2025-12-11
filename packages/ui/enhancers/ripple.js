/**
 * Atlas Ripple Enhancer
 *
 * Adds ripple effect to any element.
 * Can be used standalone or auto-initialized via data attributes.
 *
 * @example Auto-init (recommended)
 * <button class="atlas-btn" data-atlas-ripple>Click me</button>
 * <script type="module">
 *   import '@casoon/atlas/enhancers/ripple';
 * </script>
 *
 * @example Manual
 * import { initRipple } from '@casoon/atlas/enhancers/ripple';
 * initRipple(document.querySelector('.my-button'));
 */

/**
 * Initialize ripple effect on a single element
 * @param {HTMLElement} element
 * @returns {() => void} Cleanup function
 */
export function initRipple(element) {
  if (!element) return () => {};

  const handlePointerDown = (event) => {
    // Check if element is disabled
    if (
      element.hasAttribute('disabled') ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.hasAttribute('loading')
    ) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'atlas-ripple';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.3;
      pointer-events: none;
      transform: scale(0);
      animation: atlas-ripple 600ms cubic-bezier(0, 0, 0.2, 1) forwards;
      width: ${size}px;
      height: ${size}px;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
    `;

    // Ensure parent has positioning for absolute child
    const position = getComputedStyle(element).position;
    if (position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(ripple);

    // Cleanup after animation
    const cleanup = () => {
      ripple.remove();
    };

    ripple.addEventListener('animationend', cleanup);

    // Fallback cleanup
    setTimeout(cleanup, 700);
  };

  element.addEventListener('pointerdown', handlePointerDown);

  // Return cleanup function
  return () => {
    element.removeEventListener('pointerdown', handlePointerDown);
  };
}

/**
 * Initialize ripple on all matching elements
 * @param {string} selector - CSS selector (default: '[data-atlas-ripple]')
 * @returns {() => void} Cleanup function for all elements
 */
export function initAllRipples(selector = '[data-atlas-ripple]') {
  const elements = document.querySelectorAll(selector);
  const cleanups = Array.from(elements).map(initRipple);

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

/**
 * Auto-initialize on DOM ready
 */
function autoInit() {
  if (typeof document === 'undefined') return;

  // Initialize existing elements
  const init = () => initAllRipples();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Watch for dynamically added elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check the node itself
          if (node.hasAttribute?.('data-atlas-ripple')) {
            initRipple(node);
          }
          // Check descendants
          node.querySelectorAll?.('[data-atlas-ripple]').forEach(initRipple);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Auto-init when imported
autoInit();

export default { initRipple, initAllRipples };
