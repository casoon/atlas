/**
 * Custom Cursor Effects
 *
 * Modern cursor experiences:
 * - Custom cursor shapes (dot, ring, arrow)
 * - Magnetic attraction to elements
 * - Cursor trails
 * - State-based cursor changes (hover, click, drag)
 * - Text/element highlighting cursor
 *
 * @module
 */

import { shouldReduceMotion } from '../utils/accessibility';

// ============================================================================
// Types
// ============================================================================

/** Cursor style preset */
export type CursorStyle = 'dot' | 'ring' | 'dot-ring' | 'arrow' | 'custom';

/** Cursor state */
export type CursorState = 'default' | 'hover' | 'active' | 'drag' | 'text' | 'hidden';

/** Custom cursor options */
export interface CustomCursorOptions {
  /** Cursor style */
  style?: CursorStyle;
  /** Primary color */
  color?: string;
  /** Secondary color (for ring) */
  secondaryColor?: string;
  /** Cursor size in px */
  size?: number;
  /** Ring size (for dot-ring style) */
  ringSize?: number;
  /** Enable magnetic effect */
  magnetic?: boolean;
  /** Magnetic strength (0-1) */
  magneticStrength?: number;
  /** Magnetic radius in px */
  magneticRadius?: number;
  /** Enable trail effect */
  trail?: boolean;
  /** Trail length */
  trailLength?: number;
  /** Trail fade duration in ms */
  trailFadeDuration?: number;
  /** Smoothing/lerp factor (0-1, lower = smoother) */
  smoothing?: number;
  /** Hide native cursor */
  hideNative?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Selectors for hover targets */
  hoverTargets?: string;
  /** Selectors for magnetic targets */
  magneticTargets?: string;
  /** Selectors for text targets */
  textTargets?: string;
  /** Scale on hover */
  hoverScale?: number;
  /** Scale on active/click */
  activeScale?: number;
  /** Custom render function */
  render?: (state: CursorState) => string;
  /** State change callback */
  onStateChange?: (state: CursorState) => void;
}

/** Cursor controller */
export interface CursorController {
  /** Update cursor position manually */
  setPosition: (x: number, y: number) => void;
  /** Set cursor state */
  setState: (state: CursorState) => void;
  /** Get current state */
  getState: () => CursorState;
  /** Show cursor */
  show: () => void;
  /** Hide cursor */
  hide: () => void;
  /** Enable */
  enable: () => void;
  /** Disable */
  disable: () => void;
  /** Destroy */
  destroy: () => void;
}

// ============================================================================
// Default Cursor Templates
// ============================================================================

const CURSOR_TEMPLATES: Record<CursorStyle, (opts: CustomCursorOptions) => string> = {
  dot: (opts) => `
    <div class="atlas-cursor-dot" style="
      width: ${opts.size}px;
      height: ${opts.size}px;
      background: ${opts.color};
      border-radius: 50%;
      transform: translate(-50%, -50%);
    "></div>
  `,
  ring: (opts) => {
    const s = opts.size ?? 10;
    return `
    <div class="atlas-cursor-ring" style="
      width: ${opts.ringSize || s * 2}px;
      height: ${opts.ringSize || s * 2}px;
      border: 2px solid ${opts.color};
      border-radius: 50%;
      transform: translate(-50%, -50%);
    "></div>
  `;
  },
  'dot-ring': (opts) => {
    const s = opts.size ?? 10;
    return `
    <div class="atlas-cursor-dot" style="
      width: ${s}px;
      height: ${s}px;
      background: ${opts.color};
      border-radius: 50%;
      transform: translate(-50%, -50%);
      position: absolute;
    "></div>
    <div class="atlas-cursor-ring" style="
      width: ${opts.ringSize || s * 3}px;
      height: ${opts.ringSize || s * 3}px;
      border: 1px solid ${opts.secondaryColor || opts.color};
      border-radius: 50%;
      transform: translate(-50%, -50%);
      position: absolute;
      opacity: 0.5;
      transition: width 0.2s, height 0.2s, opacity 0.2s;
    "></div>
  `;
  },
  arrow: (opts) => {
    const s = opts.size ?? 10;
    return `
    <svg class="atlas-cursor-arrow" width="${s * 2}" height="${s * 2}"
         viewBox="0 0 24 24" fill="${opts.color}" style="transform: translate(-25%, -10%);">
      <path d="M4 4l16 8-16 8 4-8z"/>
    </svg>
  `;
  },
  custom: () => '',
};

// ============================================================================
// Main Implementation
// ============================================================================

