/**
 * @fileoverview Menubar component - horizontal menu bar with dropdowns
 * @module @atlas/components/menubar
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

export interface MenubarItem {
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
  items?: MenubarItem[];
  /** Action handler */
  onSelect?: () => void;
}

export interface MenubarMenu {
  /** Unique identifier */
  id: string;
  /** Trigger label */
  label: string;
  /** Menu items */
  items: MenubarItem[];
  /** Whether menu is disabled */
  disabled?: boolean;
}

export interface MenubarOptions {
  /** Menu definitions */
  menus?: MenubarMenu[];
  /** Placement of dropdowns */
  placement?: FloatingPlacement;
  /** Offset from trigger */
  offset?: number;
  /** Close on item select */
  closeOnSelect?: boolean;
  /** Callback when item is selected */
  onSelect?: (menuId: string, item: MenubarItem) => void;
  /** Callback when menu opens */
  onMenuOpen?: (menuId: string) => void;
  /** Callback when menu closes */
  onMenuClose?: (menuId: string) => void;
}

export interface MenubarState {
  /** Get the currently open menu ID */
  getOpenMenu: () => string | null;
  /** Open a specific menu */
  openMenu: (menuId: string) => void;
  /** Close the currently open menu */
  closeMenu: () => void;
  /** Close all menus */
  closeAll: () => void;
  /** Check if any menu is open */
  hasOpenMenu: () => boolean;
  /** Get menus */
  getMenus: () => MenubarMenu[];
  /** Set menus */
  setMenus: (menus: MenubarMenu[]) => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  ROOT: 'data-atlas-menubar',
  MENU: 'data-atlas-menubar-menu',
  TRIGGER: 'data-atlas-menubar-trigger',
  CONTENT: 'data-atlas-menubar-content',
  ITEM: 'data-atlas-menubar-item',
  SEPARATOR: 'data-atlas-menubar-separator',
  LABEL: 'data-atlas-menubar-label',
} as const;

