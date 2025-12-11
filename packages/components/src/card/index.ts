/**
 * Card Component
 *
 * Interactive card with premium micro-interactions:
 * - Hover lift effect (rises up with shadow)
 * - 3D tilt effect (follows mouse position)
 * - Shine/glare effect on hover
 * - Smooth entrance animations
 * - Click feedback
 *
 * @example
 * ```typescript
 * const card = createCard(document.getElementById('my-card'), {
 *   hover: 'lift',
 *   tilt: true,
 *   shine: true,
 *   onClick: () => console.log('Card clicked!'),
 * });
 *
 * // Trigger entrance animation
 * card.animateIn();
 *
 * // Clean up
 * card.destroy();
 * ```
 */

import { addListener, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

/** Hover effect type */
export type CardHoverEffect = 'none' | 'lift' | 'scale' | 'glow';

export interface CardOptions {
  /** Hover effect type (default: 'lift') */
  hover?: CardHoverEffect;
  /** Enable 3D tilt effect on hover (default: false) */
  tilt?: boolean;
  /** Maximum tilt angle in degrees (default: 10) */
  tiltMax?: number;
  /** Enable shine/glare effect (default: false) */
  shine?: boolean;
  /** Lift distance in pixels (default: 4) */
  liftDistance?: number;
  /** Enable click feedback (default: true) */
  clickable?: boolean;
  /** Called when card is clicked */
  onClick?: () => void;
  /** Called when hover state changes */
  onHoverChange?: (isHovered: boolean) => void;
}

export interface CardState {
  /** Whether card is currently hovered */
  readonly isHovered: boolean;
  /** Trigger entrance animation */
  animateIn: (delay?: number) => void;
  /** Trigger exit animation */
  animateOut: () => Promise<void>;
  /** Clean up event listeners */
  destroy: () => void;
}

export function createCard(element: HTMLElement, options: CardOptions = {}): CardState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopCardState();
  }

  const {
    hover = 'lift',
    tilt = false,
    tiltMax = 10,
    shine = false,
    liftDistance = 4,
    clickable = true,
    onClick,
    onHoverChange,
  } = options;

  let isHovered = false;
  let cleanupListeners: (() => void)[] = [];
  let shineElement: HTMLElement | null = null;
  let rafId: number | null = null;

  // Store original styles
  const originalTransform = element.style.transform;
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;

  // Apply base styles
  element.style.transition = `
    transform ${ANIMATION_DURATION.normal}ms ${EASING.spring},
    box-shadow ${ANIMATION_DURATION.normal}ms ${EASING.standard}
  `
    .replace(/\s+/g, ' ')
    .trim();
  element.style.transformStyle = 'preserve-3d';
  element.style.willChange = 'transform';

  if (clickable) {
    element.style.cursor = 'pointer';
  }

  // Create shine overlay if enabled
  if (shine) {
    shineElement = document.createElement('div');
    shineElement.className = 'atlas-card-shine';
    shineElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      background: linear-gradient(
        105deg,
        transparent 40%,
        rgba(255, 255, 255, 0.1) 45%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0.1) 55%,
        transparent 60%
      );
      background-size: 200% 200%;
      background-position: 100% 0%;
      opacity: 0;
      transition: opacity ${ANIMATION_DURATION.fast}ms ${EASING.standard};
      border-radius: inherit;
    `;

    // Ensure card has relative positioning for shine overlay
    const computedPosition = window.getComputedStyle(element).position;
    if (computedPosition === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(shineElement);
  }

  // Calculate tilt based on mouse position
  const calculateTilt = (
    e: MouseEvent,
    rect: DOMRect
  ): {
    rotateX: number;
    rotateY: number;
    percentX: number;
    percentY: number;
  } => {
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = (x / rect.width - 0.5) * 2; // -1 to 1
    const percentY = (y / rect.height - 0.5) * 2; // -1 to 1

    const rotateX = -percentY * tiltMax; // Inverted for natural feel
    const rotateY = percentX * tiltMax;

    return { rotateX, rotateY, percentX, percentY };
  };

  // Apply hover effects
  const applyHoverEffects = (e?: MouseEvent) => {
    let transform = '';
    let boxShadow = '';

    switch (hover) {
      case 'lift':
        transform = `translateY(-${liftDistance}px)`;
        boxShadow = `
          0 ${liftDistance}px ${liftDistance * 2}px rgba(0, 0, 0, 0.1),
          0 ${liftDistance / 2}px ${liftDistance}px rgba(0, 0, 0, 0.08)
        `;
        break;

      case 'scale':
        transform = 'scale(1.02)';
        boxShadow = '0 10px 30px rgba(0, 0, 0, 0.12)';
        break;

      case 'glow':
        boxShadow = '0 0 30px rgba(var(--atlas-primary-rgb, 59, 130, 246), 0.4)';
        break;
    }

    // Add tilt if enabled and mouse event provided
    if (tilt && e) {
      const rect = element.getBoundingClientRect();
      const { rotateX, rotateY, percentX } = calculateTilt(e, rect);

      if (hover === 'lift') {
        transform = `translateY(-${liftDistance}px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      } else if (hover === 'scale') {
        transform = `scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      } else {
        transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }

      // Update shine position
      if (shineElement) {
        const shineX = (percentX + 1) * 50; // 0 to 100
        shineElement.style.backgroundPosition = `${shineX}% 0%`;
      }
    }

    element.style.transform = transform;
    element.style.boxShadow = boxShadow;
  };

  // Remove hover effects
  const removeHoverEffects = () => {
    // Always reset to none/empty - don't rely on originalTransform
    // as it may have been captured during grid stagger animation
    element.style.transform = '';
    element.style.boxShadow = originalBoxShadow || '';

    if (shineElement) {
      shineElement.style.opacity = '0';
    }
  };

  // Event handlers
  const handleMouseEnter = () => {
    isHovered = true;
    onHoverChange?.(true);

    if (shineElement) {
      shineElement.style.opacity = '1';
    }

    if (!tilt) {
      applyHoverEffects();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isHovered) return;

    // Use RAF to throttle updates
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      applyHoverEffects(e);
    });
  };

  const handleMouseLeave = () => {
    isHovered = false;
    onHoverChange?.(false);

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    removeHoverEffects();
  };

  const handleClick = () => {
    if (!clickable) return;

    // Click feedback - quick scale down and up
    if (element.animate) {
      element.animate(
        [
          { transform: element.style.transform },
          {
            transform: `${element.style.transform || ''} scale(0.98)`.trim(),
          },
          { transform: element.style.transform },
        ],
        {
          duration: 150,
          easing: EASING.bounce,
        }
      );
    }

    onClick?.();
  };

  // Set up listeners
  cleanupListeners.push(
    addListener(element, 'mouseenter', handleMouseEnter as EventListener),
    addListener(element, 'mousemove', handleMouseMove as EventListener),
    addListener(element, 'mouseleave', handleMouseLeave as EventListener),
    addListener(element, 'click', handleClick as EventListener)
  );

  // Entrance animation
  const animateIn = (delay: number = 0) => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px) scale(0.95)';

    setTimeout(() => {
      element.style.transition = `
        opacity ${ANIMATION_DURATION.normal}ms ${EASING.decelerate},
        transform ${ANIMATION_DURATION.normal}ms ${EASING.spring}
      `
        .replace(/\s+/g, ' ')
        .trim();
      element.style.opacity = '1';
      element.style.transform = '';

      // Reset transition after animation
      setTimeout(() => {
        element.style.transition = `
          transform ${ANIMATION_DURATION.normal}ms ${EASING.spring},
          box-shadow ${ANIMATION_DURATION.normal}ms ${EASING.standard}
        `
          .replace(/\s+/g, ' ')
          .trim();
      }, ANIMATION_DURATION.normal);
    }, delay);
  };

  // Exit animation
  const animateOut = (): Promise<void> => {
    return new Promise((resolve) => {
      element.style.transition = `
        opacity ${ANIMATION_DURATION.fast}ms ${EASING.accelerate},
        transform ${ANIMATION_DURATION.fast}ms ${EASING.accelerate}
      `
        .replace(/\s+/g, ' ')
        .trim();
      element.style.opacity = '0';
      element.style.transform = 'translateY(-10px) scale(0.95)';

      setTimeout(resolve, ANIMATION_DURATION.fast);
    });
  };

  // Cleanup
  const destroy = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    cleanupListeners.forEach((cleanup) => cleanup());
    cleanupListeners = [];

    if (shineElement) {
      shineElement.remove();
    }

    element.style.transform = originalTransform;
    element.style.transition = originalTransition;
    element.style.boxShadow = originalBoxShadow;
  };

  return {
    get isHovered() {
      return isHovered;
    },
    animateIn,
    animateOut,
    destroy,
  };
}

/** No-op card state for SSR */
function createNoopCardState(): CardState {
  return {
    get isHovered() {
      return false;
    },
    animateIn: () => {},
    animateOut: () => Promise.resolve(),
    destroy: () => {},
  };
}

/**
 * Stagger entrance animations for a list of cards
 *
 * @example
 * ```typescript
 * const cards = document.querySelectorAll('.card');
 * staggerCards(cards, { delay: 100 });
 * ```
 */
export function staggerCards(
  elements: NodeListOf<HTMLElement> | HTMLElement[],
  options: { delay?: number; initialDelay?: number } = {}
): void {
  const { delay = 50, initialDelay = 0 } = options;

  Array.from(elements).forEach((element, index) => {
    const card = createCard(element, { hover: 'lift' });
    card.animateIn(initialDelay + index * delay);
  });
}
