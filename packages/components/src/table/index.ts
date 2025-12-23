/**
 * @fileoverview Table component - data table with sorting and selection
 * @module @atlas/components/table
 */

import { generateId } from '../shared/aria';
import { isBrowser } from '../shared/dom';

// ============================================================================
// Types
// ============================================================================

export type SortDirection = 'asc' | 'desc' | null;

export interface TableColumn<T = unknown> {
  /** Unique column key */
  key: string;
  /** Display header */
  header: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Custom cell renderer */
  render?: (value: unknown, row: T, index: number) => string | HTMLElement;
  /** Column width (CSS value) */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether column is hidden */
  hidden?: boolean;
}

export interface TableOptions<T = unknown> {
  /** Column definitions */
  columns?: TableColumn<T>[];
  /** Row data */
  data?: T[];
  /** Enable row selection */
  selectable?: boolean;
  /** Enable multi-select */
  multiSelect?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Hover effect on rows */
  hoverable?: boolean;
  /** Compact/dense mode */
  compact?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Row key field for selection */
  rowKey?: keyof T | ((row: T) => string);
  /** Callback when selection changes */
  onSelectionChange?: (selected: T[]) => void;
  /** Callback when sort changes */
  onSortChange?: (key: string, direction: SortDirection) => void;
  /** Callback when row is clicked */
  onRowClick?: (row: T, index: number) => void;
}

export interface TableState<T = unknown> {
  /** Get current data */
  getData: () => T[];
  /** Set data */
  setData: (data: T[]) => void;
  /** Get columns */
  getColumns: () => TableColumn<T>[];
  /** Set columns */
  setColumns: (columns: TableColumn<T>[]) => void;
  /** Get selected rows */
  getSelected: () => T[];
  /** Select rows */
  select: (rows: T[]) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Select all rows */
  selectAll: () => void;
  /** Get current sort */
  getSort: () => { key: string; direction: SortDirection } | null;
  /** Set sort */
  setSort: (key: string, direction: SortDirection) => void;
  /** Refresh table rendering */
  refresh: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  HEADER: 'data-atlas-table-header',
  BODY: 'data-atlas-table-body',
  ROW: 'data-atlas-table-row',
  CELL: 'data-atlas-table-cell',
  SORTABLE: 'data-atlas-table-sortable',
  CHECKBOX: 'data-atlas-table-checkbox',
} as const;

