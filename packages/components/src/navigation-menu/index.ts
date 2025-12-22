/**
 * @fileoverview Navigation Menu component - mega-menu style navigation
 * @module @atlas/components/navigation-menu
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

export interface NavigationMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Link URL (for simple links) */
  href?: string;
  /** Whether link is active */
  active?: boolean;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Description text */
  description?: string;
  /** Icon HTML */
  icon?: string;
  /** Submenu items (for mega-menu style) */
  items?: NavigationMenuItem[];
  /** Custom content HTML (for complex layouts) */
  content?: string;
  /** Action handler */
  onSelect?: () => void;
}

export interface NavigationMenuOptions {
  /** Menu items */
  items?: NavigationMenuItem[];
  /** Trigger behavior */
  trigger?: 'click' | 'hover';
  /** Placement of dropdown content */
  placement?: FloatingPlacement;
  /** Offset from trigger */
  offset?: number;
  /** Delay before opening on hover (ms) */
  openDelay?: number;
  /** Delay before closing on mouse leave (ms) */
  closeDelay?: number;
  /** Callback when item is selected */
  onSelect?: (item: NavigationMenuItem) => void;
  /** Callback when menu opens */
  onOpen?: (itemId: string) => void;
  /** Callback when menu closes */
  onClose?: (itemId: string) => void;
}

export interface NavigationMenuState {
  /** Get the currently open item ID */
  getOpenItem: () => string | null;
  /** Open a specific item's submenu */
  openItem: (itemId: string) => void;
  /** Close the currently open submenu */
  closeItem: () => void;
  /** Close all submenus */
  closeAll: () => void;
  /** Check if any submenu is open */
  hasOpenItem: () => boolean;
  /** Get items */
  getItems: () => NavigationMenuItem[];
  /** Set items */
  setItems: (items: NavigationMenuItem[]) => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  ROOT: 'data-atlas-navigation-menu',
  LIST: 'data-atlas-navigation-menu-list',
  ITEM: 'data-atlas-navigation-menu-item',
  TRIGGER: 'data-atlas-navigation-menu-trigger',
  CONTENT: 'data-atlas-navigation-menu-content',
  LINK: 'data-atlas-navigation-menu-link',
  VIEWPORT: 'data-atlas-navigation-menu-viewport',
} as const;