const CLASSES = {
  ROOT: 'atlas-menubar',
  MENU: 'atlas-menubar-menu',
  TRIGGER: 'atlas-menubar-trigger',
  TRIGGER_OPEN: 'atlas-menubar-trigger--open',
  CONTENT: 'atlas-menubar-content',
  CONTENT_OPEN: 'atlas-menubar-content--open',
  ITEM: 'atlas-menubar-item',
  ITEM_DISABLED: 'atlas-menubar-item--disabled',
  ITEM_HIGHLIGHTED: 'atlas-menubar-item--highlighted',
  SEPARATOR: 'atlas-menubar-separator',
  LABEL: 'atlas-menubar-label',
  SHORTCUT: 'atlas-menubar-shortcut',
  ICON: 'atlas-menubar-icon',
  INDICATOR: 'atlas-menubar-indicator',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a menubar component (horizontal menu bar with dropdowns)
 *
 * @example
 * ```ts
 * const menubar = createMenubar(element, {
 *   menus: [
 *     {
 *       id: 'file',
 *       label: 'File',
 *       items: [
 *         { id: 'new', label: 'New', shortcut: 'Ctrl+N' },
 *         { id: 'open', label: 'Open', shortcut: 'Ctrl+O' },
 *         { type: 'separator' },
 *         { id: 'save', label: 'Save', shortcut: 'Ctrl+S' },
 *       ]
 *     },
 *     {
 *       id: 'edit',
 *       label: 'Edit',
 *       items: [
 *         { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
 *         { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
 *       ]
 *     }
 *   ],
 *   onSelect: (menuId, item) => console.log('Selected:', menuId, item.id)
 * });
 * ```
 */
export function createMenubar(element: HTMLElement, options: MenubarOptions = {}): MenubarState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    menus: initialMenus = [],
    placement = 'bottom-start',
    offset = 4,
    closeOnSelect = true,
  } = options;

  // State
  let currentMenus = initialMenus;
  let openMenuId: string | null = null;

  // Elements
  const id = generateId('menubar');
  const menuElements = new Map<
    string,
    {
      trigger: HTMLElement;
      content: HTMLElement;
      rovingFocus: RovingFocus | null;
    }
  >();

  // Handlers
  let dismissHandler: DismissalHandler | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;
  let barRovingFocus: RovingFocus | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');
    element.setAttribute('role', 'menubar');

    // Render menus if provided
    if (currentMenus.length > 0) {
      renderMenus();
    } else {
      // Find existing menu elements
      discoverMenus();
    }

    // Setup bar-level keyboard navigation
    setupBarNavigation();
  }

  function discoverMenus(): void {
    const menuEls = element.querySelectorAll<HTMLElement>(`[${ATTRS.MENU}]`);
    menuEls.forEach((menuEl) => {
      const menuId = menuEl.getAttribute(ATTRS.MENU) || generateId('menu');
      const trigger = menuEl.querySelector<HTMLElement>(`[${ATTRS.TRIGGER}]`);
      const content = menuEl.querySelector<HTMLElement>(`[${ATTRS.CONTENT}]`);

      if (trigger && content) {
        setupMenu(menuId, menuEl, trigger, content);
      }
    });
  }

  function renderMenus(): void {
    element.innerHTML = '';

    currentMenus.forEach((menu) => {
      const menuEl = document.createElement('div');
      menuEl.className = CLASSES.MENU;
      menuEl.setAttribute(ATTRS.MENU, menu.id);

      // Create trigger
      const trigger = document.createElement('button');
      trigger.className = CLASSES.TRIGGER;
      trigger.setAttribute(ATTRS.TRIGGER, '');
      trigger.setAttribute('type', 'button');
      trigger.setAttribute('role', 'menuitem');
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.textContent = menu.label;
      trigger.id = `${id}-trigger-${menu.id}`;

      if (menu.disabled) {
        trigger.setAttribute('disabled', '');
        trigger.setAttribute('aria-disabled', 'true');
      }

      // Create content
      const content = document.createElement('div');
      content.className = CLASSES.CONTENT;
      content.setAttribute(ATTRS.CONTENT, '');
      content.setAttribute('role', 'menu');
      content.setAttribute('aria-labelledby', trigger.id);
      content.id = `${id}-content-${menu.id}`;
      content.style.display = 'none';

      // Render items
      renderItems(content, menu.items, menu.id);

      menuEl.appendChild(trigger);
      menuEl.appendChild(content);
      element.appendChild(menuEl);

      setupMenu(menu.id, menuEl, trigger, content);
    });
  }

  function renderItems(container: HTMLElement, items: MenubarItem[], menuId: string): void {
    items.forEach((item) => {
      const el = createItemElement(item, menuId);
      container.appendChild(el);
    });
  }

  function createItemElement(item: MenubarItem, menuId: string): HTMLElement {
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
    el.setAttribute('data-menu-id', menuId);
    el.setAttribute('data-item-id', item.id);
    el.setAttribute(
      'role',
      item.type === 'checkbox'
        ? 'menuitemcheckbox'
        : item.type === 'radio'
          ? 'menuitemradio'
          : 'menuitem'
    );
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
    html += `<span class="atlas-menubar-item-label">${escapeHtml(item.label)}</span>`;

    // Shortcut
    if (item.shortcut) {
      html += `<span class="${CLASSES.SHORTCUT}">${escapeHtml(item.shortcut)}</span>`;
    }

    el.innerHTML = html;

    return el;
  }

  function setupMenu(
    menuId: string,
    _menuEl: HTMLElement,
    trigger: HTMLElement,
    content: HTMLElement
  ): void {
    // Set ARIA attributes
    trigger.setAttribute('aria-controls', content.id || `${id}-content-${menuId}`);

    // Store elements
    menuElements.set(menuId, { trigger, content, rovingFocus: null });

    // Trigger click
    cleanups.push(
      addListener(trigger, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (openMenuId === menuId) {
          closeMenu();
        } else {
          openMenu(menuId);
        }
      })
    );

    // Trigger hover (open on hover if another menu is already open)
    cleanups.push(
      addListener(trigger, 'mouseenter', () => {
        if (openMenuId && openMenuId !== menuId) {
          openMenu(menuId);
        }
      })
    );

    // Content item click/keyboard
    cleanups.push(
      addListener(content, 'click', (e) => {
        const target = e.target as HTMLElement;
        const itemEl = target.closest(`[${ATTRS.ITEM}]`) as HTMLElement;
        if (itemEl && !itemEl.hasAttribute('aria-disabled')) {
          handleItemSelect(menuId, itemEl);
        }
      })
    );

    cleanups.push(
      addListener(content, 'keydown', (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          e.preventDefault();
          const target = e.target as HTMLElement;
          const itemEl = target.closest(`[${ATTRS.ITEM}]`) as HTMLElement;
          if (itemEl && !itemEl.hasAttribute('aria-disabled')) {
            handleItemSelect(menuId, itemEl);
          }
        }
      })
    );

    // Item hover
    cleanups.push(
      addListener(content, 'mouseover', (e) => {
        const target = e.target as HTMLElement;
        const itemEl = target.closest(`[${ATTRS.ITEM}]`) as HTMLElement;
        if (itemEl && !itemEl.hasAttribute('aria-disabled')) {
          highlightItem(content, itemEl);
        }
      })
    );
  }

  function setupBarNavigation(): void {
    // Roving focus for menu triggers
    barRovingFocus = createRovingFocus(element, {
      itemSelector: `[${ATTRS.TRIGGER}]:not([disabled])`,
      orientation: 'horizontal',
      loop: true,
    });

    // Keyboard navigation
    cleanups.push(
      addListener(element, 'keydown', (e) => {
        const ke = e as KeyboardEvent;

        if (ke.key === 'ArrowRight' && openMenuId) {
          e.preventDefault();
          const menuIds = Array.from(menuElements.keys());
          const currentIndex = menuIds.indexOf(openMenuId);
          const nextIndex = (currentIndex + 1) % menuIds.length;
          openMenu(menuIds[nextIndex]);
        } else if (ke.key === 'ArrowLeft' && openMenuId) {
          e.preventDefault();
          const menuIds = Array.from(menuElements.keys());
          const currentIndex = menuIds.indexOf(openMenuId);
          const prevIndex = (currentIndex - 1 + menuIds.length) % menuIds.length;
          openMenu(menuIds[prevIndex]);
        } else if (ke.key === 'Escape') {
          e.preventDefault();
          closeMenu();
        }
      })
    );
  }

  function highlightItem(content: HTMLElement, itemEl: HTMLElement): void {
    content.querySelectorAll(`.${CLASSES.ITEM_HIGHLIGHTED}`).forEach((el) => {
      el.classList.remove(CLASSES.ITEM_HIGHLIGHTED);
    });
    itemEl.classList.add(CLASSES.ITEM_HIGHLIGHTED);
    itemEl.focus();
  }

  function handleItemSelect(menuId: string, itemEl: HTMLElement): void {
    const itemId = itemEl.getAttribute('data-item-id');
    const menu = currentMenus.find((m) => m.id === menuId);
    const item = menu?.items.find((i) => i.id === itemId);

    if (!item || item.disabled) return;

    // Handle checkbox/radio
    if (item.type === 'checkbox') {
      item.checked = !item.checked;
      itemEl.setAttribute('aria-checked', item.checked ? 'true' : 'false');
      updateItemIndicator(itemEl, item);
    } else if (item.type === 'radio' && item.group) {
      menu?.items.forEach((i) => {
        if (i.type === 'radio' && i.group === item.group) {
          i.checked = i.id === item.id;
        }
      });
      // Update all radio items in group
      const content = menuElements.get(menuId)?.content;
      content?.querySelectorAll(`[${ATTRS.ITEM}]`).forEach((el) => {
        const elItemId = el.getAttribute('data-item-id');
        const elItem = menu?.items.find((i) => i.id === elItemId);
        if (elItem?.type === 'radio' && elItem.group === item.group) {
          el.setAttribute('aria-checked', elItem.checked ? 'true' : 'false');
          updateItemIndicator(el as HTMLElement, elItem);
        }
      });
    }

    // Callbacks
    item.onSelect?.();
    options.onSelect?.(menuId, item);

    // Close menu
    if (closeOnSelect && item.type !== 'checkbox' && item.type !== 'radio') {
      closeMenu();
    }
  }

  function updateItemIndicator(itemEl: HTMLElement, item: MenubarItem): void {
    const indicator = itemEl.querySelector(`.${CLASSES.INDICATOR}`);
    if (indicator) {
      if (item.checked) {
        indicator.innerHTML =
          item.type === 'checkbox'
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"></circle></svg>';
      } else {
        indicator.innerHTML = '';
      }
    }
  }

  function openMenu(menuId: string): void {
    const menuData = menuElements.get(menuId);
    if (!menuData) return;

    // Close current menu first
    if (openMenuId && openMenuId !== menuId) {
      closeMenuInternal(openMenuId);
    }

    openMenuId = menuId;
    const { trigger, content } = menuData;

    // Update trigger
    trigger.classList.add(CLASSES.TRIGGER_OPEN);
    trigger.setAttribute('aria-expanded', 'true');

    // Show content
    content.style.display = '';
    content.classList.add(CLASSES.CONTENT_OPEN);

    // Position content
    updatePosition(trigger, content);

    // Auto-update position
    cleanupAutoUpdate = autoUpdate(trigger, content, () => updatePosition(trigger, content));

    // Setup roving focus for items
    menuData.rovingFocus = createRovingFocus(content, {
      itemSelector: `[${ATTRS.ITEM}]:not([aria-disabled="true"])`,
      orientation: 'vertical',
      loop: true,
    });

    // Setup dismissal
    dismissHandler = createDismissHandler(content, {
      escapeKey: true,
      clickOutside: true,
      ignore: [element],
      onDismiss: closeMenu,
    });

    // Focus first item
    requestAnimationFrame(() => {
      const firstItem = content.querySelector(
        `[${ATTRS.ITEM}]:not([aria-disabled="true"])`
      ) as HTMLElement;
      if (firstItem) {
        highlightItem(content, firstItem);
      }
    });

    options.onMenuOpen?.(menuId);
  }

  function closeMenuInternal(menuId: string): void {
    const menuData = menuElements.get(menuId);
    if (!menuData) return;

    const { trigger, content, rovingFocus } = menuData;

    // Update trigger
    trigger.classList.remove(CLASSES.TRIGGER_OPEN);
    trigger.setAttribute('aria-expanded', 'false');

    // Hide content
    content.classList.remove(CLASSES.CONTENT_OPEN);

    // Clear highlights
    content.querySelectorAll(`.${CLASSES.ITEM_HIGHLIGHTED}`).forEach((el) => {
      el.classList.remove(CLASSES.ITEM_HIGHLIGHTED);
    });

    // Cleanup roving focus
    rovingFocus?.destroy();
    menuData.rovingFocus = null;

    // Hide after animation
    setTimeout(() => {
      if (openMenuId !== menuId) {
        content.style.display = 'none';
      }
    }, ANIMATION_DURATION.fast);

    options.onMenuClose?.(menuId);
  }

  function closeMenu(): void {
    if (!openMenuId) return;

    const menuId = openMenuId;
    openMenuId = null;

    closeMenuInternal(menuId);

    // Cleanup
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    dismissHandler?.destroy();
    dismissHandler = null;

    // Return focus to trigger
    const menuData = menuElements.get(menuId);
    menuData?.trigger.focus();
  }

  function closeAll(): void {
    closeMenu();
  }

  function updatePosition(trigger: HTMLElement, content: HTMLElement): void {
    const result = computeFloatingPosition(trigger, content, {
      placement,
      offset,
      flip: true,
      shift: true,
    });

    content.style.position = 'absolute';
    content.style.left = `${result.x}px`;
    content.style.top = `${result.y}px`;
  }

  function destroy(): void {
    closeMenu();
    barRovingFocus?.destroy();
    cleanups.forEach((cleanup) => cleanup());
    menuElements.clear();

    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute(ATTRS.ROOT);
    element.removeAttribute('role');
  }

  // Initialize
  init();

  return {
    getOpenMenu: () => openMenuId,
    openMenu,
    closeMenu,
    closeAll,
    hasOpenMenu: () => openMenuId !== null,
    getMenus: () => [...currentMenus],
    setMenus: (menus: MenubarMenu[]) => {
      currentMenus = menus;
      menuElements.clear();
      renderMenus();
      setupBarNavigation();
    },
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): MenubarState {
  return {
    getOpenMenu: () => null,
    openMenu: () => {},
    closeMenu: () => {},
    closeAll: () => {},
    hasOpenMenu: () => false,
    getMenus: () => [],
    setMenus: () => {},
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

export function initMenubars(root: Document | HTMLElement = document): MenubarState[] {
  if (!isBrowser()) return [];

  const menubars: MenubarState[] = [];
  const elements = root.querySelectorAll<HTMLElement>(`[${ATTRS.ROOT}]`);

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-menubar-initialized')) return;

    const menusAttr = element.getAttribute('data-menus');
    const options: MenubarOptions = {
      menus: menusAttr ? JSON.parse(menusAttr) : undefined,
      placement: (element.getAttribute('data-placement') as FloatingPlacement) ?? 'bottom-start',
      offset: parseInt(element.getAttribute('data-offset') ?? '4', 10),
      closeOnSelect: element.getAttribute('data-close-on-select') !== 'false',
    };

    const menubar = createMenubar(element, options);
    element.setAttribute('data-atlas-menubar-initialized', '');
    menubars.push(menubar);
  });

  return menubars;
}