/**
 * Create a custom cursor effect
 *
 * @example
 * ```typescript
 * // Simple dot cursor
 * const cursor = createCustomCursor({
 *   style: 'dot',
 *   color: '#000',
 *   size: 10
 * });
 *
 * // Dot with ring and magnetic effect
 * const cursor = createCustomCursor({
 *   style: 'dot-ring',
 *   color: '#fff',
 *   size: 8,
 *   ringSize: 40,
 *   magnetic: true,
 *   magneticTargets: 'a, button',
 *   hoverScale: 1.5
 * });
 *
 * // With trail
 * const cursor = createCustomCursor({
 *   style: 'dot',
 *   trail: true,
 *   trailLength: 10,
 *   smoothing: 0.15
 * });
 *
 * // Cleanup
 * cursor.destroy();
 * ```
 */
export function createCustomCursor(options: CustomCursorOptions = {}): CursorController {
  if (typeof document === 'undefined') {
    return {
      setPosition: () => {},
      setState: () => {},
      getState: () => 'default',
      show: () => {},
      hide: () => {},
      enable: () => {},
      disable: () => {},
      destroy: () => {},
    };
  }

  // Check for reduced motion
  if (shouldReduceMotion()) {
    return {
      setPosition: () => {},
      setState: () => {},
      getState: () => 'default',
      show: () => {},
      hide: () => {},
      enable: () => {},
      disable: () => {},
      destroy: () => {},
    };
  }

  const {
    style = 'dot',
    color = '#000',
    secondaryColor,
    size = 10,
    ringSize,
    magnetic = false,
    magneticStrength = 0.3,
    magneticRadius = 100,
    trail = false,
    trailLength = 8,
    trailFadeDuration = 300,
    smoothing = 0.15,
    hideNative = true,
    zIndex = 9999,
    hoverTargets = 'a, button, [data-cursor-hover]',
    magneticTargets = '[data-cursor-magnetic]',
    textTargets = 'p, h1, h2, h3, h4, h5, h6, span, li',
    hoverScale = 1.5,
    activeScale = 0.9,
    render,
    onStateChange,
  } = options;

  // State
  let enabled = true;
  let currentState: CursorState = 'default';
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let animationId: number | null = null;
  let magneticTarget: HTMLElement | null = null;
  const trailPoints: { x: number; y: number; time: number }[] = [];

  // Create cursor element
  const cursorEl = document.createElement('div');
  cursorEl.className = 'atlas-custom-cursor';
  cursorEl.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: ${zIndex};
    will-change: transform;
    mix-blend-mode: difference;
  `;

  // Render cursor content
  const cursorContent = render
    ? render(currentState)
    : CURSOR_TEMPLATES[style]({ color, secondaryColor, size, ringSize });
  cursorEl.innerHTML = cursorContent;

  // Create trail container
  let trailContainer: HTMLDivElement | null = null;
  if (trail) {
    trailContainer = document.createElement('div');
    trailContainer.className = 'atlas-cursor-trail';
    trailContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: ${zIndex - 1};
    `;
    document.body.appendChild(trailContainer);
  }

  document.body.appendChild(cursorEl);

  // Hide native cursor
  if (hideNative) {
    document.documentElement.style.cursor = 'none';
    const style = document.createElement('style');
    style.id = 'atlas-cursor-hide';
    style.textContent = `* { cursor: none !important; }`;
    document.head.appendChild(style);
  }

  // Get elements for dot and ring
  const _dotEl = cursorEl.querySelector('.atlas-cursor-dot') as HTMLElement | null;
  const ringEl = cursorEl.querySelector('.atlas-cursor-ring') as HTMLElement | null;

  function setState(state: CursorState): void {
    if (state === currentState) return;
    currentState = state;
    onStateChange?.(state);

    // Apply state styles
    let scale = 1;
    let opacity = 1;

    switch (state) {
      case 'hover':
        scale = hoverScale;
        break;
      case 'active':
        scale = activeScale;
        break;
      case 'hidden':
        opacity = 0;
        break;
      case 'text':
        // Expand cursor for text
        if (ringEl) {
          ringEl.style.width = `${(ringSize || size * 3) * 2}px`;
          ringEl.style.height = `${(ringSize || size * 3) * 2}px`;
          ringEl.style.borderRadius = '4px';
        }
        break;
      default:
        if (ringEl) {
          ringEl.style.width = '';
          ringEl.style.height = '';
          ringEl.style.borderRadius = '';
        }
    }

    cursorEl.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
    cursorEl.style.opacity = String(opacity);
  }

  function updatePosition(): void {
    if (!enabled) return;

    // Apply magnetic effect
    let finalX = targetX;
    let finalY = targetY;

    if (magnetic && magneticTarget) {
      const rect = magneticTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(targetX - centerX, targetY - centerY);

      if (distance < magneticRadius) {
        const strength = (1 - distance / magneticRadius) * magneticStrength;
        finalX = targetX + (centerX - targetX) * strength;
        finalY = targetY + (centerY - targetY) * strength;
      }
    }

    // Smooth lerp
    currentX += (finalX - currentX) * smoothing;
    currentY += (finalY - currentY) * smoothing;

    // Update cursor position
    const scale =
      currentState === 'hover' ? hoverScale : currentState === 'active' ? activeScale : 1;
    cursorEl.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;

    // Update trail
    if (trail && trailContainer) {
      const now = Date.now();
      trailPoints.push({ x: currentX, y: currentY, time: now });

      // Remove old points
      while (trailPoints.length > trailLength) {
        trailPoints.shift();
      }

      // Render trail
      trailContainer.innerHTML = trailPoints
        .map((point, i) => {
          const age = now - point.time;
          const opacity = Math.max(0, 1 - age / trailFadeDuration);
          const pointSize = size * (i / trailPoints.length) * 0.8;
          return `
            <div style="
              position: absolute;
              left: ${point.x}px;
              top: ${point.y}px;
              width: ${pointSize}px;
              height: ${pointSize}px;
              background: ${color};
              border-radius: 50%;
              opacity: ${opacity * 0.5};
              transform: translate(-50%, -50%);
            "></div>
          `;
        })
        .join('');
    }

    animationId = requestAnimationFrame(updatePosition);
  }

  function handleMouseMove(e: MouseEvent): void {
    targetX = e.clientX;
    targetY = e.clientY;
  }

  function handleMouseDown(): void {
    setState('active');
  }

  function handleMouseUp(): void {
    setState(magneticTarget ? 'hover' : 'default');
  }

  function handleMouseEnter(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Check for magnetic targets
    if (magnetic && target.matches(magneticTargets)) {
      magneticTarget = target;
    }

    // Check for hover targets
    if (target.matches(hoverTargets)) {
      setState('hover');
    }

    // Check for text targets
    if (target.matches(textTargets)) {
      setState('text');
    }
  }

  function handleMouseLeave(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    if (target === magneticTarget) {
      magneticTarget = null;
    }

    if (target.matches(hoverTargets) || target.matches(textTargets)) {
      setState('default');
    }
  }

  function handleMouseOut(): void {
    setState('hidden');
  }

  function handleMouseOver(): void {
    if (currentState === 'hidden') {
      setState('default');
    }
  }

  // Event listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mouseover', handleMouseEnter, true);
  document.addEventListener('mouseout', handleMouseLeave, true);
  document.documentElement.addEventListener('mouseleave', handleMouseOut);
  document.documentElement.addEventListener('mouseenter', handleMouseOver);

  // Start animation loop
  animationId = requestAnimationFrame(updatePosition);

  return {
    setPosition(x: number, y: number): void {
      targetX = x;
      targetY = y;
    },

    setState,

    getState(): CursorState {
      return currentState;
    },

    show(): void {
      cursorEl.style.display = '';
      setState('default');
    },

    hide(): void {
      cursorEl.style.display = 'none';
    },

    enable(): void {
      enabled = true;
      cursorEl.style.display = '';
      if (!animationId) {
        animationId = requestAnimationFrame(updatePosition);
      }
    },

    disable(): void {
      enabled = false;
      cursorEl.style.display = 'none';
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },

    destroy(): void {
      enabled = false;

      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseEnter, true);
      document.removeEventListener('mouseout', handleMouseLeave, true);
      document.documentElement.removeEventListener('mouseleave', handleMouseOut);
      document.documentElement.removeEventListener('mouseenter', handleMouseOver);

      cursorEl.remove();
      trailContainer?.remove();

      if (hideNative) {
        document.documentElement.style.cursor = '';
        const hideStyle = document.getElementById('atlas-cursor-hide');
        hideStyle?.remove();
      }
    },
  };
}

