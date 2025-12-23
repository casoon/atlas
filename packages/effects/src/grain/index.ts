/**
 * Film Grain / Noise Overlay Effect
 *
 * Adds texture and visual interest:
 * - Static noise overlay
 * - Animated grain
 * - Adjustable intensity and size
 * - Color/monochrome modes
 *
 * @module
 */

import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';

// ============================================================================
// Types
// ============================================================================

/** Grain options */
export interface GrainOptions {
  /** Noise intensity (0-1, default: 0.1) */
  intensity?: number;
  /** Grain size in px (default: 1) */
  size?: number;
  /** Animate the grain (default: true) */
  animated?: boolean;
  /** Animation speed (1-10, default: 5) */
  speed?: number;
  /** Monochrome or colored (default: true for mono) */
  monochrome?: boolean;
  /** Blend mode (default: 'overlay') */
  blendMode?: GlobalCompositeOperation;
  /** Z-index (default: 9999) */
  zIndex?: number;
  /** Cover entire viewport (default: true) */
  fullscreen?: boolean;
}

/** Grain controller */
export interface GrainController {
  /** Set intensity (0-1) */
  setIntensity: (intensity: number) => void;
  /** Enable animation */
  animate: () => void;
  /** Disable animation (static grain) */
  freeze: () => void;
  /** Show overlay */
  show: () => void;
  /** Hide overlay */
  hide: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// ============================================================================
// Noise Generation
// ============================================================================

/**
 * Generate noise image data
 */
function generateNoiseImageData(
  width: number,
  height: number,
  monochrome: boolean,
  intensity: number
): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;
  const alpha = Math.round(intensity * 255);

  for (let i = 0; i < data.length; i += 4) {
    if (monochrome) {
      const value = Math.random() * 255;
      data[i] = value; // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
    } else {
      data[i] = Math.random() * 255; // R
      data[i + 1] = Math.random() * 255; // G
      data[i + 2] = Math.random() * 255; // B
    }
    data[i + 3] = alpha; // A
  }

  return imageData;
}

// ============================================================================
// Main Implementation
// ============================================================================

/**
 * Create a grain/noise overlay effect
 *
 * @example
 * ```typescript
 * // Simple grain overlay
 * const grain = createGrain({
 *   intensity: 0.15,
 *   animated: true
 * });
 *
 * // Static, stronger grain
 * const grain = createGrain({
 *   intensity: 0.25,
 *   animated: false,
 *   size: 2
 * });
 *
 * // Colored noise
 * const grain = createGrain({
 *   monochrome: false,
 *   intensity: 0.1,
 *   blendMode: 'soft-light'
 * });
 *
 * // On specific element
 * const grain = createGrain({
 *   intensity: 0.1,
 *   fullscreen: false
 * }, myElement);
 *
 * // Cleanup
 * grain.destroy();
 * ```
 */
export function createGrain(
  options: GrainOptions = {},
  target?: HTMLElement | string
): GrainController {
  if (typeof document === 'undefined') {
    return {
      setIntensity: () => {},
      animate: () => {},
      freeze: () => {},
      show: () => {},
      hide: () => {},
      isVisible: () => false,
      destroy: () => {},
    };
  }

  // Skip if reduced motion and animated
  const reduceMotion = shouldReduceMotion();

  const {
    intensity: initialIntensity = 0.1,
    size = 1,
    animated: initialAnimated = !reduceMotion,
    speed = 5,
    monochrome = true,
    blendMode = 'overlay',
    zIndex = 9999,
    fullscreen = true,
  } = options;

  let intensity = initialIntensity;
  let animated = initialAnimated;
  let visible = true;
  let animationId: number | null = null;

  // Resolve target
  const container = target ? resolveElement(target as string | HTMLElement) : document.body;

  if (!container) {
    return {
      setIntensity: () => {},
      animate: () => {},
      freeze: () => {},
      show: () => {},
      hide: () => {},
      isVisible: () => false,
      destroy: () => {},
    };
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'atlas-grain';
  canvas.style.cssText = fullscreen
    ? `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${zIndex};
      mix-blend-mode: ${blendMode};
    `
    : `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      mix-blend-mode: ${blendMode};
    `;

  // Set canvas size (smaller for performance, scaled up)
  const canvasSize = 128 * size;
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      setIntensity: () => {},
      animate: () => {},
      freeze: () => {},
      show: () => {},
      hide: () => {},
      isVisible: () => false,
      destroy: () => {},
    };
  }

  // Add to DOM
  if (fullscreen) {
    document.body.appendChild(canvas);
  } else {
    if (container !== document.body) {
      const containerStyle = getComputedStyle(container);
      if (containerStyle.position === 'static') {
        container.style.position = 'relative';
      }
    }
    container.appendChild(canvas);
  }

  // Render noise
  function renderNoise(): void {
    if (!ctx || !visible) return;

    const imageData = generateNoiseImageData(canvasSize, canvasSize, monochrome, intensity);
    ctx.putImageData(imageData, 0, 0);
  }

  // Animation loop
  let lastFrame = 0;
  const frameInterval = 1000 / (speed * 6); // Convert speed to fps

  function animationLoop(timestamp: number): void {
    if (!animated || !visible) return;

    if (timestamp - lastFrame >= frameInterval) {
      renderNoise();
      lastFrame = timestamp;
    }

    animationId = requestAnimationFrame(animationLoop);
  }

  // Initial render
  renderNoise();

  // Start animation if enabled
  if (animated) {
    animationId = requestAnimationFrame(animationLoop);
  }

  return {
    setIntensity(newIntensity: number): void {
      intensity = Math.max(0, Math.min(1, newIntensity));
      if (!animated) {
        renderNoise();
      }
    },

    animate(): void {
      if (animated) return;
      animated = true;
      animationId = requestAnimationFrame(animationLoop);
    },

    freeze(): void {
      animated = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },

    show(): void {
      visible = true;
      canvas.style.display = '';
      if (animated) {
        animationId = requestAnimationFrame(animationLoop);
      } else {
        renderNoise();
      }
    },

    hide(): void {
      visible = false;
      canvas.style.display = 'none';
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },

    isVisible(): boolean {
      return visible;
    },

    destroy(): void {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      canvas.remove();
    },
  };
}

