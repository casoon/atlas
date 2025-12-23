/**
 * @fileoverview Command palette component - keyboard-driven command interface
 * @module @atlas/components/command
 */

import { generateId } from '../shared/aria';
import { addListener, isBrowser, lockScroll } from '../shared/dom';
import { createFocusTrap, type FocusTrap } from '../shared/focus-trap';
import type { RovingFocus, Typeahead } from '../shared/keyboard';

// ============================================================================
// Types
// ============================================================================

export interface CommandItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Search keywords */
  keywords?: string[];
  /** Group name */
  group?: string;
  /** Item icon (HTML) */
  icon?: string;
  /** Keyboard shortcut display */
  shortcut?: string;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Action handler */
  onSelect?: () => void;
}

export interface CommandGroup {
  /** Group identifier */
  id: string;
  /** Group label */
  label: string;
  /** Items in group */
  items: CommandItem[];
}

export interface CommandOptions {
  /** Command items or groups */
  items?: (CommandItem | CommandGroup)[];
  /** Placeholder text for search input */
  placeholder?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Debounce delay for search (ms) */
  searchDebounce?: number;
  /** Custom filter function */
  filter?: (item: CommandItem, query: string) => boolean;
  /** Callback when item is selected */
  onSelect?: (item: CommandItem) => void;
  /** Callback when dialog opens */
  onOpen?: () => void;
  /** Callback when dialog closes */
  onClose?: () => void;
  /** Callback when search query changes */
  onSearch?: (query: string) => void;
}

export interface CommandState {
  /** Check if command palette is open */
  isOpen: () => boolean;
  /** Open the command palette */
  open: () => void;
  /** Close the command palette */
  close: () => void;
  /** Toggle open state */
  toggle: () => void;
  /** Get current search query */
  getQuery: () => string;
  /** Set search query */
  setQuery: (query: string) => void;
  /** Get items */
  getItems: () => (CommandItem | CommandGroup)[];
  /** Set items */
  setItems: (items: (CommandItem | CommandGroup)[]) => void;
  /** Get filtered items */
  getFilteredItems: () => CommandItem[];
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  DIALOG: 'data-atlas-command-dialog',
  INPUT: 'data-atlas-command-input',
  LIST: 'data-atlas-command-list',
  GROUP: 'data-atlas-command-group',
  ITEM: 'data-atlas-command-item',
  EMPTY: 'data-atlas-command-empty',
} as const;

const CLASSES = {
  ROOT: 'atlas-command',
  DIALOG: 'atlas-command-dialog',
  INPUT_WRAPPER: 'atlas-command-input-wrapper',
  INPUT: 'atlas-command-input',
  ICON: 'atlas-command-icon',
  LIST: 'atlas-command-list',
  GROUP: 'atlas-command-group',
  GROUP_LABEL: 'atlas-command-group-label',
  ITEM: 'atlas-command-item',
  ITEM_ICON: 'atlas-command-item-icon',
  ITEM_LABEL: 'atlas-command-item-label',
  ITEM_SHORTCUT: 'atlas-command-item-shortcut',
  ITEM_HIGHLIGHTED: 'atlas-command-item--highlighted',
  ITEM_DISABLED: 'atlas-command-item--disabled',
  EMPTY: 'atlas-command-empty',
  OPEN: 'atlas-command--open',
  BACKDROP: 'atlas-command-backdrop',
} as const;

const SEARCH_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a command palette component (like Cmd+K interfaces)
 *
 * @example
 * ```ts
 * const command = createCommand(element, {
 *   items: [
 *     { id: 'home', label: 'Go to Home', shortcut: 'G H', icon: '🏠' },
 *     { id: 'settings', label: 'Open Settings', shortcut: '⌘ ,', icon: '⚙️' },
 *   ],
 *   onSelect: (item) => console.log('Selected:', item.id)
 * });
 *
 * // Open with keyboard shortcut
 * document.addEventListener('keydown', (e) => {
 *   if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
 *     e.preventDefault();
 *     command.toggle();
 *   }
 * });
 * ```
 */
