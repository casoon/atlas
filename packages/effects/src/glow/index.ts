import { resolveElement } from '../utils/element';
import { createSimpleAnimationLoop } from '../utils/animation';
import { createStyleManager } from '../utils/style';
import { shouldReduceMotion } from '../utils/accessibility';

export interface GlowOptions {
  color?: string;
  intensity?: number;
  size?: number;
  animated?: boolean;
  interactive?: boolean;
}

/**
 * Applies a glowing effect to an element.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the glow effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = glow('#my-button', {
 *   color: '#3b82f6',
 *   intensity: 0.5,
 *   size: 20,
 *   animated: true,
 *   interactive: true
 * });
 *
 * // Later, to remove the effect:
 * cleanup();
 * ```
 */
export function glow(target: Element | string, options: GlowOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Glow] Element not found:', target);
    return () => {};
  }

  const {
    color = '#3b82f6',
    intensity = 0.5,
    size = 20,
    animated = true,
    interactive = true
  } = options;

  const styleManager = createStyleManager();
  const cleanupFunctions: Array<() => void> = [];

  const applyGlow = (glowIntensity = intensity, glowSize = size) => {
    const shadowValue = `0 0 ${glowSize}px ${Math.round(glowIntensity * glowSize)}px ${color}`;
    styleManager.setStyle(element, 'box-shadow', shadowValue);
  };

  // Check if user prefers reduced motion
  const reduceMotion = shouldReduceMotion();

  // Animated glow (pulsing effect)
  if (animated && !reduceMotion) {
    let phase = 0;
    const stopAnimation = createSimpleAnimationLoop(() => {
      const pulseIntensity = Math.sin(phase) * 0.3 + 0.7;
      applyGlow(intensity * pulseIntensity);
      phase += 0.02;
    });
    cleanupFunctions.push(stopAnimation);
  } else {
    // Apply static glow if animation is disabled or motion is reduced
    applyGlow();
  }

  // Interactive glow (responds to mouse hover)
  if (interactive) {
    const handleMouseEnter = () => applyGlow(intensity * 1.5, size * 1.2);
    const handleMouseLeave = () => applyGlow();

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    cleanupFunctions.push(() => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    });
  }

  // Return a cleanup function that calls all cleanup functions
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
    styleManager.restore(element);
  };
}