import { resolveElement } from '../utils/element';
import { createSimpleAnimationLoop } from '../utils/animation';
import { ensurePositioned } from '../utils/style';
import { shouldReduceMotion } from '../utils/accessibility';

export interface NoiseOptions {
  intensity?: number;
  fps?: number;
  monochrome?: boolean;
}

/**
 * Creates a film grain/noise effect using canvas.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the noise effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = noise('#background', {
 *   intensity: 0.05,
 *   fps: 30,
 *   monochrome: true
 * });
 * ```
 */
export function noise(target: Element | string, options: NoiseOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Noise] Element not found:', target);
    return () => {};
  }

  if (shouldReduceMotion()) {
    console.info('[Atlas Noise] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const { intensity = 0.05, fps = 30, monochrome = true } = options;

  // Ensure element is positioned
  const restorePosition = ensurePositioned(element);

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.warn('[Atlas Noise] Canvas context not available');
    return () => {};
  }

  canvas.className = 'atlas-noise';
  canvas.style.cssText = `
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: ${intensity};
    z-index: 1000;
  `;

  element.appendChild(canvas);

  // Size canvas to container
  const resizeCanvas = () => {
    const rect = element.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  resizeCanvas();

  // Generate noise
  const generateNoise = () => {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;

      if (monochrome) {
        data[i] = value; // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
      } else {
        data[i] = Math.random() * 255; // R
        data[i + 1] = Math.random() * 255; // G
        data[i + 2] = Math.random() * 255; // B
      }
      data[i + 3] = 255; // A
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Animation with FPS limit
  let lastTime = 0;
  const frameTime = 1000 / fps;

  const stopAnimation = createSimpleAnimationLoop(() => {
    const now = performance.now();
    const elapsed = now - lastTime;

    if (elapsed > frameTime) {
      generateNoise();
      lastTime = now - (elapsed % frameTime);
    }
  });

  // Handle resize
  const handleResize = () => {
    resizeCanvas();
  };

  window.addEventListener('resize', handleResize);

  return () => {
    stopAnimation();
    window.removeEventListener('resize', handleResize);
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    restorePosition();
  };
}
