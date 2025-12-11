/**
 * Dropdown Component
 *
 * An accessible dropdown menu with micro-interactions:
 * - Smooth scale + fade animation
 * - Origin-aware animation (expands from trigger)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Hover states on menu items
 * - Click outside to close
 *
 * @example
 * ```typescript
 * const dropdown = createDropdown(
 *   document.getElementById('trigger'),
 *   document.getElementById('menu'),
 *   {
 *     placement: 'bottom',
 *     onSelect: (item) => console.log('Selected:', item),
 *   }
 * );
 *
 * // Toggle dropdown
 * dropdown.toggle();
 * ```
 */

import {
  generateId,
  getDropdownMenuAttributes,
  getDropdownTriggerAttributes,
  getMenuItemAttributes,
} from '../shared/aria';
import { addListener, isBrowser } from '../shared/dom';
import {
  ANIMATION_DURATION,
  type AnimationTiming,
  type BaseComponentOptions,
  type BaseComponentState,
  EASING,
  type Placement,
  Z_INDEX,
} from '../shared/types';

export interface DropdownOptions extends BaseComponentOptions {
  /** Placement relative to trigger (default: 'bottom') */
  placement?: Placement;
  /** Close when clicking outside (default: true) */
  closeOnClickOutside?: boolean;
  /** Close when selecting an item (default: true) */
  closeOnSelect?: boolean;
  /** Animation timing (default: 'fast') */
  animation?: AnimationTiming;
  /** Offset from trigger in pixels (default: 4) */
  offset?: number;
  /** Called when an item is selected */
  onSelect?: (item: HTMLElement, index: number) => void;
}

export interface DropdownState extends BaseComponentState {
  /** The trigger element */
  readonly trigger: HTMLElement;
  /** The menu element */
  readonly menu: HTMLElement;
  /** Placement of the dropdown */
  readonly placement: Placement;
  /** Currently focused item index */
  readonly focusedIndex: number;
  /** Focus a specific menu item by index */
  focusItem: (index: number) => void;
  /** Get all menu items */
  getItems: () => HTMLElement[];
}

// Transform origins for each placement
const TRANSFORM_ORIGINS: Record<Placement, string> = {
  top: 'bottom center',
  bottom: 'top center',
  left: 'right center',
  right: 'left center',
};

