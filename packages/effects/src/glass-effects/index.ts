import { resolveElement } from '../utils/element';
import { createSimpleAnimationLoop } from '../utils/animation';
import { createStyleManager } from '../utils/style';
import { rafThrottle } from '../utils/performance';
import { shouldReduceMotion } from '../utils/accessibility';

export interface GlassEffectsOptions {
  intensity?: number;
  blurAmount?: number;
  animated?: boolean;
  interactiveBlur?: boolean;
  color?: string;
}

/**
 * Creates a glassmorphism effect with optional animation and interactivity.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the glass effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = glassEffects('#card', {
 *   intensity: 0.15,
 *   blurAmount: 16,
 *   animated: true,
 *   interactiveBlur: true,
 *   color: 'rgba(255, 255, 255, 0.1)'
 * });
 * ```
 */
export function glassEffects(
  target: Element | string,
  options: GlassEffectsOptions = {}
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas GlassEffects] Element not found:', target);
    return () => {};
  }

  const {
    intensity = 0.15,
    blurAmount = 16,
    animated = true,
    interactiveBlur = true,
    color = 'rgba(255, 255, 255, 0.1)'
  } = options;

  const styleManager = createStyleManager();
  const cleanupFunctions: Array<() => void> = [];

  // Apply base glass styling
  const applyGlassStyle = (blur = blurAmount, opacity = intensity) => {
    styleManager.setStyles(element, {
      background: `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`,
      'backdrop-filter': `blur(${blur}px) saturate(1.2)`,
      '-webkit-backdrop-filter': `blur(${blur}px) saturate(1.2)`,
      border: `1px solid color-mix(in srgb, ${color} ${Math.round(opacity * 200)}%, transparent)`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });
  };

  // Interactive blur effect
  if (interactiveBlur) {
    const handleMouseMove = rafThrottle((e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Calculate distance from center
      const distanceFromCenter = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2));
      const dynamicBlur = blurAmount * (0.7 + distanceFromCenter * 0.6);
      const dynamicOpacity = intensity * (1.2 - distanceFromCenter * 0.4);

      applyGlassStyle(dynamicBlur, Math.max(0.05, dynamicOpacity));
    });

    const handleMouseLeave = () => {
      applyGlassStyle();
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    cleanupFunctions.push(() => {
      handleMouseMove.cancel();
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    });
  }

  // Animated glass pulse
  if (animated && !shouldReduceMotion()) {
    let phase = 0;

    const stopAnimation = createSimpleAnimationLoop(() => {
      const pulseIntensity = Math.sin(phase) * 0.3 + 1;
      const pulseBlur = blurAmount * pulseIntensity;
      const pulseOpacity = intensity * pulseIntensity;

      applyGlassStyle(pulseBlur, pulseOpacity);
      phase += 0.02;
    });

    cleanupFunctions.push(stopAnimation);
  } else {
    // Apply static glass style
    applyGlassStyle();
  }

  // Initialize (only if not animated, as animation handles it)
  if (!animated || shouldReduceMotion()) {
    applyGlassStyle();
  }

  // Cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    styleManager.restore(element);
  };
}
