/**
 * @casoon/atlas - Meta-package that bundles all CASOON Atlas packages
 *
 * Provides unified imports for all Atlas functionality:
 * - Components (ui namespace)
 * - Effects (fx namespace)
 * - Utilities
 *
 * @example
 * ```typescript
 * // Namespace imports (recommended)
 * import { ui, fx, utils } from '@casoon/atlas';
 *
 * // Create a button
 * const button = ui.button(element, { ripple: true });
 *
 * // Add effects
 * const cleanup = fx(element)
 *   .add(fx.ripple())
 *   .add(fx.tilt())
 *   .apply();
 *
 * // Direct imports (tree-shakeable)
 * import { createButton, createModal } from '@casoon/atlas';
 * import { ripple, parallax } from '@casoon/atlas';
 * ```
 *
 * Note: CSS styles need to be imported separately:
 * ```typescript
 * import '@casoon/atlas-styles'
 * import '@casoon/atlas-styles/glass'
 * ```
 *
 * @module
 */

// ============================================================================
// Re-export all from packages
// ============================================================================

// Components
export * from '@casoon/atlas-components';

// Effects
export * from '@casoon/atlas-effects';

// ============================================================================
// Namespace: ui (Components)
// ============================================================================

import {
  createAccordion,
  createAvatar,
  createAvatarGroup,
  createBadge,
  createBentoGrid,
  createBreadcrumb,
  createButton,
  createCalendar,
  createCard,
  createCarousel,
  createCheckbox,
  createCombobox,
  createCommand,
  createDatePicker,
  createDialog,
  createDrawer,
  createDropdown,
  createForm,
  createInput,
  createInputOtp,
  createLabel,
  createMarquee,
  createMenu,
  createMenubar,
  createModal,
  createNavigationMenu,
  createPagination,
  createPopover,
  createProgress,
  createRadioGroup,
  createResizable,
  createScrollArea,
  createSelect,
  createSeparator,
  createSheet,
  createSidebar,
  createSkeleton,
  createSlider,
  createSwitch,
  createTable,
  createTabs,
  createTextarea,
  createToastManager,
  createToggle,
  createToggleGroup,
  createTooltip,
} from '@casoon/atlas-components';

/**
 * UI namespace - Shorthand access to all component factories
 *
 * @example
 * ```typescript
 * import { ui } from '@casoon/atlas';
 *
 * const button = ui.button(element);
 * const modal = ui.modal(element, { size: 'lg' });
 * const toast = ui.toast();
 * ```
 */
export const ui = {
  // Layout
  accordion: createAccordion,
  card: createCard,
  separator: createSeparator,
  resizable: createResizable,
  scrollArea: createScrollArea,
  sidebar: createSidebar,
  bentoGrid: createBentoGrid,

  // Navigation
  breadcrumb: createBreadcrumb,
  menu: createMenu,
  menubar: createMenubar,
  navigationMenu: createNavigationMenu,
  tabs: createTabs,
  pagination: createPagination,

  // Forms
  button: createButton,
  checkbox: createCheckbox,
  input: createInput,
  inputOtp: createInputOtp,
  label: createLabel,
  radioGroup: createRadioGroup,
  select: createSelect,
  combobox: createCombobox,
  slider: createSlider,
  switch: createSwitch,
  textarea: createTextarea,
  form: createForm,

  // Data Display
  avatar: createAvatar,
  avatarGroup: createAvatarGroup,
  badge: createBadge,
  calendar: createCalendar,
  carousel: createCarousel,
  progress: createProgress,
  skeleton: createSkeleton,
  table: createTable,
  marquee: createMarquee,

  // Overlays
  dialog: createDialog,
  drawer: createDrawer,
  dropdown: createDropdown,
  modal: createModal,
  popover: createPopover,
  sheet: createSheet,
  tooltip: createTooltip,

  // Utility
  command: createCommand,
  datePicker: createDatePicker,
  toast: createToastManager,
  toggle: createToggle,
  toggleGroup: createToggleGroup,
} as const;

// ============================================================================
// Namespace: fx (Effects)
// ============================================================================

import {
  cursorFollow,
  glassEffects,
  glow,
  magnetic,
  morphing,
  orbs,
  parallax,
  particles,
  ripple,
  scrollReveal,
  tilt,
  typewriter,
  wave,
} from '@casoon/atlas-effects';

// Re-export fx builder from effects
export { fx } from '@casoon/atlas-effects';

/**
 * Effects collection - All effect factories
 *
 * @example
 * ```typescript
 * import { effects } from '@casoon/atlas';
 *
 * const cleanup = effects.ripple(element);
 * const cleanup2 = effects.parallax(element, { speed: 0.5 });
 * ```
 */
export const effects = {
  ripple,
  orbs,
  parallax,
  scrollReveal,
  glass: glassEffects,
  particles,
  cursorFollow,
  tilt,
  glow,
  morphing,
  wave,
  magnetic,
  typewriter,
} as const;

// ============================================================================
// Namespace: utils (Utilities)
// ============================================================================

import {
  addListener,
  // Animations
  animate,
  animateAsync,
  animateSpring,
  announce,
  // Base component system
  createComponentFactory,
  createElement,
  createEventEmitter,
  createSpring,
  createTransition,
  DURATION,
  EASING,
  easingFn,
  // ARIA utilities
  generateId,
  getAnimation,
  getAnimations,
  getFocusableElements,
  getPlugins,
  // DOM utilities
  isBrowser,
  registerAnimation,
  registerPlugin,
  stagger,
  wrapComponent,
} from '@casoon/atlas-components';

/**
 * Utilities namespace - Helper functions and tools
 *
 * @example
 * ```typescript
 * import { utils } from '@casoon/atlas';
 *
 * // State management
 * const store = utils.createStore({ count: 0 });
 *
 * // Animations
 * await utils.animate(element, 'fadeIn');
 * await utils.stagger(elements, 'slideInUp', { delay: 50 });
 *
 * // Spring physics
 * utils.animateSpring({
 *   from: 0,
 *   to: 100,
 *   onUpdate: (v) => element.style.left = `${v}px`
 * });
 * ```
 */
export const utils = {
  // Component factory
  createComponentFactory,
  createEventEmitter,
  registerPlugin,
  getPlugins,
  wrapComponent,

  // Animations
  animate,
  animateAsync,
  stagger,
  createSpring,
  animateSpring,
  createTransition,
  registerAnimation,
  getAnimation,
  getAnimations,

  // Constants
  EASING,
  DURATION,
  easingFn,

  // DOM
  isBrowser,
  createElement,
  addListener,
  getFocusableElements,

  // ARIA
  generateId,
  announce,
} as const;

// ============================================================================
// Quick Setup
// ============================================================================

import { atlasDestroy, atlasInit } from '@casoon/atlas-components';

/**
 * Atlas quick setup
 *
 * @example
 * ```typescript
 * import { atlas } from '@casoon/atlas';
 *
 * // Initialize all components with data-atlas attributes
 * atlas.init();
 *
 * // Cleanup on unmount
 * atlas.destroy();
 *
 * // Access namespaces
 * atlas.ui.button(element);
 * atlas.fx(element).add(atlas.effects.ripple()).apply();
 * ```
 */
export const atlas = {
  init: atlasInit,
  destroy: atlasDestroy,
  ui,
  effects,
  utils,
} as const;

// Default export for convenience
export default atlas;
