import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';

export interface ShimmerOptions {
  angle?: number;
  duration?: number;
  color?: string;
  width?: number;
  loop?: boolean;
  interval?: number;
}

/**
 * Creates a shimmer/shine effect that sweeps across an element.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the shimmer effect
 * @returns An object with cleanup function and trigger method
 *
 * @example
 * ```typescript
 * const shimmer = shimmer('#button', {
 *   angle: 45,
 *   duration: 2000,
 *   color: 'rgba(255, 255, 255, 0.3)',
 *   width: 100,
 *   loop: true,
 *   interval: 5000
 * });
 * ```
 */
export function shimmer(
  target: Element | string,
  options: ShimmerOptions = {}
): { cleanup: () => void; trigger: () => void } {
  const element = resolveElement(target as string | HTMLElement);

  const noop = {
    cleanup: () => {},
    trigger: () => {},
  };

  if (!element) {
    console.warn('[Atlas Shimmer] Element not found:', target);
    return noop;
  }

  if (shouldReduceMotion()) {
    console.info('[Atlas Shimmer] Effect disabled due to prefers-reduced-motion');
    return noop;
  }

  const {
    angle = 45,
    duration = 2000,
    color = 'rgba(255, 255, 255, 0.3)',
    width = 100,
    loop = false,
    interval = 5000,
  } = options;

  const styleManager = createStyleManager();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let animationElement: HTMLElement | null = null;

  const applyShimmer = () => {
    // Create shimmer element
    animationElement = document.createElement('div');
    animationElement.className = 'atlas-shimmer';
    animationElement.style.cssText = `
      position: absolute;
      top: 0;
      left: -${width}px;
      width: ${width}px;
      height: 100%;
      background: linear-gradient(
        ${angle}deg,
        transparent 0%,
        ${color} 50%,
        transparent 100%
      );
      pointer-events: none;
      transform: skewX(-20deg);
      animation: atlas-shimmer-sweep ${duration}ms ease-in-out;
      z-index: 1000;
    `;

    // Add keyframe animation if not exists
    if (!document.getElementById('atlas-shimmer-keyframes')) {
      const style = document.createElement('style');
      style.id = 'atlas-shimmer-keyframes';
      style.textContent = `
        @keyframes atlas-shimmer-sweep {
          0% { left: -${width}px; }
          100% { left: 100%; }
        }
      `;
      document.head.appendChild(style);
    }

    // Ensure element has position and overflow
    styleManager.setStyles(element, {
      position: element.style.position || 'relative',
      overflow: 'hidden',
    });

    element.appendChild(animationElement);

    // Remove after animation
    setTimeout(() => {
      if (animationElement?.parentNode) {
        animationElement.parentNode.removeChild(animationElement);
        animationElement = null;
      }
    }, duration);
  };

  const triggerShimmer = () => {
    applyShimmer();
  };

  // Auto loop if enabled
  if (loop) {
    intervalId = setInterval(triggerShimmer, interval);
    // Trigger immediately
    triggerShimmer();
  }

  return {
    trigger: triggerShimmer,
    cleanup: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (animationElement?.parentNode) {
        animationElement.parentNode.removeChild(animationElement);
        animationElement = null;
      }
      styleManager.restore(element);
      // Remove keyframes
      const keyframes = document.getElementById('atlas-shimmer-keyframes');
      if (keyframes) {
        keyframes.remove();
      }
    },
  };
}