export function createCommand(element: HTMLElement, options: CommandOptions = {}): CommandState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    items: initialItems = [],
    placeholder = 'Type a command or search...',
    emptyMessage = 'No results found.',
    searchDebounce = 150,
  } = options;

  // State
  let isOpenState = false;
  let currentItems = initialItems;
  let currentQuery = '';
  let filteredItems: CommandItem[] = [];
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Elements
  const id = generateId('command');
  let backdropEl: HTMLElement | null = null;
  let dialogEl: HTMLElement | null = null;
  let inputEl: HTMLInputElement | null = null;
  let listEl: HTMLElement | null = null;
  let emptyEl: HTMLElement | null = null;

  // Handlers
  let focusTrap: FocusTrap | null = null;
  const _rovingFocus: RovingFocus | null = null;
  const _typeahead: Typeahead | null = null;
  let unlockScrollFn: (() => void) | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-command', '');
    element.id = id;

    // Create backdrop
    backdropEl = document.createElement('div');
    backdropEl.className = CLASSES.BACKDROP;
    backdropEl.addEventListener('click', close);
    element.appendChild(backdropEl);

    // Create dialog
    dialogEl = document.createElement('div');
    dialogEl.className = CLASSES.DIALOG;
    dialogEl.setAttribute(ATTRS.DIALOG, '');
    dialogEl.setAttribute('role', 'dialog');
    dialogEl.setAttribute('aria-modal', 'true');
    dialogEl.setAttribute('aria-label', 'Command palette');

    // Create input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = CLASSES.INPUT_WRAPPER;
    inputWrapper.innerHTML = `<span class="${CLASSES.ICON}" aria-hidden="true">${SEARCH_ICON}</span>`;

    // Create input
    inputEl = document.createElement('input');
    inputEl.className = CLASSES.INPUT;
    inputEl.setAttribute(ATTRS.INPUT, '');
    inputEl.type = 'text';
    inputEl.placeholder = placeholder;
    inputEl.setAttribute('role', 'combobox');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('aria-controls', `${id}-list`);
    inputWrapper.appendChild(inputEl);

    // Create list
    listEl = document.createElement('div');
    listEl.className = CLASSES.LIST;
    listEl.setAttribute(ATTRS.LIST, '');
    listEl.id = `${id}-list`;
    listEl.setAttribute('role', 'listbox');

    // Create empty state
    emptyEl = document.createElement('div');
    emptyEl.className = CLASSES.EMPTY;
    emptyEl.setAttribute(ATTRS.EMPTY, '');
    emptyEl.textContent = emptyMessage;
    emptyEl.style.display = 'none';

    dialogEl.appendChild(inputWrapper);
    dialogEl.appendChild(listEl);
    dialogEl.appendChild(emptyEl);
    element.appendChild(dialogEl);

    // Setup events
    setupEvents();

    // Initial render
    updateFilteredItems();
  }

  function setupEvents(): void {
    if (!inputEl) return;

    // Input events
    cleanups.push(addListener(inputEl, 'input', handleInput as EventListener));
    cleanups.push(addListener(inputEl, 'keydown', handleInputKeydown as EventListener));
  }

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(() => {
      currentQuery = target.value;
      updateFilteredItems();
      options.onSearch?.(currentQuery);
    }, searchDebounce);
  }

  function handleInputKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusPreviousItem();
        break;
      case 'Enter':
        event.preventDefault();
        selectHighlightedItem();
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
    }
  }

  function focusNextItem(): void {
    const items = listEl?.querySelectorAll(`[${ATTRS.ITEM}]:not([aria-disabled="true"])`);
    if (!items || items.length === 0) return;

    const current = listEl?.querySelector(`.${CLASSES.ITEM_HIGHLIGHTED}`);
    const currentIndex = current ? Array.from(items).indexOf(current) : -1;
    const nextIndex = (currentIndex + 1) % items.length;

    highlightItem(items[nextIndex] as HTMLElement);
  }

  function focusPreviousItem(): void {
    const items = listEl?.querySelectorAll(`[${ATTRS.ITEM}]:not([aria-disabled="true"])`);
    if (!items || items.length === 0) return;

    const current = listEl?.querySelector(`.${CLASSES.ITEM_HIGHLIGHTED}`);
    const currentIndex = current ? Array.from(items).indexOf(current) : 0;
    const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;

    highlightItem(items[prevIndex] as HTMLElement);
  }

  function highlightItem(el: HTMLElement): void {
    listEl?.querySelectorAll(`.${CLASSES.ITEM_HIGHLIGHTED}`).forEach((item) => {
      item.classList.remove(CLASSES.ITEM_HIGHLIGHTED);
    });
    el.classList.add(CLASSES.ITEM_HIGHLIGHTED);
    el.scrollIntoView({ block: 'nearest' });
  }

  function selectHighlightedItem(): void {
    const highlighted = listEl?.querySelector(`.${CLASSES.ITEM_HIGHLIGHTED}`);
    if (!highlighted) return;

    const itemId = highlighted.getAttribute('data-id');
    const item = filteredItems.find((i) => i.id === itemId);

    if (item && !item.disabled) {
      selectItem(item);
    }
  }

  function selectItem(item: CommandItem): void {
    item.onSelect?.();
    options.onSelect?.(item);
    close();
  }

  function flattenItems(items: (CommandItem | CommandGroup)[]): CommandItem[] {
    const result: CommandItem[] = [];

    for (const item of items) {
      if ('items' in item) {
        // It's a group
        result.push(...item.items);
      } else {
        result.push(item);
      }
    }

    return result;
  }

  function defaultFilter(item: CommandItem, query: string): boolean {
    const searchText = query.toLowerCase();
    const label = item.label.toLowerCase();
    const keywords = item.keywords?.map((k) => k.toLowerCase()) ?? [];

    return label.includes(searchText) || keywords.some((k) => k.includes(searchText));
  }

  function updateFilteredItems(): void {
    const allItems = flattenItems(currentItems);
    const filterFn = options.filter ?? defaultFilter;

    if (!currentQuery) {
      filteredItems = allItems.slice();
    } else {
      filteredItems = allItems.filter((item) => filterFn(item, currentQuery));
    }

    renderList();
  }

  function renderList(): void {
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = '';

    if (filteredItems.length === 0) {
      emptyEl.style.display = '';
      return;
    }

    emptyEl.style.display = 'none';

    // Group items
    const groups = new Map<string, CommandItem[]>();
    const ungrouped: CommandItem[] = [];

    for (const item of filteredItems) {
      if (item.group) {
        const group = groups.get(item.group) ?? [];
        group.push(item);
        groups.set(item.group, group);
      } else {
        ungrouped.push(item);
      }
    }

    // Render ungrouped
    ungrouped.forEach((item) => {
      listEl?.appendChild(createItemElement(item));
    });

    // Render groups
    for (const [groupName, groupItems] of groups) {
      const groupEl = document.createElement('div');
      groupEl.className = CLASSES.GROUP;
      groupEl.setAttribute(ATTRS.GROUP, '');
      groupEl.setAttribute('role', 'group');
      groupEl.setAttribute('aria-label', groupName);

      const labelEl = document.createElement('div');
      labelEl.className = CLASSES.GROUP_LABEL;
      labelEl.textContent = groupName;
      groupEl.appendChild(labelEl);

      groupItems.forEach((item) => {
        groupEl.appendChild(createItemElement(item));
      });

      listEl?.appendChild(groupEl);
    }

    // Highlight first item
    const firstItem = listEl.querySelector(
      `[${ATTRS.ITEM}]:not([aria-disabled="true"])`
    ) as HTMLElement;
    if (firstItem) {
      highlightItem(firstItem);
    }
  }

  function createItemElement(item: CommandItem): HTMLElement {
    const el = document.createElement('div');
    el.className = `${CLASSES.ITEM} ${item.disabled ? CLASSES.ITEM_DISABLED : ''}`;
    el.setAttribute(ATTRS.ITEM, '');
    el.setAttribute('role', 'option');
    el.setAttribute('data-id', item.id);

    if (item.disabled) {
      el.setAttribute('aria-disabled', 'true');
    }

    let html = '';

    if (item.icon) {
      html += `<span class="${CLASSES.ITEM_ICON}" aria-hidden="true">${item.icon}</span>`;
    }

    html += `<span class="${CLASSES.ITEM_LABEL}">${escapeHtml(item.label)}</span>`;

    if (item.shortcut) {
      html += `<span class="${CLASSES.ITEM_SHORTCUT}">${escapeHtml(item.shortcut)}</span>`;
    }

    el.innerHTML = html;

    // Event handlers
    if (!item.disabled) {
      el.addEventListener('click', () => selectItem(item));
      el.addEventListener('mouseenter', () => highlightItem(el));
    }

    return el;
  }

  function open(): void {
    if (isOpenState) return;

    isOpenState = true;
    element.classList.add(CLASSES.OPEN);

    // Lock scroll
    unlockScrollFn = lockScroll();

    // Focus trap
    if (dialogEl) {
      focusTrap = createFocusTrap({
        container: dialogEl,
        initialFocus: inputEl ?? 'first',
      });
      focusTrap.activate();
    }

    // Focus input
    requestAnimationFrame(() => {
      inputEl?.focus();
      inputEl?.select();
    });

    options.onOpen?.();
  }

  function close(): void {
    if (!isOpenState) return;

    isOpenState = false;
    element.classList.remove(CLASSES.OPEN);

    // Clear search
    if (inputEl) {
      inputEl.value = '';
    }
    currentQuery = '';
    updateFilteredItems();

    // Cleanup
    focusTrap?.deactivate();
    focusTrap = null;
    unlockScrollFn?.();
    unlockScrollFn = null;

    options.onClose?.();
  }

  function toggle(): void {
    if (isOpenState) {
      close();
    } else {
      open();
    }
  }

  function setQuery(query: string): void {
    currentQuery = query;
    if (inputEl) {
      inputEl.value = query;
    }
    updateFilteredItems();
  }

  function setItems(items: (CommandItem | CommandGroup)[]): void {
    currentItems = items;
    updateFilteredItems();
  }

  function destroy(): void {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (isOpenState) {
      focusTrap?.deactivate();
      unlockScrollFn?.();
    }

    _rovingFocus?.destroy();
    _typeahead?.destroy();
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN);
    element.removeAttribute('data-atlas-command');
    element.innerHTML = '';
  }

  // Initialize
  init();

  return {
    isOpen: () => isOpenState,
    open,
    close,
    toggle,
    getQuery: () => currentQuery,
    setQuery,
    getItems: () => [...currentItems],
    setItems,
    getFilteredItems: () => [...filteredItems],
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): CommandState {
  return {
    isOpen: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    getQuery: () => '',
    setQuery: () => {},
    getItems: () => [],
    setItems: () => {},
    getFilteredItems: () => [],
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

export function initCommands(root: Document | HTMLElement = document): CommandState[] {
  if (!isBrowser()) return [];

  const commands: CommandState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-command]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-command-initialized')) return;

    const itemsAttr = element.getAttribute('data-items');
    const options: CommandOptions = {
      items: itemsAttr ? JSON.parse(itemsAttr) : undefined,
      placeholder: element.getAttribute('data-placeholder') ?? undefined,
      emptyMessage: element.getAttribute('data-empty-message') ?? undefined,
    };

    const command = createCommand(element, options);
    element.setAttribute('data-atlas-command-initialized', '');
    commands.push(command);
  });

  return commands;
}