const CLASSES = {
  ROOT: 'atlas-table',
  WRAPPER: 'atlas-table-wrapper',
  TABLE: 'atlas-table-element',
  HEADER: 'atlas-table-header',
  HEADER_ROW: 'atlas-table-header-row',
  HEADER_CELL: 'atlas-table-header-cell',
  BODY: 'atlas-table-body',
  ROW: 'atlas-table-row',
  ROW_SELECTED: 'atlas-table-row--selected',
  CELL: 'atlas-table-cell',
  CHECKBOX: 'atlas-table-checkbox',
  SORT_ICON: 'atlas-table-sort-icon',
  SORT_ASC: 'atlas-table-sort--asc',
  SORT_DESC: 'atlas-table-sort--desc',
  STRIPED: 'atlas-table--striped',
  HOVERABLE: 'atlas-table--hoverable',
  COMPACT: 'atlas-table--compact',
  STICKY: 'atlas-table--sticky-header',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a data table component with sorting and selection
 *
 * @example
 * ```ts
 * const table = createTable(element, {
 *   columns: [
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'email', header: 'Email' },
 *     { key: 'status', header: 'Status', render: (v) => `<span class="badge">${v}</span>` },
 *   ],
 *   data: users,
 *   selectable: true,
 *   onSelectionChange: (selected) => console.log('Selected:', selected)
 * });
 * ```
 */
export function createTable<T = unknown>(
  element: HTMLElement,
  options: TableOptions<T> = {}
): TableState<T> {
  if (!isBrowser()) {
    return createNoopState<T>();
  }

  const {
    columns: initialColumns = [],
    data: initialData = [],
    selectable = false,
    multiSelect = true,
    striped = false,
    hoverable = true,
    compact = false,
    stickyHeader = false,
    rowKey,
  } = options;

  // State
  let currentColumns = initialColumns;
  let currentData = initialData;
  const selectedRows = new Set<string>();
  let sortKey: string | null = null;
  let sortDirection: SortDirection = null;

  // Elements
  const id = generateId('table');
  let tableEl: HTMLTableElement | null = null;
  let theadEl: HTMLTableSectionElement | null = null;
  let tbodyEl: HTMLTableSectionElement | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-table', '');
    element.id = id;

    // Apply modifiers
    if (striped) element.classList.add(CLASSES.STRIPED);
    if (hoverable) element.classList.add(CLASSES.HOVERABLE);
    if (compact) element.classList.add(CLASSES.COMPACT);
    if (stickyHeader) element.classList.add(CLASSES.STICKY);

    // Create wrapper for scroll
    const wrapper = document.createElement('div');
    wrapper.className = CLASSES.WRAPPER;

    // Create table
    tableEl = document.createElement('table');
    tableEl.className = CLASSES.TABLE;
    tableEl.setAttribute('role', 'grid');

    // Create thead
    theadEl = document.createElement('thead');
    theadEl.className = CLASSES.HEADER;
    theadEl.setAttribute(ATTRS.HEADER, '');

    // Create tbody
    tbodyEl = document.createElement('tbody');
    tbodyEl.className = CLASSES.BODY;
    tbodyEl.setAttribute(ATTRS.BODY, '');

    tableEl.appendChild(theadEl);
    tableEl.appendChild(tbodyEl);
    wrapper.appendChild(tableEl);
    element.appendChild(wrapper);

    // Render
    renderHeader();
    renderBody();
  }

  function getRowKey(row: T, index: number): string {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    if (rowKey && typeof row === 'object' && row !== null) {
      return String((row as Record<string, unknown>)[rowKey as string]);
    }
    return String(index);
  }

  function renderHeader(): void {
    if (!theadEl) return;

    theadEl.innerHTML = '';

    const tr = document.createElement('tr');
    tr.className = CLASSES.HEADER_ROW;

    // Selection checkbox column
    if (selectable && multiSelect) {
      const th = document.createElement('th');
      th.className = `${CLASSES.HEADER_CELL} ${CLASSES.CHECKBOX}`;
      th.innerHTML = `
        <input type="checkbox" ${ATTRS.CHECKBOX} aria-label="Select all rows" />
      `;

      const checkbox = th.querySelector('input');
      if (!checkbox) return;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectAll();
        } else {
          clearSelection();
        }
      });

      tr.appendChild(th);
    }

    // Data columns
    currentColumns.forEach((col) => {
      if (col.hidden) return;

      const th = document.createElement('th');
      th.className = CLASSES.HEADER_CELL;
      th.setAttribute('data-key', col.key);

      if (col.width) {
        th.style.width = col.width;
      }
      if (col.align) {
        th.style.textAlign = col.align;
      }

      if (col.sortable) {
        th.setAttribute(ATTRS.SORTABLE, '');
        th.setAttribute('role', 'columnheader');
        th.setAttribute(
          'aria-sort',
          sortKey === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
        );
        th.style.cursor = 'pointer';

        const isSorted = sortKey === col.key;
        th.innerHTML = `
          <span class="atlas-table-header-content">
            <span>${escapeHtml(col.header)}</span>
            <span class="${CLASSES.SORT_ICON} ${isSorted && sortDirection === 'asc' ? CLASSES.SORT_ASC : ''} ${isSorted && sortDirection === 'desc' ? CLASSES.SORT_DESC : ''}" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </span>
          </span>
        `;

        th.addEventListener('click', () => handleSort(col.key));
      } else {
        th.textContent = col.header;
      }

      tr.appendChild(th);
    });

    theadEl.appendChild(tr);
  }

  function renderBody(): void {
    if (!tbodyEl) return;

    tbodyEl.innerHTML = '';

    currentData.forEach((row, index) => {
      const key = getRowKey(row, index);
      const isSelected = selectedRows.has(key);

      const tr = document.createElement('tr');
      tr.className = `${CLASSES.ROW} ${isSelected ? CLASSES.ROW_SELECTED : ''}`;
      tr.setAttribute(ATTRS.ROW, '');
      tr.setAttribute('data-row-key', key);
      tr.setAttribute('data-row-index', String(index));

      if (isSelected) {
        tr.setAttribute('aria-selected', 'true');
      }

      // Selection checkbox
      if (selectable) {
        const td = document.createElement('td');
        td.className = `${CLASSES.CELL} ${CLASSES.CHECKBOX}`;
        td.innerHTML = `
          <input type="checkbox" ${ATTRS.CHECKBOX} ${isSelected ? 'checked' : ''} aria-label="Select row" />
        `;

        const checkbox = td.querySelector('input');
        if (checkbox) {
          checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleRowSelection(row, index);
          });
        }

        tr.appendChild(td);
      }

      // Data cells
      currentColumns.forEach((col) => {
        if (col.hidden) return;

        const td = document.createElement('td');
        td.className = CLASSES.CELL;
        td.setAttribute(ATTRS.CELL, '');
        td.setAttribute('data-key', col.key);

        if (col.align) {
          td.style.textAlign = col.align;
        }

        const value = (row as Record<string, unknown>)[col.key];

        if (col.render) {
          const rendered = col.render(value, row, index);
          if (typeof rendered === 'string') {
            td.innerHTML = rendered;
          } else {
            td.appendChild(rendered);
          }
        } else {
          td.textContent = value != null ? String(value) : '';
        }

        tr.appendChild(td);
      });

      // Row click handler
      tr.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT') return;

        if (selectable && !multiSelect) {
          toggleRowSelection(row, index);
        }
        options.onRowClick?.(row, index);
      });

      tbodyEl?.appendChild(tr);
    });

    updateSelectAllCheckbox();
  }

  function handleSort(key: string): void {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }

    if (sortDirection === null) {
      sortKey = null;
    }

    renderHeader();
    options.onSortChange?.(key, sortDirection);
  }

  function toggleRowSelection(row: T, index: number): void {
    const key = getRowKey(row, index);

    if (multiSelect) {
      if (selectedRows.has(key)) {
        selectedRows.delete(key);
      } else {
        selectedRows.add(key);
      }
    } else {
      if (selectedRows.has(key)) {
        selectedRows.clear();
      } else {
        selectedRows.clear();
        selectedRows.add(key);
      }
    }

    renderBody();
    emitSelectionChange();
  }

  function selectAll(): void {
    selectedRows.clear();
    currentData.forEach((row, index) => {
      selectedRows.add(getRowKey(row, index));
    });
    renderBody();
    emitSelectionChange();
  }

  function clearSelection(): void {
    selectedRows.clear();
    renderBody();
    emitSelectionChange();
  }

  function select(rows: T[]): void {
    selectedRows.clear();
    rows.forEach((row) => {
      const index = currentData.indexOf(row);
      if (index !== -1) {
        selectedRows.add(getRowKey(row, index));
      }
    });
    renderBody();
  }

  function updateSelectAllCheckbox(): void {
    if (!selectable || !multiSelect) return;

    const selectAllCheckbox = theadEl?.querySelector(
      `input[${ATTRS.CHECKBOX}]`
    ) as HTMLInputElement;
    if (!selectAllCheckbox) return;

    const allSelected = currentData.length > 0 && selectedRows.size === currentData.length;
    const someSelected = selectedRows.size > 0 && selectedRows.size < currentData.length;

    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = someSelected;
  }

  function emitSelectionChange(): void {
    const selected = currentData.filter((row, index) => selectedRows.has(getRowKey(row, index)));
    options.onSelectionChange?.(selected);
  }

  function getSelected(): T[] {
    return currentData.filter((row, index) => selectedRows.has(getRowKey(row, index)));
  }

  function setData(data: T[]): void {
    currentData = data;
    selectedRows.clear();
    renderBody();
  }

  function setColumns(columns: TableColumn<T>[]): void {
    currentColumns = columns;
    renderHeader();
    renderBody();
  }

  function setSort(key: string, direction: SortDirection): void {
    sortKey = direction ? key : null;
    sortDirection = direction;
    renderHeader();
  }

  function refresh(): void {
    renderHeader();
    renderBody();
  }

  function destroy(): void {
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(
      CLASSES.ROOT,
      CLASSES.STRIPED,
      CLASSES.HOVERABLE,
      CLASSES.COMPACT,
      CLASSES.STICKY
    );
    element.removeAttribute('data-atlas-table');
    element.innerHTML = '';
  }

  // Initialize
  init();

  return {
    getData: () => [...currentData],
    setData,
    getColumns: () => [...currentColumns],
    setColumns,
    getSelected,
    select,
    clearSelection,
    selectAll,
    getSort: () => (sortKey ? { key: sortKey, direction: sortDirection } : null),
    setSort,
    refresh,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState<T>(): TableState<T> {
  return {
    getData: () => [],
    setData: () => {},
    getColumns: () => [],
    setColumns: () => {},
    getSelected: () => [],
    select: () => {},
    clearSelection: () => {},
    selectAll: () => {},
    getSort: () => null,
    setSort: () => {},
    refresh: () => {},
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

export function initTables(root: Document | HTMLElement = document): TableState[] {
  if (!isBrowser()) return [];

  const tables: TableState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-table]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-table-initialized')) return;

    const columnsAttr = element.getAttribute('data-columns');
    const dataAttr = element.getAttribute('data-data');

    const options: TableOptions = {
      columns: columnsAttr ? JSON.parse(columnsAttr) : undefined,
      data: dataAttr ? JSON.parse(dataAttr) : undefined,
      selectable: element.hasAttribute('data-selectable'),
      multiSelect: element.getAttribute('data-multi-select') !== 'false',
      striped: element.hasAttribute('data-striped'),
      hoverable: element.getAttribute('data-hoverable') !== 'false',
      compact: element.hasAttribute('data-compact'),
      stickyHeader: element.hasAttribute('data-sticky-header'),
    };

    const table = createTable(element, options);
    element.setAttribute('data-atlas-table-initialized', '');
    tables.push(table);
  });

  return tables;
}
