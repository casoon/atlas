// Targeted re-exports - no export * for optimal tree-shaking

export { type ConfettiOptions, confetti } from './confetti/index';
// Effect Composition API (fx)
export {
  combineEffects,
  type EffectBuilder,
  type EffectDefinition,
  type EffectFactory,
  type EffectFn,
  type EffectManager,
  type EffectPreset,
  fx,
  registerDefaultPresets,
  sequenceEffects,
  wrapEffect,
} from './core/fx';
// Interactive effects
export { type CursorFollowOptions, cursorFollow } from './cursor-follow/index';
// Custom Cursor
export {
  type CursorController,
  type CursorState,
  type CursorStyle,
  type CustomCursorOptions,
  createCustomCursor,
  magneticElements,
} from './custom-cursor/index';
// Gesture Recognition
export {
  createGesture,
  type GestureController,
  type GestureOptions,
  type GestureState,
  type LongPressEvent,
  onLongPress,
  onPinch,
  onSwipe,
  type PanEvent,
  type PinchEvent,
  type Point,
  type RotationEvent,
  type SwipeDirection,
  type SwipeEvent,
} from './gesture/index';
// Advanced effects
export { type GlassEffectsOptions, glassEffects } from './glass-effects/index';
export { type GlitchOptions, glitch } from './glitch/index';
// Visual effects
export { type GlowOptions, glow } from './glow/index';
// Film Grain / Noise
export {
  createCSSGrain,
  createGrain,
  createGrainPreset,
  type GrainController,
  type GrainOptions,
  grainPresets,
} from './grain/index';
export { type MagneticOptions, magnetic } from './magnetic/index';
export { type MorphingOptions, morphing } from './morphing/index';
export { type NoiseOptions, noise } from './noise/index';
export { type OrbsOptions, orbs } from './orbs/index';
export { type ParallaxOptions, parallax } from './parallax/index';
export { type ParticlesOptions, particles } from './particles/index';
export { type ProgressRingOptions, progressRing } from './progress-ring/index';
// Core effects
export { type RippleOptions, ripple } from './ripple/index';
// Modern Scroll Effects (2025)
export {
  type HorizontalScrollOptions,
  horizontalScroll,
  type MagneticSnapOptions,
  magneticSnap,
  type ParallaxLayerOptions,
  parallaxLayer,
  type ScrollCounterOptions,
  type ScrollProgressOptions,
  type ScrollTimelineOptions,
  type ScrollVelocityOptions,
  type StickyTransitionOptions,
  scrollCounter,
  scrollProgress,
  scrollTimeline,
  scrollVelocity,
  stickyTransition,
  type TextSplitOptions,
  textSplit,
} from './scroll-effects/index';
export { type ScrollRevealOptions, scrollReveal } from './scroll-reveal/index';
export { type ShimmerOptions, shimmer } from './shimmer/index';
// Loading & Progress
export { type SkeletonEffectOptions, skeletonEffect } from './skeleton/index';
// Special effects
export { type SpotlightOptions, spotlight } from './spotlight/index';
export { type TextScrambleOptions, textScramble } from './text-scramble/index';
// Theme Transitions
export {
  createThemeToggle,
  createThemeTransition,
  type Theme,
  type ThemeController,
  type ThemeToggleOptions,
  type ThemeTransitionEffect,
  type ThemeTransitionOptions,
  themeTransition,
} from './theme-transition/index';
export { type TiltOptions, tilt } from './tilt/index';
// Text effects
export { type TypewriterOptions, typewriter } from './typewriter/index';
// View Transitions (2025)
export {
  circularReveal,
  injectViewTransitionStyles,
  markSharedElement,
  type RevealTransitionOptions,
  type SharedTransitionOptions,
  sharedElementTransition,
  slideTransition,
  startViewTransition,
  supportsViewTransitions,
  type ViewTransitionOptions,
  type ViewTransitionResult,
} from './view-transition/index';
export { type WaveOptions, wave } from './wave/index';
