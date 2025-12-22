/**
 * @fileoverview Context Menu component - right-click menus
 * @module @atlas/components/context-menu
 */

import { generateId } from '../shared/aria.js';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal.js';
import { addListener, isBrowser } from '../shared/dom.js';
import {
  createRovingFocus,
  createTypeahead,
  type RovingFocus,
  type Typeahead,
} from '../shared/keyboard.js';

// ============================================================================
// Types
// ============================================================================

export interface ContextMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon HTML */
  icon?: string;
  /** Keyboard shortcut display */
  shortcut?: string;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Whether item is destructive */
  destructive?: boolean;
  /** Separator after this item */
  separator?: boolean;
  /** Click handler */
  onSelect?: () => void;
}

export interface ContextMenuOptions {
  /** Menu items */
  items?: ContextMenuItem[];
  /** Callback when item is selected */
  onSelect?: (item: ContextMenuItem) => void;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
}

export interface ContextMenu {
  /** Root element */
  readonly element: HTMLElement;
  /** Open menu at position */
  openAt: (x: number, y: number) => void;
  /** Close menu */
  close: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Set items */
  setItems: (items: ContextMenuItem[]) => void;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CLASSES = {
  ROOT: 'atlas-context-menu',
  TRIGGER: 'atlas-context-menu-trigger',
  CONTENT: 'atlas-context-menu-content',
  ITEM: 'atlas-context-menu-item',
  ITEM_ICON: 'atlas-context-menu-item-icon',
  ITEM_LABEL: 'atlas-context-menu-item-label',
  ITEM_SHORTCUT: 'atlas-context-menu-item-shortcut',
  ITEM_DISABLED: 'atlas-context-menu-item--disabled',
  ITEM_DESTRUCTIVE: 'atlas-context-menu-item--destructive',
  SEPARATOR: 'atlas-context-menu-separator',
  OPEN: 'atlas-context-menu--open',
} as const;

const ATTRS = {
  ROOT: 'data-atlas-context-menu',
  TRIGGER: 'data-atlas-context-menu-trigger',
  CONTENT: 'data-atlas-context-menu-content',
  ITEM: 'data-atlas-context-menu-item',
} as const;

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a Context Menu instance
 */
export function createContextMenu(
  element: HTMLElement,
  options: ContextMenuOptions = {}
): ContextMenu {
  if (!isBrowser()) {
    return createServerContextMenu(element);
  }

  const { items: initialItems = [], onSelect, onOpen, onClose } = options;

  // State
  let isOpenState = false;
  let currentItems = initialItems;

  // Elements
  const id = generateId('context-menu');
  let triggerEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;

  // Handlers
  let dismissHandler: DismissalHandler | null = null;
  let rovingFocus: RovingFocus | null = null;
  let typeahead: Typeahead | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');
    element.id = id;

    // Find trigger
    triggerEl = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (!triggerEl) {
      // Use element itself as trigger area
      triggerEl = element;
    }

    // Create content
    contentEl = document.createElement('div');
    contentEl.className = CLASSES.CONTENT;
    contentEl.setAttribute(ATTRS.CONTENT, '');
    contentEl.setAttribute('role', 'menu');
    contentEl.setAttribute('tabindex', '-1');
    contentEl.id = `${id}-content`;
    document.body.appendChild(contentEl);

    // Render items
    renderItems();

    // Setup trigger
    cleanups.push(addListener(triggerEl, 'contextmenu', handleContextMenu as EventListener));
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    openAt(event.clientX, event.clientY);
  }

