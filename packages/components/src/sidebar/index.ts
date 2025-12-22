/**
 * @fileoverview Sidebar component - collapsible sidebar with sections
 * @module @atlas/components/sidebar
 */

import { generateId } from '../shared/aria';
import { addListener, isBrowser, lockScroll } from '../shared/dom';

// ============================================================================
// Types
// ============================================================================

export type SidebarSide = 'left' | 'right';

export interface SidebarMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Link URL */
  href?: string;
  /** Icon HTML */
  icon?: string;
  /** Whether item is active */
  active?: boolean;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Badge text/number */
  badge?: string;
  /** Action handler */
  onSelect?: () => void;
}

export interface SidebarGroup {
  /** Unique identifier */
  id: string;
  /** Group label (optional) */
  label?: string;
  /** Menu items */
  items: SidebarMenuItem[];
  /** Whether group is collapsible */
  collapsible?: boolean;
  /** Whether group is collapsed */
  collapsed?: boolean;
}

export interface SidebarOptions {
  /** Side of viewport */
  side?: SidebarSide;
  /** Whether sidebar is collapsible to icons only */
  collapsible?: boolean;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Custom width */
  width?: string;
  /** Custom collapsed width */
  collapsedWidth?: string;
  /** Groups and items */
  groups?: SidebarGroup[];
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Callback when item is selected */
  onSelect?: (item: SidebarMenuItem) => void;
}

export interface SidebarState {
  /** Check if sidebar is open (mobile) */
  isOpen: () => boolean;
  /** Check if sidebar is collapsed (desktop) */
  isCollapsed: () => boolean;
  /** Open the sidebar (mobile) */
  open: () => void;
  /** Close the sidebar (mobile) */
  close: () => void;
  /** Toggle open state (mobile) */
  toggle: () => void;
  /** Collapse the sidebar (desktop) */
  collapse: () => void;
  /** Expand the sidebar (desktop) */
  expand: () => void;
  /** Toggle collapsed state (desktop) */
  toggleCollapse: () => void;
  /** Get groups */
  getGroups: () => SidebarGroup[];
  /** Set groups */
  setGroups: (groups: SidebarGroup[]) => void;
  /** Set active item by ID */
  setActiveItem: (itemId: string) => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  ROOT: 'data-atlas-sidebar',
  PROVIDER: 'data-atlas-sidebar-provider',
  SIDEBAR: 'data-atlas-sidebar-panel',
  CONTENT: 'data-atlas-sidebar-content',
  HEADER: 'data-atlas-sidebar-header',
  BODY: 'data-atlas-sidebar-body',
  FOOTER: 'data-atlas-sidebar-footer',
  GROUP: 'data-atlas-sidebar-group',
  GROUP_LABEL: 'data-atlas-sidebar-group-label',
  MENU: 'data-atlas-sidebar-menu',
  ITEM: 'data-atlas-sidebar-item',
  SEPARATOR: 'data-atlas-sidebar-separator',
  TRIGGER: 'data-atlas-sidebar-trigger',
  OVERLAY: 'data-atlas-sidebar-overlay',
} as const;

const CLASSES = {
  ROOT: 'atlas-sidebar-provider',
  SIDEBAR: 'atlas-sidebar',
  SIDEBAR_LEFT: 'atlas-sidebar--left',
  SIDEBAR_RIGHT: 'atlas-sidebar--right',
  SIDEBAR_OPEN: 'atlas-sidebar--open',
  SIDEBAR_COLLAPSED: 'atlas-sidebar--collapsed',
  CONTENT: 'atlas-sidebar-content',
  CONTENT_COLLAPSED: 'atlas-sidebar-content--collapsed',
  HEADER: 'atlas-sidebar-header',
  BODY: 'atlas-sidebar-body',
  FOOTER: 'atlas-sidebar-footer',
  GROUP: 'atlas-sidebar-group',
  GROUP_LABEL: 'atlas-sidebar-group-label',
  GROUP_COLLAPSED: 'atlas-sidebar-group--collapsed',
  MENU: 'atlas-sidebar-menu',
  ITEM: 'atlas-sidebar-item',
  ITEM_ACTIVE: 'atlas-sidebar-item--active',
  ITEM_DISABLED: 'atlas-sidebar-item--disabled',
  ITEM_ICON: 'atlas-sidebar-item-icon',
  ITEM_LABEL: 'atlas-sidebar-item-label',
  ITEM_BADGE: 'atlas-sidebar-item-badge',
  SEPARATOR: 'atlas-sidebar-separator',
  TRIGGER: 'atlas-sidebar-trigger',
  OVERLAY: 'atlas-sidebar-overlay',
  OVERLAY_VISIBLE: 'atlas-sidebar-overlay--visible',
} as const;

