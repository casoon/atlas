// @casoon/atlas-components - Headless UI components
// Framework-agnostic component primitives

// Layout & Navigation
export { createModal, type ModalOptions, type ModalState } from './modal/index';
export { createDropdown, type DropdownOptions, type DropdownState } from './dropdown/index';
export { createTabs, type TabsOptions, type TabsState } from './tabs/index';
export { createDrawer, type DrawerOptions } from './drawer/index';

// Content & Data
export { createAccordion, type AccordionOptions, type AccordionState } from './accordion/index';
export { createCard, type CardOptions, type CardState } from './card/index';

// Feedback & Overlays
export { createTooltip, type TooltipOptions, type TooltipState } from './tooltip/index';
export { createToastManager, type ToastOptions, type ToastItem } from './toast/index';

// Forms & Inputs
export { createForm, type FormOptions, type FormField } from './form/index';
export { createButton, type ButtonOptions, type ButtonState } from './button/index';

// Package version
export const version = '0.0.1';
