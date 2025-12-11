/**
 * Button Component
 *
 * Enhanced button with premium micro-interactions:
 * - "I see you" tap feedback (scale + brightness)
 * - Ripple effect on click
 * - Breathing hover effect (subtle pulse/glow)
 * - Loading state with smooth spinner
 * - Success state with checkmark animation
 * - State transitions (Normal ↔ Loading ↔ Success)
 * - Disabled state handling
 * - Haptic feedback support (on mobile)
 *
 * Based on: "A button that ignores you creates emotional damage."
 *
 * @example
 * ```typescript
 * const button = createButton(document.getElementById('my-button'), {
 *   ripple: true,
 *   hover: 'glow',
 *   onPress: async () => {
 *     button.setLoading(true);
 *     await saveData();
 *     button.setSuccess(); // Shows checkmark, then returns to normal
 *   },
 * });
 * ```
 */

import { announce } from '../shared/aria';
import { addListener, createElement, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

/** Hover effect type */
export type ButtonHoverEffect = 'none' | 'glow' | 'lift' | 'breathing';

/** Button visual state */
export type ButtonVisualState = 'idle' | 'loading' | 'success' | 'error';

export interface ButtonOptions {
  /** Enable ripple effect on click (default: true) */
  ripple?: boolean;
  /** Hover effect type (default: 'breathing') */
  hover?: ButtonHoverEffect;
  /** Enable haptic feedback on supported devices (default: true) */
  haptic?: boolean;
  /** Scale factor on press (default: 0.97) */
  pressScale?: number;
  /** Duration of press animation in ms (default: 150) */
  pressDuration?: number;
  /** Duration to show success state in ms (default: 1500) */
  successDuration?: number;
  /** Called when button is pressed */
  onPress?: () => void;
  /** Called when loading state changes */
  onLoadingChange?: (loading: boolean) => void;
  /** Called when visual state changes */
  onStateChange?: (state: ButtonVisualState) => void;
}

export interface ButtonState {
  /** Whether button is currently loading */
  readonly isLoading: boolean;
  /** Whether button is currently disabled */
  readonly isDisabled: boolean;
  /** Current visual state */
  readonly visualState: ButtonVisualState;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Show success state (auto-returns to idle) */
  setSuccess: (message?: string) => void;
  /** Show error state (auto-returns to idle) */
  setError: (message?: string) => void;
  /** Programmatically trigger press feedback */
  triggerPress: () => void;
  /** Clean up event listeners */
  destroy: () => void;
}

export function createButton(element: HTMLElement, options: ButtonOptions = {}): ButtonState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopButtonState();
  }

  const {
    ripple = true,
    hover = 'breathing',
    haptic = true,
    pressScale = 0.97,
    pressDuration = 150,
    successDuration = 1500,
    onPress,
    onLoadingChange,
    onStateChange,
  } = options;

  let isLoading = false;
  let isDisabled =
    element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
  let isPressed = false;
  let isHovered = false;
  let visualState: ButtonVisualState = 'idle';
  let stateElement: HTMLElement | null = null;
  let originalContent: string = '';
  let cleanupListeners: (() => void)[] = [];
  let stateTimeout: ReturnType<typeof setTimeout> | null = null;
  let breathingAnimation: Animation | null = null;

  // Store original styles
  const originalTransition = element.style.transition;
  const originalTransform = element.style.transform;
  const originalFilter = element.style.filter;
  const originalBoxShadow = element.style.boxShadow;

  // Apply base styles for animations
  element.style.transition = `
    transform ${pressDuration}ms ${EASING.bounce},
    filter ${pressDuration}ms ${EASING.standard},
    box-shadow ${ANIMATION_DURATION.fast}ms ${EASING.standard}
  `
    .replace(/\s+/g, ' ')
    .trim();
  element.style.transformOrigin = 'center center';
  element.style.position = 'relative';
  element.style.overflow = 'hidden';

  // Haptic feedback helper
  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Set visual state with transition
  const setVisualState = (newState: ButtonVisualState) => {
    if (visualState === newState) return;
    visualState = newState;
    onStateChange?.(newState);
  };

  // Hover effects
  const applyHoverEffect = () => {
    if (isDisabled || isLoading || hover === 'none') return;

    switch (hover) {
      case 'glow':
        element.style.boxShadow = '0 0 20px rgba(var(--atlas-primary-rgb, 59, 130, 246), 0.5)';
        element.style.filter = 'brightness(1.05)';
        break;

      case 'lift':
        element.style.transform = 'translateY(-2px)';
        element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        break;

      case 'breathing':
        // Start subtle pulse animation
        if (!breathingAnimation && element.animate) {
          breathingAnimation = element.animate(
            [
              { transform: 'scale(1)', filter: 'brightness(1)' },
              { transform: 'scale(1.02)', filter: 'brightness(1.05)' },
              { transform: 'scale(1)', filter: 'brightness(1)' },
            ],
            {
              duration: 2000,
              iterations: Number.POSITIVE_INFINITY,
              easing: 'ease-in-out',
            }
          );
        }
        break;
    }
  };

  const removeHoverEffect = () => {
    if (hover === 'none') return;

    // Stop breathing animation
    if (breathingAnimation) {
      breathingAnimation.cancel();
      breathingAnimation = null;
    }

    element.style.boxShadow = originalBoxShadow;
    if (!isPressed) {
      element.style.transform = originalTransform || '';
      element.style.filter = originalFilter || '';
    }
  };

  // Ripple effect
  const createRipple = (e: MouseEvent | TouchEvent) => {
    if (!ripple || isDisabled || isLoading) return;

    const rect = element.getBoundingClientRect();
    let x: number, y: number;

    if (e instanceof MouseEvent) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else {
      const touch = e.touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    }

    const size = Math.max(rect.width, rect.height) * 2;

    const rippleElement = createElement('span', {
      className: 'atlas-button-ripple',
      styles: {
        position: 'absolute',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        opacity: '0.2',
        transform: 'scale(0)',
        pointerEvents: 'none',
        width: `${size}px`,
        height: `${size}px`,
        left: `${x - size / 2}px`,
        top: `${y - size / 2}px`,
        animation: `atlas-ripple ${ANIMATION_DURATION.normal}ms ${EASING.decelerate} forwards`,
      },
    });

    if (rippleElement) {
      element.appendChild(rippleElement);
      setTimeout(() => rippleElement.remove(), ANIMATION_DURATION.normal);
    }
  };

  // Press animation
  const pressDown = () => {
    if (isDisabled || isLoading || isPressed) return;
    isPressed = true;

    // Stop breathing while pressed
    if (breathingAnimation) {
      breathingAnimation.pause();
    }

    element.style.transform = `scale(${pressScale})`;
    element.style.filter = 'brightness(0.95)';

    triggerHaptic();
  };

  const pressUp = () => {
    if (!isPressed) return;
    isPressed = false;

    element.style.transform = isHovered && hover === 'lift' ? 'translateY(-2px)' : '';
    element.style.filter = isHovered && hover === 'glow' ? 'brightness(1.05)' : '';

    // Resume breathing if still hovered
    if (breathingAnimation && isHovered) {
      breathingAnimation.play();
    }
  };

  // Create state indicator (spinner, checkmark, or error icon)
  const createStateIndicator = (type: 'spinner' | 'success' | 'error'): HTMLElement | null => {
    if (type === 'spinner') {
      return createElement('span', {
        className: 'atlas-button-spinner',
        attributes: { 'aria-hidden': 'true' },
        styles: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1em',
          height: '1em',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'atlas-spin 600ms linear infinite',
        },
      });
    }

    if (type === 'success') {
      // Animated checkmark SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '1em');
      svg.setAttribute('height', '1em');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '3');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'display: inline-block; vertical-align: middle;';

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5 13l4 4L19 7');
      path.style.cssText = `
        stroke-dasharray: 24;
        stroke-dashoffset: 24;
        animation: atlas-checkmark-draw 400ms ${EASING.decelerate} forwards;
      `;

      svg.appendChild(path);
      return svg as unknown as HTMLElement;
    }

    if (type === 'error') {
      // X icon
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '1em');
      svg.setAttribute('height', '1em');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '3');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'display: inline-block; vertical-align: middle;';

      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', '6');
      line1.setAttribute('y1', '6');
      line1.setAttribute('x2', '18');
      line1.setAttribute('y2', '18');
      line1.style.cssText = `
        stroke-dasharray: 17;
        stroke-dashoffset: 17;
        animation: atlas-x-draw 300ms ${EASING.decelerate} forwards;
      `;

      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', '18');
      line2.setAttribute('y1', '6');
      line2.setAttribute('x2', '6');
      line2.setAttribute('y2', '18');
      line2.style.cssText = `
        stroke-dasharray: 17;
        stroke-dashoffset: 17;
        animation: atlas-x-draw 300ms ${EASING.decelerate} 100ms forwards;
      `;

      svg.appendChild(line1);
      svg.appendChild(line2);
      return svg as unknown as HTMLElement;
    }

    return null;
  };

  // Event handlers
  const handleMouseEnter = () => {
    isHovered = true;
    applyHoverEffect();
  };

  const handleMouseLeave = () => {
    isHovered = false;
    removeHoverEffect();
    if (isPressed) {
      pressUp();
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    pressDown();
    createRipple(e);
  };

  const handleMouseUp = () => {
    pressUp();
  };

  const handleTouchStart = (e: TouchEvent) => {
    pressDown();
    createRipple(e);
  };

  const handleTouchEnd = () => {
    pressUp();
  };

  const handleClick = () => {
    if (isDisabled || isLoading) return;
    onPress?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pressDown();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      pressUp();
      if (!isDisabled && !isLoading) {
        onPress?.();
        triggerHaptic();
      }
    }
  };

  // Set up listeners
  cleanupListeners.push(
    addListener(element, 'mouseenter', handleMouseEnter as EventListener),
    addListener(element, 'mouseleave', handleMouseLeave as EventListener),
    addListener(element, 'mousedown', handleMouseDown as EventListener),
    addListener(element, 'mouseup', handleMouseUp as EventListener),
    addListener(element, 'touchstart', handleTouchStart as EventListener, {
      passive: true,
    }),
    addListener(element, 'touchend', handleTouchEnd as EventListener),
    addListener(element, 'click', handleClick as EventListener),
    addListener(element, 'keydown', handleKeyDown as EventListener),
    addListener(element, 'keyup', handleKeyUp as EventListener)
  );

  // Loading state
  const setLoading = (loading: boolean) => {
    if (isLoading === loading) return;
    isLoading = loading;

    // Clear any pending state timeout
    if (stateTimeout) {
      clearTimeout(stateTimeout);
      stateTimeout = null;
    }

    if (loading) {
      setVisualState('loading');
      originalContent = element.innerHTML;

      // Fade out current content
      element.style.transition = `opacity ${ANIMATION_DURATION.fast}ms ${EASING.standard}`;
      element.style.opacity = '0.5';

      setTimeout(() => {
        stateElement = createStateIndicator('spinner');
        if (stateElement) {
          element.innerHTML = '';
          element.appendChild(stateElement);
        }
        element.style.opacity = '1';
      }, ANIMATION_DURATION.fast / 2);

      element.setAttribute('aria-busy', 'true');
      element.style.pointerEvents = 'none';
    } else {
      // Restore original content with fade
      element.style.opacity = '0.5';

      setTimeout(() => {
        element.innerHTML = originalContent;
        element.style.opacity = '1';
        stateElement = null;
      }, ANIMATION_DURATION.fast / 2);

      element.removeAttribute('aria-busy');
      element.style.pointerEvents = '';
      setVisualState('idle');
    }

    onLoadingChange?.(loading);
  };

  // Success state
  const setSuccess = (message?: string) => {
    if (stateTimeout) {
      clearTimeout(stateTimeout);
    }

    setVisualState('success');
    isLoading = false;

    // Store content if not already stored
    if (!originalContent) {
      originalContent = element.innerHTML;
    }

    // Haptic success pattern
    triggerHaptic([10, 50, 10]);

    // Show success indicator
    element.style.opacity = '0.5';

    setTimeout(() => {
      stateElement = createStateIndicator('success');
      if (stateElement) {
        element.innerHTML = '';
        element.appendChild(stateElement);
      }
      element.style.opacity = '1';

      // Bounce animation
      if (element.animate) {
        element.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
          {
            duration: 300,
            easing: EASING.bounce,
          }
        );
      }
    }, ANIMATION_DURATION.fast / 2);

    element.removeAttribute('aria-busy');
    element.style.pointerEvents = '';

    // Announce success
    if (message) {
      announce(message, 'polite');
    }

    // Return to normal after delay
    stateTimeout = setTimeout(() => {
      element.style.opacity = '0.5';

      setTimeout(() => {
        element.innerHTML = originalContent;
        element.style.opacity = '1';
        stateElement = null;
        originalContent = '';
        setVisualState('idle');
      }, ANIMATION_DURATION.fast / 2);
    }, successDuration);
  };

  // Error state
  const setError = (message?: string) => {
    if (stateTimeout) {
      clearTimeout(stateTimeout);
    }

    setVisualState('error');
    isLoading = false;

    if (!originalContent) {
      originalContent = element.innerHTML;
    }

    // Haptic error pattern
    triggerHaptic([50, 100, 50]);

    element.style.opacity = '0.5';

    setTimeout(() => {
      stateElement = createStateIndicator('error');
      if (stateElement) {
        element.innerHTML = '';
        element.appendChild(stateElement);
      }
      element.style.opacity = '1';

      // Shake animation
      if (element.animate) {
        element.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(0)' },
          ],
          {
            duration: 400,
            easing: 'ease-in-out',
          }
        );
      }
    }, ANIMATION_DURATION.fast / 2);

    element.removeAttribute('aria-busy');
    element.style.pointerEvents = '';

    if (message) {
      announce(message, 'assertive');
    }

    // Return to normal after delay
    stateTimeout = setTimeout(() => {
      element.style.opacity = '0.5';

      setTimeout(() => {
        element.innerHTML = originalContent;
        element.style.opacity = '1';
        stateElement = null;
        originalContent = '';
        setVisualState('idle');
      }, ANIMATION_DURATION.fast / 2);
    }, successDuration);
  };

  // Disabled state
  const setDisabled = (disabled: boolean) => {
    isDisabled = disabled;

    if (disabled) {
      removeHoverEffect();
      element.setAttribute('aria-disabled', 'true');
      element.style.opacity = '0.5';
      element.style.cursor = 'not-allowed';
    } else {
      element.removeAttribute('aria-disabled');
      element.style.opacity = '';
      element.style.cursor = '';
    }
  };

  // Manual trigger
  const triggerPress = () => {
    if (isDisabled || isLoading) return;

    pressDown();
    triggerHaptic();

    setTimeout(() => {
      pressUp();
      onPress?.();
    }, pressDuration);
  };

  // Cleanup
  const destroy = () => {
    if (stateTimeout) {
      clearTimeout(stateTimeout);
    }

    if (breathingAnimation) {
      breathingAnimation.cancel();
    }

    cleanupListeners.forEach((cleanup) => cleanup());
    cleanupListeners = [];

    element.style.transition = originalTransition;
    element.style.transform = originalTransform;
    element.style.filter = originalFilter;
    element.style.boxShadow = originalBoxShadow;

    if (originalContent) {
      element.innerHTML = originalContent;
      element.removeAttribute('aria-busy');
    }
  };

  return {
    get isLoading() {
      return isLoading;
    },
    get isDisabled() {
      return isDisabled;
    },
    get visualState() {
      return visualState;
    },
    setLoading,
    setDisabled,
    setSuccess,
    setError,
    triggerPress,
    destroy,
  };
}

/** No-op button state for SSR */
function createNoopButtonState(): ButtonState {
  return {
    get isLoading() {
      return false;
    },
    get isDisabled() {
      return false;
    },
    get visualState(): ButtonVisualState {
      return 'idle';
    },
    setLoading: () => {},
    setDisabled: () => {},
    setSuccess: () => {},
    setError: () => {},
    triggerPress: () => {},
    destroy: () => {},
  };
}
