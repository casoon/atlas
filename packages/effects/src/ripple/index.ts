import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';
import { ensurePositioned } from '../utils/style';

export interface RippleOptions {
  strength?: number;
  duration?: number;
  color?: string;
}

/**
 * Adds a ripple effect to an element when clicked.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the ripple effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = ripple('#my-button', {
 *   strength: 0.5,
 *   duration: 600,
 *   color: 'rgba(255, 255, 255, 0.3)'
 * });
 * ```
 */
export function ripple(target: Element | string, options: RippleOptions = {}): () => void {
  const el = resolveElement(target as string | HTMLElement);
  if (!el) {
    console.warn('[Atlas Ripple] Element not found:', target);
    return () => {};
  }

  const { strength = 0.5, duration = 600, color = 'rgba(255, 255, 255, 0.3)' } = options;

  // Ensure element is positioned for absolute positioning of ripple
  const restorePosition = ensurePositioned(el);

  // Track active ripples for cleanup
  const activeRipples = new Set<HTMLElement>();

  const onPointerDown = (e: Event) => {
    // Skip ripple if user prefers reduced motion
    if (shouldReduceMotion()) {
      return;
    }

    const pointerEvent = e as PointerEvent;
    const rect = el.getBoundingClientRect();
    const x = pointerEvent.clientX - rect.left;
    const y = pointerEvent.clientY - rect.top;

    // Create ripple element
    const ripple = document.createElement('div');
    const size = Math.max(rect.width, rect.height) * 2 * strength;

    ripple.className = 'atlas-ripple';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      transform: translate(-50%, -50%) scale(0);
      transition: transform ${duration}ms ease-out, opacity ${duration}ms ease-out;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      opacity: 1;
      z-index: 1000;
    `;

    el.appendChild(ripple);
    activeRipples.add(ripple);

    // Trigger animation
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(1)';
      ripple.style.opacity = '0';
    });

    // Clean up after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
      activeRipples.delete(ripple);
    }, duration);
  };

  el.addEventListener('pointerdown', onPointerDown, { passive: true });

  return () => {
    el.removeEventListener('pointerdown', onPointerDown);

    // Clean up all active ripples
    activeRipples.forEach((ripple) => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    });
    activeRipples.clear();

    // Restore original position style
    restorePosition();
  };
}