export function createDropdown(
  trigger: HTMLElement,
  menu: HTMLElement,
  options: DropdownOptions = {}
): DropdownState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopDropdownState(trigger, menu, options.placement || 'bottom');
  }

  const {
    placement = 'bottom',
    closeOnClickOutside = true,
    closeOnSelect = true,
    animation = 'fast',
    offset = 4,
    onOpen,
    onClose,
    onSelect,
  } = options;

  const duration = ANIMATION_DURATION[animation];
  const triggerId = trigger.id || generateId('dropdown-trigger');
  const menuId = menu.id || generateId('dropdown-menu');

  let isOpen = false;
  let focusedIndex = -1;
  let menuItems: HTMLElement[] = [];
  let cleanupListeners: (() => void)[] = [];

  // Set IDs
  trigger.id = triggerId;
  menu.id = menuId;

  // Apply initial ARIA attributes
  const updateTriggerAria = () => {
    const attrs = getDropdownTriggerAttributes({ isOpen, menuId });
    for (const [key, value] of Object.entries(attrs)) {
      trigger.setAttribute(key, value);
    }
  };

  const menuAttrs = getDropdownMenuAttributes({
    id: menuId,
    labelledBy: triggerId,
  });
  for (const [key, value] of Object.entries(menuAttrs)) {
    menu.setAttribute(key, value);
  }

  updateTriggerAria();

  // Initial hidden state
  menu.style.position = 'absolute';
  menu.style.zIndex = String(Z_INDEX.dropdown);
  menu.style.opacity = '0';
  menu.style.transform = 'scale(0.95)';
  menu.style.transformOrigin = TRANSFORM_ORIGINS[placement];
  menu.style.visibility = 'hidden';
  menu.style.pointerEvents = 'none';

  const getMenuItems = (): HTMLElement[] => {
    return Array.from(
      menu.querySelectorAll<HTMLElement>('[role="menuitem"], [data-dropdown-item]')
    ).filter(
      (item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true'
    );
  };

  const updateMenuItems = () => {
    menuItems = getMenuItems();

    // Apply ARIA to items
    menuItems.forEach((item) => {
      const attrs = getMenuItemAttributes({ disabled: false });
      for (const [key, value] of Object.entries(attrs)) {
        if (!item.hasAttribute(key)) {
          item.setAttribute(key, value);
        }
      }
    });
  };

  const positionMenu = () => {
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
        break;
      case 'top':
        top = triggerRect.top - menuRect.height - offset;
        left = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - menuRect.height) / 2;
        left = triggerRect.left - menuRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - menuRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Keep within viewport
    const padding = 8;
    left = Math.max(padding, Math.min(left, window.innerWidth - menuRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - menuRect.height - padding));

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  };

  const focusItem = (index: number) => {
    if (menuItems.length === 0) return;

    // Wrap around
    if (index < 0) index = menuItems.length - 1;
    if (index >= menuItems.length) index = 0;

    // Remove previous focus indicator
    menuItems.forEach((item) => item.classList.remove('atlas-dropdown-focused'));

    // Focus new item
    focusedIndex = index;
    const item = menuItems[focusedIndex];
    item.classList.add('atlas-dropdown-focused');
    item.focus();
  };

  const selectItem = (item: HTMLElement) => {
    const index = menuItems.indexOf(item);
    onSelect?.(item, index);

    if (closeOnSelect) {
      close();
    }
  };

  const handleTriggerClick = () => {
    toggle();
  };

  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          open();
          // Focus first item after opening
          setTimeout(() => focusItem(0), 50);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          open();
          // Focus last item
          setTimeout(() => focusItem(menuItems.length - 1), 50);
        }
        break;
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(focusedIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(focusedIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        break;
      case 'End':
        e.preventDefault();
        focusItem(menuItems.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && menuItems[focusedIndex]) {
          selectItem(menuItems[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        trigger.focus();
        break;
      case 'Tab':
        // Close on tab and let focus move naturally
        close();
        break;
    }
  };

  const handleItemClick = (e: MouseEvent) => {
    const item = (e.target as HTMLElement).closest(
      '[role="menuitem"], [data-dropdown-item]'
    ) as HTMLElement;
    if (item && menuItems.includes(item)) {
      selectItem(item);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      closeOnClickOutside &&
      !trigger.contains(e.target as Node) &&
      !menu.contains(e.target as Node)
    ) {
      close();
    }
  };

  const animateIn = () => {
    menu.style.visibility = 'visible';
    menu.style.pointerEvents = 'auto';
    menu.style.transition = `opacity ${duration}ms ${EASING.decelerate}, transform ${duration}ms ${EASING.spring}`;

    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });
  };

  const animateOut = (): Promise<void> => {
    return new Promise((resolve) => {
      menu.style.transition = `opacity ${duration}ms ${EASING.accelerate}, transform ${duration}ms ${EASING.accelerate}`;
      menu.style.opacity = '0';
      menu.style.transform = 'scale(0.95)';

      setTimeout(() => {
        menu.style.visibility = 'hidden';
        menu.style.pointerEvents = 'none';
        resolve();
      }, duration);
    });
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;

    // Update items list
    updateMenuItems();

    // Reset focus
    focusedIndex = -1;

    // Update ARIA
    updateTriggerAria();

    // Position menu
    positionMenu();

    // Add listeners
    cleanupListeners.push(
      addListener(document, 'click', handleClickOutside as (ev: DocumentEventMap['click']) => void),
      addListener(menu, 'keydown', handleMenuKeyDown as (ev: DocumentEventMap['keydown']) => void),
      addListener(menu, 'click', handleItemClick as (ev: DocumentEventMap['click']) => void)
    );

    // Animate
    animateIn();

    onOpen?.();
  };

  const close = async () => {
    if (!isOpen) return;
    isOpen = false;

    // Update ARIA
    updateTriggerAria();

    // Remove focus indicators
    menuItems.forEach((item) => item.classList.remove('atlas-dropdown-focused'));
    focusedIndex = -1;

    // Clean up listeners
    cleanupListeners.forEach((cleanup) => cleanup());
    cleanupListeners = [];

    // Animate
    await animateOut();

    onClose?.();
  };

  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  const destroy = () => {
    if (isOpen) {
      menu.style.visibility = 'hidden';
      menu.style.pointerEvents = 'none';
      cleanupListeners.forEach((cleanup) => cleanup());
    }

    // Remove ARIA we added
    trigger.removeAttribute('aria-haspopup');
    trigger.removeAttribute('aria-expanded');
    trigger.removeAttribute('aria-controls');
  };

  // Set up trigger listeners
  const triggerClickCleanup = addListener(
    trigger,
    'click',
    handleTriggerClick as (ev: DocumentEventMap['click']) => void
  );
  const triggerKeydownCleanup = addListener(
    trigger,
    'keydown',
    handleTriggerKeyDown as (ev: DocumentEventMap['keydown']) => void
  );

  // Override destroy to include trigger listeners
  const originalDestroy = destroy;
  const destroyWithTrigger = () => {
    triggerClickCleanup();
    triggerKeydownCleanup();
    originalDestroy();
  };

  return {
    get isOpen() {
      return isOpen;
    },
    get trigger() {
      return trigger;
    },
    get menu() {
      return menu;
    },
    get placement() {
      return placement;
    },
    get focusedIndex() {
      return focusedIndex;
    },
    open,
    close,
    toggle,
    focusItem,
    getItems: () => [...menuItems],
    destroy: destroyWithTrigger,
  };
}

/** No-op dropdown state for SSR */
function createNoopDropdownState(
  trigger: HTMLElement,
  menu: HTMLElement,
  placement: Placement
): DropdownState {
  return {
    get isOpen() {
      return false;
    },
    get trigger() {
      return trigger;
    },
    get menu() {
      return menu;
    },
    get placement() {
      return placement;
    },
    get focusedIndex() {
      return -1;
    },
    open: () => {},
    close: () => {},
    toggle: () => {},
    focusItem: () => {},
    getItems: () => [],
    destroy: () => {},
  };
}