// ============================================================================
// CSS-based Grain (Alternative, better performance)
// ============================================================================

/**
 * Create a CSS-based grain effect using SVG filter
 * Better performance than canvas but less customizable
 *
 * @example
 * ```typescript
 * const cleanup = createCSSGrain({
 *   intensity: 0.15,
 *   animated: true
 * });
 * ```
 */
export function createCSSGrain(
  options: Pick<GrainOptions, 'intensity' | 'animated' | 'zIndex'> = {}
): () => void {
  if (typeof document === 'undefined') return () => {};

  const { intensity = 0.1, animated = true, zIndex = 9999 } = options;

  // Create SVG filter
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';

  const defs = document.createElementNS(svgNS, 'defs');
  const filter = document.createElementNS(svgNS, 'filter');
  filter.setAttribute('id', 'atlas-grain-filter');

  const feTurbulence = document.createElementNS(svgNS, 'feTurbulence');
  feTurbulence.setAttribute('type', 'fractalNoise');
  feTurbulence.setAttribute('baseFrequency', '0.8');
  feTurbulence.setAttribute('numOctaves', '4');
  feTurbulence.setAttribute('stitchTiles', 'stitch');

  if (animated) {
    const animate = document.createElementNS(svgNS, 'animate');
    animate.setAttribute('attributeName', 'seed');
    animate.setAttribute('dur', '1s');
    animate.setAttribute('values', '0;100');
    animate.setAttribute('repeatCount', 'indefinite');
    feTurbulence.appendChild(animate);
  }

  filter.appendChild(feTurbulence);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'atlas-css-grain';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: ${zIndex};
    opacity: ${intensity};
    filter: url(#atlas-grain-filter);
    mix-blend-mode: overlay;
  `;
  document.body.appendChild(overlay);

  return () => {
    svg.remove();
    overlay.remove();
  };
}

// ============================================================================
// Grain preset for common use cases
// ============================================================================

export const grainPresets = {
  /** Subtle film grain */
  subtle: {
    intensity: 0.08,
    size: 1,
    animated: true,
    speed: 3,
  },
  /** Standard film grain */
  film: {
    intensity: 0.15,
    size: 1,
    animated: true,
    speed: 5,
  },
  /** Strong vintage grain */
  vintage: {
    intensity: 0.25,
    size: 2,
    animated: true,
    speed: 8,
  },
  /** Static noise */
  noise: {
    intensity: 0.2,
    size: 1,
    animated: false,
  },
  /** Color TV static */
  static: {
    intensity: 0.3,
    size: 1,
    animated: true,
    speed: 10,
    monochrome: false,
  },
} as const;

/**
 * Create grain with preset
 *
 * @example
 * ```typescript
 * const grain = createGrainPreset('film');
 * const grain = createGrainPreset('vintage');
 * ```
 */
export function createGrainPreset(
  preset: keyof typeof grainPresets,
  target?: HTMLElement | string
): GrainController {
  return createGrain(grainPresets[preset], target);
}
