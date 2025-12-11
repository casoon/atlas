import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';
import { rafThrottle } from '../utils/performance';
import { ensurePositioned } from '../utils/style';

export interface SpotlightOptions {
  color?: string;
  size?: number;
  blur?: number;
  intensity?: number;
}

/**
 * Creates a spotlight effect that follows the mouse cursor.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the spotlight effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = spotlight('#hero', {
 *   color: 'rgba(255, 255, 255, 0.1)',
 *   size: 300,
 *   blur: 100,
 *   intensity: 0.8
 * });
 * ```
 */
export function spotlight(target: Element | string, options: SpotlightOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Spotlight] Element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas Spotlight] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const { color = 'rgba(255, 255, 255, 0.1)', size = 300, blur = 100, intensity = 0.8 } = options;

  // Ensure element is positioned
  const restorePosition = ensurePositioned(element);

  // Create spotlight overlay
  const overlay = document.createElement('div');
  overlay.className = 'atlas-spotlight-overlay';
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    overflow: hidden;
  `;

  const spot = document.createElement('div');
  spot.className = 'atlas-spotlight';
  spot.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    background: radial-gradient(circle, ${color} 0%, transparent 70%);
    filter: blur(${blur}px);
    opacity: ${intensity};
    transform: translate(-50%, -50%);
    will-change: transform;
  `;

  overlay.appendChild(spot);
  element.appendChild(overlay);

  const handleMouseMove = rafThrottle((e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spot.style.left = `${x}px`;
    spot.style.top = `${y}px`;
  });

  element.addEventListener('mousemove', handleMouseMove);

  return () => {
    handleMouseMove.cancel();
    element.removeEventListener('mousemove', handleMouseMove);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    restorePosition();
  };
}