// ============================================================================
// Magnetic Effect Only
// ============================================================================

/**
 * Add magnetic effect to elements without custom cursor
 *
 * @example
 * ```typescript
 * // Make buttons magnetic
 * const cleanup = magneticElements('button', {
 *   strength: 0.4,
 *   radius: 80
 * });
 * ```
 */
export function magneticElements(
  selector: string,
  options: { strength?: number; radius?: number } = {}
): () => void {
  if (typeof document === 'undefined') return () => {};

  const { strength = 0.3, radius = 100 } = options;
  const elements = document.querySelectorAll<HTMLElement>(selector);

  const handlers = new Map<HTMLElement, (e: MouseEvent) => void>();

  elements.forEach((el) => {
    const originalTransform = el.style.transform;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      if (distance < radius) {
        const pull = (1 - distance / radius) * strength;
        const moveX = (e.clientX - centerX) * pull;
        const moveY = (e.clientY - centerY) * pull;
        el.style.transform = `${originalTransform} translate(${moveX}px, ${moveY}px)`;
      }
    };

    const handleLeave = () => {
      el.style.transform = originalTransform;
      el.style.transition = 'transform 0.3s ease-out';
      setTimeout(() => {
        el.style.transition = '';
      }, 300);
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);

    handlers.set(el, handleMove);
  });

  return () => {
    elements.forEach((el) => {
      const handler = handlers.get(el);
      if (handler) {
        el.removeEventListener('mousemove', handler);
      }
      el.style.transform = '';
    });
  };
}
