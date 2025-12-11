/**
 * CASOON Atlas Components
 *
 * Premium headless UI components with micro-interactions.
 * Framework-agnostic, accessible, and SSR-safe.
 *
 * Two usage patterns:
 * 1. Declarative (recommended): Use data-atlas attributes
 *    <button data-atlas="button" data-ripple>Save</button>
 *
 * 2. Programmatic: Use create* functions directly
 *    const btn = createButton(element, { ripple: true });
 */

export {
  type AccordionOptions,
  type AccordionState,
  createAccordion,
} from './accordion/index';
// Auto-init system (declarative usage)
export {
  atlasDestroy,
  atlasInit,
  atlasInitElement,
} from './auto/index';
export {
  type ButtonHoverEffect,
  type ButtonOptions,
  type ButtonState,
  type ButtonVisualState,
  createButton,
} from './button/index';
export {
  type CardHoverEffect,
  type CardOptions,
  type CardState,
  createCard,
  staggerCards,
} from './card/index';
export {
  createDrawer,
  type DrawerOptions,
  type DrawerSide,
  type DrawerState,
} from './drawer/index';
export {
  createDropdown,
  type DropdownOptions,
  type DropdownState,
} from './dropdown/index';
export { createForm, type FormField, type FormOptions } from './form/index';
export { createModal, type ModalOptions, type ModalState } from './modal/index';
export {
  createProgress,
  createStepProgress,
  type ProgressOptions,
  type ProgressState,
  type ProgressType,
  type ProgressVisualState,
  type StepProgressOptions,
  type StepProgressState,
} from './progress/index';
export * from './shared';
export {
  createInlineSkeleton,
  createSkeleton,
  type SkeletonAnimation,
  type SkeletonOptions,
  type SkeletonState,
  type SkeletonType,
} from './skeleton/index';
export {
  createStaggerAnimation,
  type StaggerAnimation,
  type StaggerCleanup,
  type StaggerGridOptions,
  type StaggerOptions,
  type StaggerOrder,
  type StaggerTrigger,
  stagger,
  staggerGrid,
} from './stagger/index';
export { createTabs, type TabsOptions, type TabsState } from './tabs/index';
export {
  createToastManager,
  type ToastAction,
  type ToastItem,
  type ToastManager,
  type ToastManagerOptions,
  type ToastOptions,
  type ToastPosition,
  type ToastType,
} from './toast/index';
export {
  createTooltip,
  type TooltipOptions,
  type TooltipState,
} from './tooltip/index';

export const VERSION = '0.0.4';
