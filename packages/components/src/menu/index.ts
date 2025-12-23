/**
 * @fileoverview Menu component - dropdown/context menu
 * @module @atlas/components/menu
 */

import { generateId } from '../shared/aria';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal';
import { addListener, isBrowser } from '../shared/dom';
import { autoUpdate, computeFloatingPosition, type FloatingPlacement } from '../shared/floating';
import { createRovingFocus, type RovingFocus } from '../shared/keyboard';
import { ANIMATION_DURATION } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

export type MenuTrigger = 'click' | 'contextmenu' | 'hover';

export interface MenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Item type */
  type?: 'item' | 'checkbox' | 'radio' | 'separator' | 'label';
  /** Whether item is disabled */
  disabled?: boolean;
  /** Whether checkbox/radio is checked */
  checked?: boolean;
  /** Radio group name */
  group?: string;
  /** Keyboard shortcut display */
  shortcut?: string;
  /** Icon HTML */
  icon?: string;
  /** Submenu items */
  items?: MenuItem[];
  /** Action handler */
  onSelect?: () => void;
}

export interface MenuOptions {
  /** How to trigger menu */
  trigger?: MenuTrigger;
  /** Placement relative to trigger */
  placement?: FloatingPlacement;
  /** Offset from trigger */
  offset?: number;
  /** Menu items */
  items?: MenuItem[];
  /** Close on item select */
  closeOnSelect?: boolean;
  /** Callback when item is selected */
  onSelect?: (item: MenuItem) => void;
  /** Callback when menu opens */
  onOpen?: () => void;
  /** Callback when menu closes */
  onClose?: () => void;
}

export interface MenuState {
  /** Check if menu is open */
  isOpen: () => boolean;
  /** Open the menu */
  open: (position?: { x: number; y: number }) => void;
  /** Close the menu */
  close: () => void;
  /** Toggle open state */
  toggle: () => void;
  /** Get items */
  getItems: () => MenuItem[];
  /** Set items */
  setItems: (items: MenuItem[]) => void;
  /** Get checked items */
  getCheckedItems: () => MenuItem[];
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  TRIGGER: 'data-atlas-menu-trigger',
  CONTENT: 'data-atlas-menu-content',
  ITEM: 'data-atlas-menu-item',
  SEPARATOR: 'data-atlas-menu-separator',
  LABEL: 'data-atlas-menu-label',
  SUBMENU: 'data-atlas-menu-submenu',
} as const;

