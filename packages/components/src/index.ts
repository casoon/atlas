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

export { type AccordionOptions, type AccordionState, createAccordion } from './accordion/index';
// Auto-init system (declarative usage)
export { atlasDestroy, atlasInit, atlasInitElement } from './auto/index';
export {
  type AvatarGroupOptions,
  type AvatarGroupState,
  type AvatarOptions,
  type AvatarShape,
  type AvatarSize,
  type AvatarState,
  createAvatar,
  createAvatarGroup,
  initAvatars,
} from './avatar/index';
export {
  type BadgeOptions,
  type BadgeSize,
  type BadgeState,
  type BadgeVariant,
  createBadge,
} from './badge/index';
export {
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbState,
  createBreadcrumb,
  initBreadcrumbs,
} from './breadcrumb/index';
export {
  type ButtonHoverEffect,
  type ButtonOptions,
  type ButtonState,
  type ButtonVisualState,
  createButton,
} from './button/index';
export {
  type CalendarMode,
  type CalendarOptions,
  type CalendarState,
  createCalendar,
  initCalendars,
} from './calendar/index';
export {
  type CardHoverEffect,
  type CardOptions,
  type CardState,
  createCard,
  staggerCards,
} from './card/index';
export {
  type CarouselOptions,
  type CarouselOrientation,
  type CarouselState,
  createCarousel,
  initCarousels,
} from './carousel/index';
export { type CheckboxOptions, type CheckboxState, createCheckbox } from './checkbox/index';
export {
  type CommandGroup,
  type CommandItem,
  type CommandOptions,
  type CommandState,
  createCommand,
  initCommands,
} from './command/index';
export {
  createDialog,
  type DialogOptions,
  type DialogSize,
  type DialogState,
  initDialogs,
} from './dialog/index';
export {
  createDrawer,
  type DrawerOptions,
  type DrawerSide,
  type DrawerState,
} from './drawer/index';
export { createDropdown, type DropdownOptions, type DropdownState } from './dropdown/index';
export { createForm, type FormField, type FormOptions } from './form/index';
export {
  createInput,
  type InputOptions,
  type InputSize,
  type InputState,
  type InputType,
} from './input/index';
export { createLabel, type LabelOptions, type LabelState } from './label/index';
export {
  createMenu,
  initMenus,
  type MenuItem,
  type MenuOptions,
  type MenuState,
  type MenuTrigger,
} from './menu/index';
export { createModal, type ModalOptions, type ModalState } from './modal/index';
export {
  createPopover,
  initPopovers,
  type PopoverOptions,
  type PopoverState,
  type PopoverTrigger,
} from './popover/index';
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
export {
  createRadioGroup,
  type RadioGroupOptions,
  type RadioGroupState,
} from './radio-group/index';
export {
  createSelect,
  initSelects,
  type SelectOption,
  type SelectOptions,
  type SelectState,
} from './select/index';
export {
  createSeparator,
  type SeparatorOptions,
  type SeparatorOrientation,
  type SeparatorState,
} from './separator/index';
export * from './shared';
export {
  createSheet,
  initSheets,
  type SheetOptions,
  type SheetSide,
  type SheetSize,
  type SheetState,
} from './sheet/index';
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
export { createSwitch, type SwitchOptions, type SwitchState } from './switch/index';
export {
  createTable,
  initTables,
  type SortDirection,
  type TableColumn,
  type TableOptions,
  type TableState,
} from './table/index';
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
export { createToggle, type ToggleOptions, type ToggleState } from './toggle/index';
export { createTooltip, type TooltipOptions, type TooltipState } from './tooltip/index';

export const VERSION = '0.0.4';
