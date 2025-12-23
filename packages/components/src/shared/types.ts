/**
 * Shared types for all Atlas components
 * Ensures consistency across the component library
 */

// ============================================
// Base Component Types
// ============================================

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

// ============================================
// Placement & Positioning
// ============================================

/** Simple placement options */
export type Placement = 'top' | 'bottom' | 'left' | 'right';

/** Extended placement with alignment */
export type PlacementWithAlignment =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

/** Side of the screen (for drawers, sheets) */
export type Side = 'top' | 'bottom' | 'left' | 'right';

// ============================================
// Animation & Timing
// ============================================

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

// ============================================
// Z-Index Layers
// ============================================

/** Z-index layers for consistent stacking */
export const Z_INDEX = {
  dropdown: 100,
  sticky: 200,
  drawer: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

// ============================================
// Component Size & Variants
// ============================================

/** Common size options */
export type Size = 'sm' | 'md' | 'lg';

/** Extended size options */
export type SizeExtended = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Common variant types for styling */
export type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';

/** Visual state for components with feedback */
export type VisualState = 'idle' | 'loading' | 'success' | 'error';

// ============================================
// Form & Input Types
// ============================================

/** Common input types */
export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time'
  | 'datetime-local';

/** Form field validation state */
export interface ValidationState {
  /** Whether the field is valid */
  valid: boolean;
  /** Error message if invalid */
  message?: string;
}

// ============================================
// Event Types
// ============================================

/** Change event detail */
export interface ChangeEventDetail<T = unknown> {
  /** Previous value */
  previousValue: T;
  /** New value */
  value: T;
}

/** Select event detail */
export interface SelectEventDetail<T = unknown> {
  /** Selected value */
  value: T;
  /** Selected element */
  element?: HTMLElement;
}
