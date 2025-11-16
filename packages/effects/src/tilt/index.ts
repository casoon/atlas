import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';
import { rafThrottle } from '../utils/performance';
import { shouldReduceMotion } from '../utils/accessibility';

export interface TiltOptions {
  intensity?: number;
  scale?: number;
  perspective?: number;
  speed?: number;
  glareEffect?: boolean;
}

/**
 * Creates a 3D tilt effect that responds to mouse movement.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the tilt effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = tilt('#my-card', {
 *   intensity: 20,
 *   scale: 1.05,
 *   perspective: 1000,
 *   speed: 300,
 *   glareEffect: true
 * });
 * ```
 */
export function tilt(target: Element | string, options: TiltOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Tilt] Element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas Tilt] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const {
    intensity = 20,
    scale = 1.05,
    perspective = 1000,
    speed = 300,
    glareEffect = true
  } = options;

  const styleManager = createStyleManager();
  let glareElement: HTMLElement | null = null;

  // Create glare element if enabled
  if (glareEffect) {
    glareElement = document.createElement('div');
    glareElement.className = 'atlas-tilt-glare';
    glareElement.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%);
      opacity: 0;
      pointer-events: none;
      transition: opacity ${speed}ms ease;
    `;
    element.appendChild(glareElement);
  }

  // Set initial styles
  styleManager.setStyles(element, {
    'transform-style': 'preserve-3d',
    transition: `transform ${speed}ms ease`
  });

  const handleMouseMove = rafThrottle((e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    const rotateX = -y * intensity;
    const rotateY = x * intensity;

    const transformValue = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    styleManager.setStyle(element, 'transform', transformValue);

    if (glareElement) {
      glareElement.style.opacity = '1';
      const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
      glareElement.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)`;
    }
  });

  const handleMouseLeave = () => {
    const transformValue = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`;
    styleManager.setStyle(element, 'transform', transformValue);

    if (glareElement) {
      glareElement.style.opacity = '0';
    }
  };

  element.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    handleMouseMove.cancel();
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);

    if (glareElement && glareElement.parentNode) {
      glareElement.parentNode.removeChild(glareElement);
    }

    styleManager.restore(element);
  };
}