  function renderItems(): void {
    if (!contentEl) return;

    contentEl.innerHTML = '';

    currentItems.forEach((item) => {
      const itemEl = createItemElement(item);
      contentEl?.appendChild(itemEl);

      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = CLASSES.SEPARATOR;
        sep.setAttribute('role', 'separator');
        contentEl?.appendChild(sep);
      }
    });
  }

  function createItemElement(item: ContextMenuItem): HTMLElement {
    const el = document.createElement('div');
    el.className = CLASSES.ITEM;
    el.setAttribute(ATTRS.ITEM, '');
    el.setAttribute('role', 'menuitem');
    el.setAttribute('data-id', item.id);
    el.setAttribute('tabindex', '-1');

    if (item.disabled) {
      el.classList.add(CLASSES.ITEM_DISABLED);
      el.setAttribute('aria-disabled', 'true');
    }

    if (item.destructive) {
      el.classList.add(CLASSES.ITEM_DESTRUCTIVE);
    }

    // Icon
    if (item.icon) {
      const iconEl = document.createElement('span');
      iconEl.className = CLASSES.ITEM_ICON;
      iconEl.innerHTML = item.icon;
      el.appendChild(iconEl);
    }

    // Label
    const labelEl = document.createElement('span');
    labelEl.className = CLASSES.ITEM_LABEL;
    labelEl.textContent = item.label;
    el.appendChild(labelEl);

    // Shortcut
    if (item.shortcut) {
      const shortcutEl = document.createElement('span');
      shortcutEl.className = CLASSES.ITEM_SHORTCUT;
      shortcutEl.textContent = item.shortcut;
      el.appendChild(shortcutEl);
    }

    // Click handler
    if (!item.disabled) {
      el.addEventListener('click', () => {
        item.onSelect?.();
        onSelect?.(item);
        close();
      });
    }

    return el;
  }

  function openAt(x: number, y: number): void {
    if (isOpenState) {
      close();
    }

    isOpenState = true;
    element.classList.add(CLASSES.OPEN);
    element.setAttribute('data-state', 'open');

    if (contentEl) {
      // Position menu
      positionMenu(x, y);

      contentEl.style.display = 'block';

      // Setup roving focus
      rovingFocus = createRovingFocus(contentEl, {
        itemSelector: `[${ATTRS.ITEM}]:not([aria-disabled="true"])`,
        orientation: 'vertical',
        loop: true,
      });

      // Setup typeahead
      typeahead = createTypeahead(contentEl, {
        itemSelector: `[${ATTRS.ITEM}]:not([aria-disabled="true"])`,
      });

      // Focus first item
      requestAnimationFrame(() => {
        const firstItem = contentEl?.querySelector(
          `[${ATTRS.ITEM}]:not([aria-disabled="true"])`
        ) as HTMLElement;
        firstItem?.focus();
      });

      // Setup dismissal
      dismissHandler = createDismissHandler(contentEl, {
        onDismiss: close,
        escapeKey: true,
        clickOutside: true,
      });
      dismissHandler.resume();
    }

    onOpen?.();
  }

  function positionMenu(x: number, y: number): void {
    if (!contentEl) return;

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Make visible to measure
    contentEl.style.visibility = 'hidden';
    contentEl.style.display = 'block';

    const menuRect = contentEl.getBoundingClientRect();

    contentEl.style.visibility = '';

    // Adjust position to fit viewport
    let finalX = x;
    let finalY = y;

    if (x + menuRect.width > viewport.width - 8) {
      finalX = viewport.width - menuRect.width - 8;
    }

    if (y + menuRect.height > viewport.height - 8) {
      finalY = viewport.height - menuRect.height - 8;
    }

    finalX = Math.max(8, finalX);
    finalY = Math.max(8, finalY);

    contentEl.style.position = 'fixed';
    contentEl.style.left = `${finalX}px`;
    contentEl.style.top = `${finalY}px`;
  }

  function close(): void {
    if (!isOpenState) return;

    isOpenState = false;
    element.classList.remove(CLASSES.OPEN);
    element.setAttribute('data-state', 'closed');

    if (contentEl) {
      contentEl.style.display = 'none';
    }

    // Cleanup handlers
    dismissHandler?.destroy();
    dismissHandler = null;

    rovingFocus?.destroy();
    rovingFocus = null;

    typeahead?.destroy();
    typeahead = null;

    onClose?.();
  }

  function isOpen(): boolean {
    return isOpenState;
  }

  function setItems(items: ContextMenuItem[]): void {
    currentItems = items;
    renderItems();
  }

  function destroy(): void {
    close();
    cleanups.forEach((cleanup) => cleanup());

    contentEl?.remove();

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN);
    element.removeAttribute(ATTRS.ROOT);
  }

  // Initialize
  init();

  return {
    element,
    openAt,
    close,
    isOpen,
    setItems,
    destroy,
  };
}

// ============================================================================
// Server-side stub
// ============================================================================

function createServerContextMenu(element: HTMLElement): ContextMenu {
  return {
    element,
    openAt: () => {},
    close: () => {},
    isOpen: () => false,
    setItems: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initContextMenus(root: Document | HTMLElement = document): ContextMenu[] {
  if (!isBrowser()) return [];

  const elements = root.querySelectorAll<HTMLElement>(
    `[${ATTRS.ROOT}]:not([data-atlas-context-menu-initialized])`
  );
  const instances: ContextMenu[] = [];

  elements.forEach((element) => {
    const instance = createContextMenu(element);
    element.setAttribute('data-atlas-context-menu-initialized', '');
    instances.push(instance);
  });

  return instances;
}