const CLASSES = {
  ROOT: 'atlas-menu',
  TRIGGER: 'atlas-menu-trigger',
  CONTENT: 'atlas-menu-content',
  ITEM: 'atlas-menu-item',
  ITEM_DISABLED: 'atlas-menu-item--disabled',
  ITEM_HIGHLIGHTED: 'atlas-menu-item--highlighted',
  SEPARATOR: 'atlas-menu-separator',
  LABEL: 'atlas-menu-label',
  SHORTCUT: 'atlas-menu-shortcut',
  ICON: 'atlas-menu-icon',
  INDICATOR: 'atlas-menu-indicator',
  SUBMENU: 'atlas-menu-submenu',
  OPEN: 'atlas-menu--open',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a menu component (dropdown or context menu)
 *
 * @example
 * ```ts
 * const menu = createMenu(element, {
 *   trigger: 'click',
 *   items: [
 *     { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
 *     { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
 *     { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
 *     { type: 'separator' },
 *     { id: 'delete', label: 'Delete', disabled: true },
 *   ],
 *   onSelect: (item) => console.log('Selected:', item.id)
 * });
 * ```
 */
export function createMenu(element: HTMLElement, options: MenuOptions = {}): MenuState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    trigger = 'click',
    placement = 'bottom-start',
    offset = 4,
    items: initialItems = [],
    closeOnSelect = true,
  } = options;

  // State
  let isOpenState = false;
  let currentItems = initialItems;
  let contextPosition: { x: number; y: number } | null = null;

  // Elements
  const id = generateId('menu');
  let triggerEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;

  // Handlers
  let dismissHandler: DismissalHandler | null = null;
  let rovingFocus: RovingFocus | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-menu', '');

    // Find trigger
    triggerEl = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (!triggerEl) {
      triggerEl = element.firstElementChild as HTMLElement;
      triggerEl?.setAttribute(ATTRS.TRIGGER, '');
    }

    // Find or create content
    contentEl = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (!contentEl) {
      contentEl = document.createElement('div');
      contentEl.className = CLASSES.CONTENT;
      contentEl.setAttribute(ATTRS.CONTENT, '');
      element.appendChild(contentEl);
    }

    // Setup content attributes
    contentEl.id = `${id}-content`;
    contentEl.setAttribute('role', 'menu');
    contentEl.setAttribute('tabindex', '-1');
    contentEl.style.display = 'none';

    // Setup trigger
    if (triggerEl) {
      triggerEl.id = triggerEl.id || `${id}-trigger`;
      triggerEl.setAttribute('aria-haspopup', 'menu');
      triggerEl.setAttribute('aria-expanded', 'false');
      triggerEl.setAttribute('aria-controls', contentEl.id);
    }

    // Setup events
    setupTriggerEvents();

    // Render items if provided
    if (currentItems.length > 0) {
      renderItems();
    }
  }

  function setupTriggerEvents(): void {
    if (!triggerEl) return;

    switch (trigger) {
      case 'click':
        cleanups.push(addListener(triggerEl, 'click', handleTriggerClick as EventListener));
        cleanups.push(addListener(triggerEl, 'keydown', handleTriggerKeydown as EventListener));
        break;

      case 'contextmenu':
        cleanups.push(addListener(triggerEl, 'contextmenu', handleContextMenu as EventListener));
        break;

      case 'hover':
        cleanups.push(addListener(triggerEl, 'mouseenter', () => open()));
        cleanups.push(addListener(triggerEl, 'mouseleave', handleMouseLeave as EventListener));
        if (contentEl) {
          cleanups.push(addListener(contentEl, 'mouseleave', handleMouseLeave as EventListener));
        }
        break;
    }
  }

  function handleTriggerClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  }

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      open();
    }
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    contextPosition = { x: event.clientX, y: event.clientY };
    open(contextPosition);
  }

  function handleMouseLeave(): void {
    // Small delay to allow moving to submenu
    setTimeout(() => {
      if (!element.matches(':hover')) {
        close();
      }
    }, 100);
  }

  function renderItems(): void {
    if (!contentEl) return;

    contentEl.innerHTML = '';

    currentItems.forEach((item) => {
      const el = createMenuItemElement(item);
      contentEl?.appendChild(el);
    });

    // Setup roving focus
    rovingFocus?.destroy();
    rovingFocus = createRovingFocus(contentEl, {
      itemSelector: `[${ATTRS.ITEM}]:not([aria-disabled="true"])`,
      orientation: 'vertical',
      loop: true,
    });
  }

  function createMenuItemElement(item: MenuItem): HTMLElement {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = CLASSES.SEPARATOR;
      sep.setAttribute(ATTRS.SEPARATOR, '');
      sep.setAttribute('role', 'separator');
      return sep;
    }

    if (item.type === 'label') {
      const label = document.createElement('div');
      label.className = CLASSES.LABEL;
      label.setAttribute(ATTRS.LABEL, '');
      label.textContent = item.label;
      return label;
    }

    const el = document.createElement('div');
    el.className = CLASSES.ITEM;
    el.setAttribute(ATTRS.ITEM, '');
    el.setAttribute(
      'role',
      item.type === 'checkbox'
        ? 'menuitemcheckbox'
        : item.type === 'radio'
          ? 'menuitemradio'
          : 'menuitem'
    );
    el.setAttribute('data-id', item.id);
    el.tabIndex = -1;

    if (item.disabled) {
      el.classList.add(CLASSES.ITEM_DISABLED);
      el.setAttribute('aria-disabled', 'true');
    }

    if (item.type === 'checkbox' || item.type === 'radio') {
      el.setAttribute('aria-checked', item.checked ? 'true' : 'false');
    }

    // Build content
    let html = '';

    // Indicator for checkbox/radio
    if (item.type === 'checkbox' || item.type === 'radio') {
      html += `<span class="${CLASSES.INDICATOR}" aria-hidden="true">`;
      if (item.checked) {
        html +=
          item.type === 'checkbox'
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"></circle></svg>';
      }
      html += '</span>';
    }

    // Icon
    if (item.icon) {
      html += `<span class="${CLASSES.ICON}" aria-hidden="true">${item.icon}</span>`;
    }

    // Label
    html += `<span class="atlas-menu-label">${escapeHtml(item.label)}</span>`;

    // Shortcut
    if (item.shortcut) {
      html += `<span class="${CLASSES.SHORTCUT}">${escapeHtml(item.shortcut)}</span>`;
    }

    // Submenu indicator
    if (item.items && item.items.length > 0) {
      html +=
        '<svg class="atlas-menu-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    }

    el.innerHTML = html;

    // Event handlers
    if (!item.disabled) {
      el.addEventListener('click', () => selectItem(item));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectItem(item);
        }
      });
      el.addEventListener('mouseenter', () => highlightItem(el));
    }

    return el;
  }

  function highlightItem(el: HTMLElement): void {
    contentEl?.querySelectorAll(`.${CLASSES.ITEM_HIGHLIGHTED}`).forEach((item) => {
      item.classList.remove(CLASSES.ITEM_HIGHLIGHTED);
    });
    el.classList.add(CLASSES.ITEM_HIGHLIGHTED);
    el.focus();
  }

  function selectItem(item: MenuItem): void {
    if (item.disabled) return;

    // Handle checkbox/radio
    if (item.type === 'checkbox') {
      item.checked = !item.checked;
      renderItems();
    } else if (item.type === 'radio' && item.group) {
      currentItems.forEach((i) => {
        if (i.type === 'radio' && i.group === item.group) {
          i.checked = i.id === item.id;
        }
      });
      renderItems();
    }

    // Callbacks
    item.onSelect?.();
    options.onSelect?.(item);

    // Close menu
    if (closeOnSelect && item.type !== 'checkbox' && item.type !== 'radio') {
      close();
    }
  }

  function open(position?: { x: number; y: number }): void {
    if (isOpenState || !contentEl) return;

    isOpenState = true;
    contextPosition = position ?? null;

    // Update ARIA
    triggerEl?.setAttribute('aria-expanded', 'true');

    // Show content
    contentEl.style.display = '';
    element.classList.add(CLASSES.OPEN);

    // Position
    updatePosition();

    // Auto-update (only for trigger-based positioning)
    if (!contextPosition && triggerEl) {
      cleanupAutoUpdate = autoUpdate(triggerEl, contentEl, updatePosition);
    }

    // Dismissal
    dismissHandler = createDismissHandler(contentEl, {
      escapeKey: true,
      clickOutside: true,
      ignore: triggerEl ? [triggerEl] : [],
      onDismiss: close,
    });

    // Focus first item
    requestAnimationFrame(() => {
      const firstItem = contentEl?.querySelector(
        `[${ATTRS.ITEM}]:not([aria-disabled="true"])`
      ) as HTMLElement;
      if (firstItem) {
        highlightItem(firstItem);
      }
    });

    options.onOpen?.();
  }

  function close(): void {
    if (!isOpenState || !contentEl) return;

    isOpenState = false;
    contextPosition = null;

    // Update ARIA
    triggerEl?.setAttribute('aria-expanded', 'false');

    // Hide content
    element.classList.remove(CLASSES.OPEN);

    // Cleanup
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    dismissHandler?.destroy();
    dismissHandler = null;

    // Clear highlights
    contentEl.querySelectorAll(`.${CLASSES.ITEM_HIGHLIGHTED}`).forEach((item) => {
      item.classList.remove(CLASSES.ITEM_HIGHLIGHTED);
    });

    // Hide after animation
    setTimeout(() => {
      if (!isOpenState && contentEl) {
        contentEl.style.display = 'none';
      }
    }, ANIMATION_DURATION.fast);

    // Return focus
    triggerEl?.focus();

    options.onClose?.();
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  function updatePosition(): void {
    if (!contentEl) return;

    if (contextPosition) {
      // Position at context menu coordinates
      contentEl.style.position = 'fixed';
      contentEl.style.left = `${contextPosition.x}px`;
      contentEl.style.top = `${contextPosition.y}px`;
    } else if (triggerEl) {
      // Position relative to trigger
      const result = computeFloatingPosition(triggerEl, contentEl, {
        placement,
        offset,
        flip: true,
        shift: true,
      });

      contentEl.style.position = 'absolute';
      contentEl.style.left = `${result.x}px`;
      contentEl.style.top = `${result.y}px`;
    }
  }

  function destroy(): void {
    if (isOpenState) {
      dismissHandler?.destroy();
      cleanupAutoUpdate?.();
    }

    rovingFocus?.destroy();
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN);
    element.removeAttribute('data-atlas-menu');
  }

  // Initialize
  init();

  return {
    isOpen: () => isOpenState,
    open,
    close,
    toggle,
    getItems: () => [...currentItems],
    setItems: (items: MenuItem[]) => {
      currentItems = items;
      renderItems();
    },
    getCheckedItems: () => currentItems.filter((i) => i.checked),
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): MenuState {
  return {
    isOpen: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    getItems: () => [],
    setItems: () => {},
    getCheckedItems: () => [],
    destroy: () => {},
  };
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initMenus(root: Document | HTMLElement = document): MenuState[] {
  if (!isBrowser()) return [];

  const menus: MenuState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-menu]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-menu-initialized')) return;

    const itemsAttr = element.getAttribute('data-items');
    const options: MenuOptions = {
      trigger: (element.getAttribute('data-trigger') as MenuTrigger) ?? 'click',
      placement: (element.getAttribute('data-placement') as FloatingPlacement) ?? 'bottom-start',
      offset: parseInt(element.getAttribute('data-offset') ?? '4', 10),
      items: itemsAttr ? JSON.parse(itemsAttr) : undefined,
      closeOnSelect: element.getAttribute('data-close-on-select') !== 'false',
    };

    const menu = createMenu(element, options);
    element.setAttribute('data-atlas-menu-initialized', '');
    menus.push(menu);
  });

  return menus;
}