const CLASSES = {
  ROOT: 'atlas-navigation-menu',
  LIST: 'atlas-navigation-menu-list',
  ITEM: 'atlas-navigation-menu-item',
  TRIGGER: 'atlas-navigation-menu-trigger',
  TRIGGER_OPEN: 'atlas-navigation-menu-trigger--open',
  CONTENT: 'atlas-navigation-menu-content',
  CONTENT_OPEN: 'atlas-navigation-menu-content--open',
  LINK: 'atlas-navigation-menu-link',
  LINK_ACTIVE: 'atlas-navigation-menu-link--active',
  VIEWPORT: 'atlas-navigation-menu-viewport',
  CHEVRON: 'atlas-navigation-menu-chevron',
  DESCRIPTION: 'atlas-navigation-menu-description',
  ICON: 'atlas-navigation-menu-icon',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a navigation menu component (mega-menu style navigation)
 *
 * @example
 * ```ts
 * const nav = createNavigationMenu(element, {
 *   items: [
 *     { id: 'home', label: 'Home', href: '/' },
 *     {
 *       id: 'products',
 *       label: 'Products',
 *       items: [
 *         { id: 'product1', label: 'Product 1', href: '/products/1', description: 'First product' },
 *         { id: 'product2', label: 'Product 2', href: '/products/2', description: 'Second product' },
 *       ]
 *     },
 *     { id: 'about', label: 'About', href: '/about' },
 *   ],
 *   trigger: 'hover',
 *   onSelect: (item) => console.log('Selected:', item.id)
 * });
 * ```
 */
export function createNavigationMenu(
  element: HTMLElement,
  options: NavigationMenuOptions = {}
): NavigationMenuState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    items: initialItems = [],
    trigger = 'hover',
    placement = 'bottom-start',
    offset = 4,
    openDelay = 0,
    closeDelay = 150,
  } = options;

  // State
  let currentItems = initialItems;
  let openItemId: string | null = null;
  let openTimeout: ReturnType<typeof setTimeout> | null = null;
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Elements
  const id = generateId('nav-menu');
  const itemElements = new Map<
    string,
    {
      itemEl: HTMLElement;
      trigger: HTMLElement | null;
      content: HTMLElement | null;
      rovingFocus: RovingFocus | null;
    }
  >();

  // Handlers
  let dismissHandler: DismissalHandler | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;
  let listRovingFocus: RovingFocus | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');

    // Create nav wrapper
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Main navigation');

    // Render items if provided
    if (currentItems.length > 0) {
      renderItems(nav);
    } else {
      // Discover existing structure
      discoverItems();
    }

    if (element.children.length === 0 || currentItems.length > 0) {
      element.appendChild(nav);
    }

    // Setup list-level keyboard navigation
    setupListNavigation();

    // Global click outside handler
    cleanups.push(
      addListener(document, 'click', (e) => {
        if (!element.contains(e.target as Node)) {
          closeAll();
        }
      })
    );
  }

  function discoverItems(): void {
    const itemEls = element.querySelectorAll<HTMLElement>(`[${ATTRS.ITEM}]`);
    itemEls.forEach((itemEl) => {
      const itemId = itemEl.getAttribute(ATTRS.ITEM) || generateId('nav-item');
      const triggerEl = itemEl.querySelector<HTMLElement>(`[${ATTRS.TRIGGER}]`);
      const contentEl = itemEl.querySelector<HTMLElement>(`[${ATTRS.CONTENT}]`);

      setupItem(itemId, itemEl, triggerEl, contentEl);
    });
  }

  function renderItems(container: HTMLElement): void {
    const list = document.createElement('ul');
    list.className = CLASSES.LIST;
    list.setAttribute(ATTRS.LIST, '');
    list.setAttribute('role', 'menubar');

    currentItems.forEach((item) => {
      const li = document.createElement('li');
      li.className = CLASSES.ITEM;
      li.setAttribute(ATTRS.ITEM, item.id);
      li.setAttribute('role', 'none');

      if (item.items && item.items.length > 0) {
        // Item with submenu
        const triggerEl = createTriggerElement(item);
        const contentEl = createContentElement(item);

        li.appendChild(triggerEl);
        li.appendChild(contentEl);

        setupItem(item.id, li, triggerEl, contentEl);
      } else if (item.href) {
        // Simple link
        const link = createLinkElement(item);
        li.appendChild(link);

        setupItem(item.id, li, null, null);
      }

      list.appendChild(li);
    });

    container.appendChild(list);
  }

  function createTriggerElement(item: NavigationMenuItem): HTMLElement {
    const btn = document.createElement('button');
    btn.className = CLASSES.TRIGGER;
    btn.setAttribute(ATTRS.TRIGGER, '');
    btn.setAttribute('type', 'button');
    btn.setAttribute('role', 'menuitem');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.id = `${id}-trigger-${item.id}`;

    if (item.disabled) {
      btn.setAttribute('disabled', '');
      btn.setAttribute('aria-disabled', 'true');
    }

    // Icon
    if (item.icon) {
      btn.innerHTML = `<span class="${CLASSES.ICON}" aria-hidden="true">${item.icon}</span>`;
    }

    // Label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = CLASSES.CHEVRON;
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    btn.appendChild(chevron);

    return btn;
  }

  function createContentElement(item: NavigationMenuItem): HTMLElement {
    const content = document.createElement('div');
    content.className = CLASSES.CONTENT;
    content.setAttribute(ATTRS.CONTENT, '');
    content.setAttribute('role', 'menu');
    content.id = `${id}-content-${item.id}`;
    content.style.display = 'none';

    if (item.content) {
      // Custom content
      content.innerHTML = item.content;
    } else if (item.items) {
      // Render submenu items
      const subList = document.createElement('ul');
      subList.setAttribute('role', 'menu');

      item.items.forEach((subItem) => {
        const subLi = document.createElement('li');
        subLi.setAttribute('role', 'none');

        const link = createLinkElement(subItem);
        subLi.appendChild(link);
        subList.appendChild(subLi);
      });

      content.appendChild(subList);
    }

    return content;
  }

  function createLinkElement(item: NavigationMenuItem): HTMLElement {
    const link = document.createElement('a');
    link.className = CLASSES.LINK;
    link.setAttribute(ATTRS.LINK, '');
    link.setAttribute('role', 'menuitem');
    link.href = item.href || '#';
    link.tabIndex = -1;

    if (item.active) {
      link.classList.add(CLASSES.LINK_ACTIVE);
      link.setAttribute('aria-current', 'page');
    }

    if (item.disabled) {
      link.setAttribute('aria-disabled', 'true');
      link.tabIndex = -1;
    }

    // Icon
    if (item.icon) {
      link.innerHTML = `<span class="${CLASSES.ICON}" aria-hidden="true">${item.icon}</span>`;
    }

    // Label and description wrapper
    const textWrapper = document.createElement('div');
    textWrapper.className = 'atlas-navigation-menu-text';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'atlas-navigation-menu-label';
    labelSpan.textContent = item.label;
    textWrapper.appendChild(labelSpan);

    if (item.description) {
      const descSpan = document.createElement('span');
      descSpan.className = CLASSES.DESCRIPTION;
      descSpan.textContent = item.description;
      textWrapper.appendChild(descSpan);
    }

    link.appendChild(textWrapper);

    // Click handler
    link.addEventListener('click', (e) => {
      if (item.disabled) {
        e.preventDefault();
        return;
      }

      item.onSelect?.();
      options.onSelect?.(item);

      if (!item.href || item.href === '#') {
        e.preventDefault();
      }

      closeAll();
    });

    return link;
  }

  function setupItem(
    itemId: string,
    itemEl: HTMLElement,
    triggerEl: HTMLElement | null,
    contentEl: HTMLElement | null
  ): void {
    itemElements.set(itemId, {
      itemEl,
      trigger: triggerEl,
      content: contentEl,
      rovingFocus: null,
    });

    if (!triggerEl || !contentEl) return;

    // Set ARIA attributes
    triggerEl.setAttribute('aria-controls', contentEl.id);

    if (trigger === 'click') {
      cleanups.push(
        addListener(triggerEl, 'click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (openItemId === itemId) {
            closeItem();
          } else {
            openItem(itemId);
          }
        })
      );
    } else {
      // Hover trigger
      cleanups.push(
        addListener(itemEl, 'mouseenter', () => {
          clearTimeouts();
          openTimeout = setTimeout(() => {
            openItem(itemId);
          }, openDelay);
        })
      );

      cleanups.push(
        addListener(itemEl, 'mouseleave', () => {
          clearTimeouts();
          closeTimeout = setTimeout(() => {
            if (openItemId === itemId) {
              closeItem();
            }
          }, closeDelay);
        })
      );

      // Also allow click
      cleanups.push(
        addListener(triggerEl, 'click', (e) => {
          e.preventDefault();
          if (openItemId === itemId) {
            closeItem();
          } else {
            openItem(itemId);
          }
        })
      );
    }

    // Keyboard navigation within content
    cleanups.push(
      addListener(contentEl, 'keydown', (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Escape') {
          e.preventDefault();
          closeItem();
          triggerEl.focus();
        }
      })
    );
  }

  function setupListNavigation(): void {
    const list = element.querySelector(`[${ATTRS.LIST}]`);
    if (!list) return;

    listRovingFocus = createRovingFocus(list as HTMLElement, {
      itemSelector: `[${ATTRS.TRIGGER}]:not([disabled]), [${ATTRS.LINK}]:not([aria-disabled="true"])`,
      orientation: 'horizontal',
      loop: true,
    });

    cleanups.push(
      addListener(element, 'keydown', (e) => {
        const ke = e as KeyboardEvent;

        if (ke.key === 'ArrowDown' && openItemId) {
          e.preventDefault();
          // Focus first item in open content
          const itemData = itemElements.get(openItemId);
          const firstLink = itemData?.content?.querySelector(
            `[${ATTRS.LINK}]:not([aria-disabled="true"])`
          ) as HTMLElement;
          firstLink?.focus();
        }
      })
    );
  }

  function clearTimeouts(): void {
    if (openTimeout) {
      clearTimeout(openTimeout);
      openTimeout = null;
    }
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  }

  function openItem(itemId: string): void {
    const itemData = itemElements.get(itemId);
    if (!itemData?.trigger || !itemData?.content) return;

    // Close current item first
    if (openItemId && openItemId !== itemId) {
      closeItemInternal(openItemId);
    }

    openItemId = itemId;
    const { trigger: triggerEl, content: contentEl } = itemData;

    // Update trigger
    triggerEl.classList.add(CLASSES.TRIGGER_OPEN);
    triggerEl.setAttribute('aria-expanded', 'true');

    // Show content
    contentEl.style.display = '';
    contentEl.classList.add(CLASSES.CONTENT_OPEN);

    // Position content
    updatePosition(triggerEl, contentEl);

    // Auto-update position
    cleanupAutoUpdate = autoUpdate(triggerEl, contentEl, () =>
      updatePosition(triggerEl, contentEl)
    );

    // Setup roving focus for links
    itemData.rovingFocus = createRovingFocus(contentEl, {
      itemSelector: `[${ATTRS.LINK}]:not([aria-disabled="true"])`,
      orientation: 'vertical',
      loop: true,
    });

    // Setup dismissal (only for click trigger)
    if (trigger === 'click') {
      dismissHandler = createDismissHandler(contentEl, {
        escapeKey: true,
        clickOutside: true,
        ignore: [itemData.itemEl],
        onDismiss: closeItem,
      });
    }

    options.onOpen?.(itemId);
  }

  function closeItemInternal(itemId: string): void {
    const itemData = itemElements.get(itemId);
    if (!itemData?.trigger || !itemData?.content) return;

    const { trigger: triggerEl, content: contentEl, rovingFocus } = itemData;

    // Update trigger
    triggerEl.classList.remove(CLASSES.TRIGGER_OPEN);
    triggerEl.setAttribute('aria-expanded', 'false');

    // Hide content
    contentEl.classList.remove(CLASSES.CONTENT_OPEN);

    // Cleanup roving focus
    rovingFocus?.destroy();
    itemData.rovingFocus = null;

    // Hide after animation
    setTimeout(() => {
      if (openItemId !== itemId) {
        contentEl.style.display = 'none';
      }
    }, ANIMATION_DURATION.fast);

    options.onClose?.(itemId);
  }

  function closeItem(): void {
    if (!openItemId) return;

    const itemId = openItemId;
    openItemId = null;

    clearTimeouts();
    closeItemInternal(itemId);

    // Cleanup
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    dismissHandler?.destroy();
    dismissHandler = null;
  }

  function closeAll(): void {
    closeItem();
  }

  function updatePosition(triggerEl: HTMLElement, contentEl: HTMLElement): void {
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

  function destroy(): void {
    clearTimeouts();
    closeItem();
    listRovingFocus?.destroy();
    cleanups.forEach((cleanup) => cleanup());
    itemElements.clear();

    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute(ATTRS.ROOT);
  }

  // Initialize
  init();

  return {
    getOpenItem: () => openItemId,
    openItem,
    closeItem,
    closeAll,
    hasOpenItem: () => openItemId !== null,
    getItems: () => [...currentItems],
    setItems: (items: NavigationMenuItem[]) => {
      currentItems = items;
      itemElements.clear();
      element.innerHTML = '';
      init();
    },
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): NavigationMenuState {
  return {
    getOpenItem: () => null,
    openItem: () => {},
    closeItem: () => {},
    closeAll: () => {},
    hasOpenItem: () => false,
    getItems: () => [],
    setItems: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initNavigationMenus(
  root: Document | HTMLElement = document
): NavigationMenuState[] {
  if (!isBrowser()) return [];

  const menus: NavigationMenuState[] = [];
  const elements = root.querySelectorAll<HTMLElement>(`[${ATTRS.ROOT}]`);

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-navigation-menu-initialized')) return;

    const itemsAttr = element.getAttribute('data-items');
    const options: NavigationMenuOptions = {
      items: itemsAttr ? JSON.parse(itemsAttr) : undefined,
      trigger: (element.getAttribute('data-trigger') as 'click' | 'hover') ?? 'hover',
      placement: (element.getAttribute('data-placement') as FloatingPlacement) ?? 'bottom-start',
      offset: parseInt(element.getAttribute('data-offset') ?? '4', 10),
      openDelay: parseInt(element.getAttribute('data-open-delay') ?? '0', 10),
      closeDelay: parseInt(element.getAttribute('data-close-delay') ?? '150', 10),
    };

    const menu = createNavigationMenu(element, options);
    element.setAttribute('data-atlas-navigation-menu-initialized', '');
    menus.push(menu);
  });

  return menus;
}