const MOBILE_BREAKPOINT = 768;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a sidebar component (collapsible sidebar with sections)
 *
 * @example
 * ```ts
 * const sidebar = createSidebar(element, {
 *   side: 'left',
 *   collapsible: true,
 *   groups: [
 *     {
 *       id: 'main',
 *       label: 'Main Menu',
 *       items: [
 *         { id: 'dashboard', label: 'Dashboard', icon: '<svg>...</svg>', href: '/' },
 *         { id: 'projects', label: 'Projects', icon: '<svg>...</svg>', href: '/projects' },
 *       ]
 *     },
 *     {
 *       id: 'settings',
 *       label: 'Settings',
 *       items: [
 *         { id: 'profile', label: 'Profile', icon: '<svg>...</svg>', href: '/profile' },
 *       ]
 *     }
 *   ],
 *   onSelect: (item) => console.log('Selected:', item.id)
 * });
 * ```
 */
export function createSidebar(element: HTMLElement, options: SidebarOptions = {}): SidebarState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    side = 'left',
    collapsible = false,
    defaultOpen = true,
    defaultCollapsed = false,
    width = '280px',
    collapsedWidth = '60px',
    groups: initialGroups = [],
  } = options;

  // State
  let currentGroups = initialGroups;
  let isOpenState = defaultOpen;
  let isCollapsedState = defaultCollapsed;
  let unlockScroll: (() => void) | null = null;

  // Elements
  const _id = generateId('sidebar');
  let sidebarEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;
  let overlayEl: HTMLElement | null = null;

  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');

    // Set CSS variables
    element.style.setProperty('--atlas-sidebar-width', width);
    element.style.setProperty('--atlas-sidebar-width-collapsed', collapsedWidth);

    // Find or create sidebar panel
    sidebarEl = element.querySelector(`[${ATTRS.SIDEBAR}]`);
    if (!sidebarEl) {
      sidebarEl = document.createElement('aside');
      sidebarEl.setAttribute(ATTRS.SIDEBAR, '');
    }
    sidebarEl.className = `${CLASSES.SIDEBAR} ${side === 'right' ? CLASSES.SIDEBAR_RIGHT : CLASSES.SIDEBAR_LEFT}`;
    sidebarEl.setAttribute('role', 'navigation');
    sidebarEl.setAttribute('aria-label', 'Sidebar navigation');

    // Find or create content wrapper
    contentEl = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (!contentEl) {
      contentEl = document.createElement('div');
      contentEl.setAttribute(ATTRS.CONTENT, '');
      contentEl.className = CLASSES.CONTENT;
    }

    // Create overlay for mobile
    overlayEl = document.createElement('div');
    overlayEl.className = CLASSES.OVERLAY;
    overlayEl.setAttribute(ATTRS.OVERLAY, '');

    // Render groups if provided
    if (currentGroups.length > 0) {
      renderGroups();
    }

    // Append elements if needed
    if (!element.querySelector(`[${ATTRS.SIDEBAR}]`)) {
      element.insertBefore(overlayEl, element.firstChild);
      element.insertBefore(sidebarEl, element.firstChild);
    } else {
      element.insertBefore(overlayEl, sidebarEl);
    }

    // Apply initial state
    updateState();

    // Setup event listeners
    setupEventListeners();
  }

  function renderGroups(): void {
    if (!sidebarEl) return;

    // Find or create body
    let bodyEl = sidebarEl.querySelector(`[${ATTRS.BODY}]`);
    if (!bodyEl) {
      bodyEl = document.createElement('div');
      bodyEl.className = CLASSES.BODY;
      bodyEl.setAttribute(ATTRS.BODY, '');
      sidebarEl.appendChild(bodyEl);
    } else {
      bodyEl.innerHTML = '';
    }

    currentGroups.forEach((group) => {
      const groupEl = createGroupElement(group);
      bodyEl?.appendChild(groupEl);
    });
  }

  function createGroupElement(group: SidebarGroup): HTMLElement {
    const groupEl = document.createElement('div');
    groupEl.className = CLASSES.GROUP;
    groupEl.setAttribute(ATTRS.GROUP, group.id);

    if (group.collapsed) {
      groupEl.classList.add(CLASSES.GROUP_COLLAPSED);
    }

    // Group label
    if (group.label) {
      const labelEl = document.createElement('div');
      labelEl.className = CLASSES.GROUP_LABEL;
      labelEl.setAttribute(ATTRS.GROUP_LABEL, '');
      labelEl.textContent = group.label;

      if (group.collapsible) {
        labelEl.setAttribute('role', 'button');
        labelEl.setAttribute('tabindex', '0');
        labelEl.setAttribute('aria-expanded', group.collapsed ? 'false' : 'true');

        labelEl.addEventListener('click', () => toggleGroup(group.id));
        labelEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleGroup(group.id);
          }
        });
      }

      groupEl.appendChild(labelEl);
    }

    // Menu
    const menuEl = document.createElement('ul');
    menuEl.className = CLASSES.MENU;
    menuEl.setAttribute(ATTRS.MENU, '');
    menuEl.setAttribute('role', 'menu');

    group.items.forEach((item) => {
      const itemEl = createItemElement(item);
      menuEl.appendChild(itemEl);
    });

    groupEl.appendChild(menuEl);

    return groupEl;
  }

  function createItemElement(item: SidebarMenuItem): HTMLElement {
    const li = document.createElement('li');
    li.setAttribute('role', 'none');

    const link = document.createElement('a');
    link.className = CLASSES.ITEM;
    link.setAttribute(ATTRS.ITEM, item.id);
    link.setAttribute('role', 'menuitem');
    link.href = item.href || '#';
    link.tabIndex = 0;

    if (item.active) {
      link.classList.add(CLASSES.ITEM_ACTIVE);
      link.setAttribute('aria-current', 'page');
    }

    if (item.disabled) {
      link.classList.add(CLASSES.ITEM_DISABLED);
      link.setAttribute('aria-disabled', 'true');
      link.tabIndex = -1;
    }

    // Icon
    if (item.icon) {
      const iconEl = document.createElement('span');
      iconEl.className = CLASSES.ITEM_ICON;
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.innerHTML = item.icon;
      link.appendChild(iconEl);
    }

    // Label
    const labelEl = document.createElement('span');
    labelEl.className = CLASSES.ITEM_LABEL;
    labelEl.textContent = item.label;
    link.appendChild(labelEl);

    // Badge
    if (item.badge) {
      const badgeEl = document.createElement('span');
      badgeEl.className = CLASSES.ITEM_BADGE;
      badgeEl.textContent = item.badge;
      link.appendChild(badgeEl);
    }

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

      // Close on mobile
      if (isMobile()) {
        close();
      }
    });

    li.appendChild(link);
    return li;
  }

  function setupEventListeners(): void {
    // Overlay click
    if (overlayEl) {
      cleanups.push(
        addListener(overlayEl, 'click', () => {
          close();
        })
      );
    }

    // Find triggers
    const triggers = element.querySelectorAll<HTMLElement>(`[${ATTRS.TRIGGER}]`);
    triggers.forEach((trigger) => {
      cleanups.push(
        addListener(trigger, 'click', () => {
          if (isMobile()) {
            toggle();
          } else if (collapsible) {
            toggleCollapse();
          }
        })
      );
    });

    // Keyboard handler
    cleanups.push(
      addListener(document, 'keydown', (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Escape' && isOpenState && isMobile()) {
          close();
        }
      })
    );

    // Handle resize
    cleanups.push(
      addListener(window, 'resize', () => {
        updateState();
      })
    );
  }

  function isMobile(): boolean {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function toggleGroup(groupId: string): void {
    const group = currentGroups.find((g) => g.id === groupId);
    if (!group) return;

    group.collapsed = !group.collapsed;

    const groupEl = element.querySelector(`[${ATTRS.GROUP}="${groupId}"]`);
    const labelEl = groupEl?.querySelector(`[${ATTRS.GROUP_LABEL}]`);

    if (groupEl) {
      groupEl.classList.toggle(CLASSES.GROUP_COLLAPSED, group.collapsed);
    }
    if (labelEl) {
      labelEl.setAttribute('aria-expanded', group.collapsed ? 'false' : 'true');
    }
  }

  function updateState(): void {
    if (!sidebarEl || !contentEl || !overlayEl) return;

    const mobile = isMobile();

    // Sidebar state
    if (mobile) {
      sidebarEl.classList.toggle(CLASSES.SIDEBAR_OPEN, isOpenState);
      sidebarEl.classList.remove(CLASSES.SIDEBAR_COLLAPSED);
      overlayEl.classList.toggle(CLASSES.OVERLAY_VISIBLE, isOpenState);

      // Lock scroll on mobile when open
      if (isOpenState && !unlockScroll) {
        unlockScroll = lockScroll();
      } else if (!isOpenState && unlockScroll) {
        unlockScroll();
        unlockScroll = null;
      }
    } else {
      sidebarEl.classList.remove(CLASSES.SIDEBAR_OPEN);
      sidebarEl.classList.toggle(CLASSES.SIDEBAR_COLLAPSED, isCollapsedState);
      overlayEl.classList.remove(CLASSES.OVERLAY_VISIBLE);

      // Content offset
      contentEl.classList.toggle(CLASSES.CONTENT_COLLAPSED, isCollapsedState);

      // Unlock scroll if was locked
      if (unlockScroll) {
        unlockScroll();
        unlockScroll = null;
      }
    }

    // Update ARIA
    sidebarEl.setAttribute('aria-hidden', mobile && !isOpenState ? 'true' : 'false');
  }

  function open(): void {
    if (isOpenState) return;
    isOpenState = true;
    updateState();
    options.onOpenChange?.(true);
  }

  function close(): void {
    if (!isOpenState) return;
    isOpenState = false;
    updateState();
    options.onOpenChange?.(false);
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  function collapse(): void {
    if (isCollapsedState || !collapsible) return;
    isCollapsedState = true;
    updateState();
    options.onCollapsedChange?.(true);
  }

  function expand(): void {
    if (!isCollapsedState) return;
    isCollapsedState = false;
    updateState();
    options.onCollapsedChange?.(false);
  }

  function toggleCollapse(): void {
    if (isCollapsedState) {
      expand();
    } else {
      collapse();
    }
  }

  function setActiveItem(itemId: string): void {
    // Clear previous active
    element.querySelectorAll(`.${CLASSES.ITEM_ACTIVE}`).forEach((el) => {
      el.classList.remove(CLASSES.ITEM_ACTIVE);
      el.removeAttribute('aria-current');
    });

    // Set new active
    const itemEl = element.querySelector(`[${ATTRS.ITEM}="${itemId}"]`);
    if (itemEl) {
      itemEl.classList.add(CLASSES.ITEM_ACTIVE);
      itemEl.setAttribute('aria-current', 'page');
    }

    // Update groups data
    currentGroups.forEach((group) => {
      group.items.forEach((item) => {
        item.active = item.id === itemId;
      });
    });
  }

  function destroy(): void {
    if (unlockScroll) {
      unlockScroll();
    }

    cleanups.forEach((cleanup) => cleanup());

    overlayEl?.remove();

    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute(ATTRS.ROOT);
    element.style.removeProperty('--atlas-sidebar-width');
    element.style.removeProperty('--atlas-sidebar-width-collapsed');
  }

  // Initialize
  init();

  return {
    isOpen: () => isOpenState,
    isCollapsed: () => isCollapsedState,
    open,
    close,
    toggle,
    collapse,
    expand,
    toggleCollapse,
    getGroups: () => [...currentGroups],
    setGroups: (groups: SidebarGroup[]) => {
      currentGroups = groups;
      renderGroups();
    },
    setActiveItem,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): SidebarState {
  return {
    isOpen: () => false,
    isCollapsed: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    collapse: () => {},
    expand: () => {},
    toggleCollapse: () => {},
    getGroups: () => [],
    setGroups: () => {},
    setActiveItem: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initSidebars(root: Document | HTMLElement = document): SidebarState[] {
  if (!isBrowser()) return [];

  const sidebars: SidebarState[] = [];
  const elements = root.querySelectorAll<HTMLElement>(`[${ATTRS.ROOT}]`);

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-sidebar-initialized')) return;

    const groupsAttr = element.getAttribute('data-groups');
    const options: SidebarOptions = {
      side: (element.getAttribute('data-side') as SidebarSide) ?? 'left',
      collapsible: element.hasAttribute('data-collapsible'),
      defaultOpen: element.getAttribute('data-default-open') !== 'false',
      defaultCollapsed: element.hasAttribute('data-default-collapsed'),
      width: element.getAttribute('data-width') ?? '280px',
      collapsedWidth: element.getAttribute('data-collapsed-width') ?? '60px',
      groups: groupsAttr ? JSON.parse(groupsAttr) : undefined,
    };

    const sidebar = createSidebar(element, options);
    element.setAttribute('data-atlas-sidebar-initialized', '');
    sidebars.push(sidebar);
  });

  return sidebars;
}
