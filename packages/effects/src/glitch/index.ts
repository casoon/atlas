import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';
import { shouldReduceMotion } from '../utils/accessibility';

export interface GlitchOptions {
  intensity?: number;
  duration?: number;
  rgbShift?: boolean;
  scanlines?: boolean;
  trigger?: 'auto' | 'manual';
  interval?: number;
}

/**
 * Creates a digital glitch effect with RGB shift and scanlines.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the glitch effect
 * @returns An object with cleanup function and trigger method
 *
 * @example
 * ```typescript
 * const glitch = glitch('#element', {
 *   intensity: 0.5,
 *   duration: 200,
 *   rgbShift: true,
 *   scanlines: true,
 *   trigger: 'auto',
 *   interval: 3000
 * });
 *
 * // Manual trigger
 * glitch.trigger();
 * // Cleanup
 * glitch.cleanup();
 * ```
 */
export function glitch(
  target: Element | string,
  options: GlitchOptions = {}
): { cleanup: () => void; trigger: () => void } {
  const element = resolveElement(target as string | HTMLElement);

  const noop = {
    cleanup: () => {},
    trigger: () => {}
  };

  if (!element) {
    console.warn('[Atlas Glitch] Element not found:', target);
    return noop;
  }

  if (shouldReduceMotion()) {
    console.info('[Atlas Glitch] Effect disabled due to prefers-reduced-motion');
    return noop;
  }

  const {
    intensity = 0.5,
    duration = 200,
    rgbShift = true,
    scanlines = true,
    trigger: triggerMode = 'auto',
    interval = 3000
  } = options;

  const styleManager = createStyleManager();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const applyGlitch = () => {
    const shift = intensity * 5;
    const skew = intensity * 5;

    if (rgbShift) {
      styleManager.setStyles(element, {
        transform: `translate(${Math.random() * shift - shift / 2}px, ${
          Math.random() * shift - shift / 2
        }px) skew(${Math.random() * skew - skew / 2}deg)`,
        'text-shadow': `
          ${shift}px 0 rgba(255, 0, 0, ${intensity}),
          ${-shift}px 0 rgba(0, 255, 255, ${intensity})
        `,
        filter: `contrast(${1 + intensity}) brightness(${1 + intensity * 0.2})`
      });
    } else {
      styleManager.setStyles(element, {
        transform: `translate(${Math.random() * shift - shift / 2}px, ${
          Math.random() * shift - shift / 2
        }px)`,
        filter: `contrast(${1 + intensity})`
      });
    }

    if (scanlines) {
      const overlay = document.createElement('div');
      overlay.className = 'atlas-glitch-scanlines';
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.1),
          rgba(0, 0, 0, 0.1) 1px,
          transparent 1px,
          transparent 2px
        );
        opacity: ${intensity};
      `;
      element.appendChild(overlay);

      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, duration);
    }

    // Reset after duration
    timeoutId = setTimeout(() => {
      styleManager.restore(element);
    }, duration);
  };

  const triggerGlitch = () => {
    applyGlitch();
  };

  // Auto trigger if set
  if (triggerMode === 'auto') {
    intervalId = setInterval(triggerGlitch, interval);
  }

  return {
    trigger: triggerGlitch,
    cleanup: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      styleManager.restore(element);
      // Remove any remaining scanlines
      const scanlines = element.querySelectorAll('.atlas-glitch-scanlines');
      scanlines.forEach((line) => line.remove());
    }
  };
}
