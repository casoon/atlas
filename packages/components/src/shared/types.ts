/**
 * Shared types for all Atlas components
 * Ensures consistency across the component library
 */

/** Base options that all components share */
export interface BaseComponentOptions {
  /** Called when component is opened/activated */
  onOpen?: () => void;
  /** Called when component is closed/deactivated */
  onClose?: () => void;
}

/** Base state that all components expose */
export interface BaseComponentState {
  /** Whether the component is currently open/active */
  readonly isOpen: boolean;
  /** Open the component */
  open: () => void;
  /** Close the component */
  close: () => void;
  /** Toggle the component state */
  toggle: () => void;
  /** Clean up all event listeners and DOM elements */
  destroy: () => void;
}

/** Placement options for positioned components */
export type Placement = 'top' | 'bottom' | 'left' | 'right';

/** Animation timing presets */
export type AnimationTiming = 'instant' | 'fast' | 'normal' | 'slow';

/** Animation timing values in milliseconds */
export const ANIMATION_DURATION: Record<AnimationTiming, number> = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
};

/** CSS easing functions for premium feel */
export const EASING = {
  /** Standard ease for most animations */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Decelerate - elements entering the screen */
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Accelerate - elements leaving the screen */
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Bounce - for playful feedback */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  /** Spring - natural feeling */
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

/** Z-index layers for consistent stacking */
export const Z_INDEX = {
  dropdown: 100,
  sticky: 200,
  drawer: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;
