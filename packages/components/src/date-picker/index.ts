/**
 * @fileoverview Date Picker component - date field with calendar popup
 * @module @atlas/components/date-picker
 */

import { type CalendarMode, type CalendarState, createCalendar } from '../calendar/index';
import { generateId } from '../shared/aria';
import { createDismissHandler, type DismissalHandler } from '../shared/dismissal';
import { addListener, isBrowser } from '../shared/dom';
import { autoUpdate, computeFloatingPosition, type FloatingPlacement } from '../shared/floating';
import { createFocusTrap, type FocusTrap } from '../shared/focus-trap';
import { ANIMATION_DURATION } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

export type DatePickerMode = CalendarMode;

export interface DatePickerPreset {
  /** Label displayed on the preset button */
  label: string;
  /** Function that returns the date for this preset */
  getValue: () => Date;
}

export interface DatePickerOptions {
  /** Selection mode (single, range, multiple) */
  mode?: DatePickerMode;
  /** Initial selected date(s) */
  value?: Date | Date[] | [Date, Date] | null;
  /** Placeholder text when no date is selected */
  placeholder?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disabled dates */
  disabledDates?: Date[] | ((date: Date) => boolean);
  /** First day of week (0 = Sunday, 1 = Monday) */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Locale for date formatting */
  locale?: string;
  /** Placement of the calendar popup */
  placement?: FloatingPlacement;
  /** Offset from trigger in pixels */
  offset?: number;
  /** Whether to show preset buttons */
  showPresets?: boolean;
  /** Custom preset options */
  presets?: DatePickerPreset[];
  /** Whether the date picker is disabled */
  disabled?: boolean;
  /** Whether to show a clear button */
  clearable?: boolean;
  /** Close on ESC key */
  closeOnEsc?: boolean;
  /** Close on click outside */
  closeOnClickOutside?: boolean;
  /** Number of months to display in calendar */
  numberOfMonths?: number;
  /** Show week numbers in calendar */
  showWeekNumbers?: boolean;
  /** Callback when date changes */
  onChange?: (value: Date | Date[] | [Date, Date] | null) => void;
  /** Callback when popover opens */
  onOpen?: () => void;
  /** Callback when popover closes */
  onClose?: () => void;
}

export interface DatePickerState {
  /** Get current value */
  getValue: () => Date | Date[] | [Date, Date] | null;
  /** Set value */
  setValue: (value: Date | Date[] | [Date, Date] | null) => void;
  /** Check if picker is open */
  isOpen: () => boolean;
  /** Open the date picker */
  open: () => void;
  /** Close the date picker */
  close: () => void;
  /** Toggle open state */
  toggle: () => void;
  /** Clear the selected date */
  clear: () => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Check if disabled */
  isDisabled: () => boolean;
  /** Get calendar state (for advanced usage) */
  getCalendar: () => CalendarState | null;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  TRIGGER: 'data-atlas-date-picker-trigger',
  CONTENT: 'data-atlas-date-picker-content',
  PRESETS: 'data-atlas-date-picker-presets',
  PRESET: 'data-atlas-date-picker-preset',
  CLEAR: 'data-atlas-date-picker-clear',
  CALENDAR: 'data-atlas-date-picker-calendar',
} as const;

const CLASSES = {
  ROOT: 'atlas-date-picker',
  TRIGGER: 'atlas-date-picker-trigger',
  TRIGGER_ICON: 'atlas-date-picker-trigger-icon',
  TRIGGER_TEXT: 'atlas-date-picker-trigger-text',
  TRIGGER_PLACEHOLDER: 'atlas-date-picker-trigger-placeholder',
  TRIGGER_CLEAR: 'atlas-date-picker-trigger-clear',
  CONTENT: 'atlas-date-picker-content',
  CONTENT_OPEN: 'atlas-date-picker-content--open',
  PRESETS: 'atlas-date-picker-presets',
  PRESET: 'atlas-date-picker-preset',
  WITH_PRESETS: 'atlas-date-picker-with-presets',
  CALENDAR: 'atlas-date-picker-calendar',
  DISABLED: 'atlas-date-picker--disabled',
  OPEN: 'atlas-date-picker--open',
} as const;

const DEFAULT_PRESETS: DatePickerPreset[] = [
  {
    label: 'Today',
    getValue: () => new Date(),
  },
  {
    label: 'Tomorrow',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    },
  },
  {
    label: 'In a week',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d;
    },
  },
  {
    label: 'In a month',
    getValue: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d;
    },
  },
];

const CALENDAR_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

const CLEAR_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a date picker component with calendar popup
 *
 * @example
 * ```ts
 * const datePicker = createDatePicker(container, {
 *   mode: 'single',
 *   placeholder: 'Select a date',
 *   onChange: (date) => console.log('Selected:', date)
 * });
 * ```
 */
export function createDatePicker(
  element: HTMLElement,
  options: DatePickerOptions = {}
): DatePickerState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    mode = 'single',
    value: initialValue = null,
    placeholder = 'Pick a date',
    minDate,
    maxDate,
    disabledDates,
    weekStartsOn = 1,
    locale = 'en-US',
    placement: initialPlacement = 'bottom-start',
    offset = 4,
    showPresets = false,
    presets = DEFAULT_PRESETS,
    disabled: initialDisabled = false,
    clearable = true,
    closeOnEsc = true,
    closeOnClickOutside = true,
    numberOfMonths = 1,
    showWeekNumbers = false,
  } = options;

  // State
  let currentValue: Date | Date[] | [Date, Date] | null = initialValue;
  let isOpenState = false;
  let isDisabledState = initialDisabled;
  const currentPlacement = initialPlacement;

  // Elements
  const id = generateId('date-picker');
  let triggerEl: HTMLButtonElement | null = null;
  let contentEl: HTMLElement | null = null;
  let calendarEl: HTMLElement | null = null;
  let textEl: HTMLElement | null = null;
  let clearBtn: HTMLButtonElement | null = null;

  // Handlers
  let calendar: CalendarState | null = null;
  let focusTrap: FocusTrap | null = null;
  let dismissHandler: DismissalHandler | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;
  const cleanups: (() => void)[] = [];

  // Formatters
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-date-picker', '');
    element.id = id;

    if (isDisabledState) {
      element.classList.add(CLASSES.DISABLED);
    }

    // Find or create trigger
    triggerEl = element.querySelector(`[${ATTRS.TRIGGER}]`);
    if (!triggerEl) {
      triggerEl = document.createElement('button');
      triggerEl.setAttribute(ATTRS.TRIGGER, '');
      element.appendChild(triggerEl);
    }

    setupTrigger();

    // Find or create content
    contentEl = element.querySelector(`[${ATTRS.CONTENT}]`);
    if (!contentEl) {
      contentEl = document.createElement('div');
      contentEl.setAttribute(ATTRS.CONTENT, '');
      element.appendChild(contentEl);
    }

    setupContent();

    // Update display
    updateDisplay();
  }

  function setupTrigger(): void {
    if (!triggerEl) return;

    triggerEl.className = CLASSES.TRIGGER;
    triggerEl.type = 'button';
    triggerEl.setAttribute('aria-haspopup', 'dialog');
    triggerEl.setAttribute('aria-expanded', 'false');
    triggerEl.setAttribute('aria-controls', `${id}-content`);
    triggerEl.disabled = isDisabledState;

    // Build trigger content
    triggerEl.innerHTML = `
      <span class="${CLASSES.TRIGGER_ICON}">${CALENDAR_ICON}</span>
      <span class="${CLASSES.TRIGGER_TEXT} ${CLASSES.TRIGGER_PLACEHOLDER}">${placeholder}</span>
    `;

    textEl = triggerEl.querySelector(`.${CLASSES.TRIGGER_TEXT}`);

    // Event listeners
    cleanups.push(addListener(triggerEl, 'click', handleTriggerClick as EventListener));
    cleanups.push(addListener(triggerEl, 'keydown', handleTriggerKeydown as EventListener));
  }

  function setupContent(): void {
    if (!contentEl) return;

    contentEl.id = `${id}-content`;
    contentEl.className = CLASSES.CONTENT;
    contentEl.setAttribute('role', 'dialog');
    contentEl.setAttribute('aria-modal', 'true');
    contentEl.setAttribute('aria-label', 'Choose date');
    contentEl.style.display = 'none';
    contentEl.style.position = 'absolute';

    renderContent();
  }

  function renderContent(): void {
    if (!contentEl) return;

    contentEl.innerHTML = '';

    if (showPresets) {
      contentEl.classList.add(CLASSES.WITH_PRESETS);

      // Presets panel
      const presetsEl = document.createElement('div');
      presetsEl.className = CLASSES.PRESETS;
      presetsEl.setAttribute(ATTRS.PRESETS, '');

      presets.forEach((preset, index) => {
        const btn = document.createElement('button');
        btn.className = CLASSES.PRESET;
        btn.setAttribute(ATTRS.PRESET, '');
        btn.type = 'button';
        btn.textContent = preset.label;
        btn.dataset.presetIndex = String(index);
        btn.addEventListener('click', () => handlePresetClick(index));
        presetsEl.appendChild(btn);
      });

      contentEl.appendChild(presetsEl);
    }

    // Calendar container
    calendarEl = document.createElement('div');
    calendarEl.className = CLASSES.CALENDAR;
    calendarEl.setAttribute(ATTRS.CALENDAR, '');
    contentEl.appendChild(calendarEl);

    // Create calendar
    calendar = createCalendar(calendarEl, {
      mode,
      value: currentValue,
      minDate,
      maxDate,
      disabledDates,
      weekStartsOn,
      locale,
      numberOfMonths,
      showWeekNumbers,
      onChange: handleCalendarChange,
    });
  }

  function handleTriggerClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Check if clear button was clicked
    const target = event.target as HTMLElement;
    if (target.closest(`.${CLASSES.TRIGGER_CLEAR}`)) {
      clear();
      return;
    }

    if (isDisabledState) return;
    toggle();
  }

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (isDisabledState) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  }

  function handlePresetClick(index: number): void {
    const preset = presets[index];
    if (!preset) return;

    const date = preset.getValue();
    setValue(date);
    close();
  }

  function handleCalendarChange(value: Date | Date[] | [Date, Date] | null): void {
    currentValue = value;
    updateDisplay();
    options.onChange?.(value);

    // Auto-close for single mode when date is selected
    if (mode === 'single' && value) {
      setTimeout(() => close(), 150);
    }

    // Auto-close for range mode when both dates are selected
    if (mode === 'range' && Array.isArray(value) && value.length === 2) {
      const [start, end] = value as [Date, Date];
      if (start && end && start.getTime() !== end.getTime()) {
        setTimeout(() => close(), 150);
      }
    }
  }

  function open(): void {
    if (isOpenState || isDisabledState || !contentEl || !triggerEl) return;

    isOpenState = true;

    // Update ARIA
    triggerEl.setAttribute('aria-expanded', 'true');

    // Show content
    contentEl.style.display = '';
    element.classList.add(CLASSES.OPEN);
    contentEl.classList.add(CLASSES.CONTENT_OPEN);

    // Position
    updatePosition();

    // Auto-update position
    cleanupAutoUpdate = autoUpdate(triggerEl, contentEl, updatePosition);

    // Focus trap
    focusTrap = createFocusTrap({
      container: contentEl,
      initialFocus: 'container',
      returnFocus: triggerEl,
    });
    focusTrap.activate();

    // Dismissal
    dismissHandler = createDismissHandler(contentEl, {
      escapeKey: closeOnEsc,
      clickOutside: closeOnClickOutside,
      ignore: [triggerEl],
      onDismiss: close,
    });

    // Focus first day button in calendar
    requestAnimationFrame(() => {
      const dayBtn = calendarEl?.querySelector('button[data-atlas-calendar-day]') as HTMLElement;
      dayBtn?.focus();
    });

    options.onOpen?.();
  }

  function close(): void {
    if (!isOpenState || !contentEl || !triggerEl) return;

    isOpenState = false;

    // Update ARIA
    triggerEl.setAttribute('aria-expanded', 'false');

    // Remove classes
    element.classList.remove(CLASSES.OPEN);
    contentEl.classList.remove(CLASSES.CONTENT_OPEN);

    // Cleanup
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;

    focusTrap?.deactivate();
    focusTrap = null;

    dismissHandler?.destroy();
    dismissHandler = null;

    // Hide after animation
    setTimeout(() => {
      if (!isOpenState && contentEl) {
        contentEl.style.display = 'none';
      }
    }, ANIMATION_DURATION.normal);

    // Return focus
    triggerEl.focus();

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
    if (!triggerEl || !contentEl) return;

    const result = computeFloatingPosition(triggerEl, contentEl, {
      placement: currentPlacement,
      offset,
      flip: true,
      shift: true,
    });

    contentEl.style.left = `${result.x}px`;
    contentEl.style.top = `${result.y}px`;
    contentEl.setAttribute('data-placement', result.placement);
  }

  function formatDate(date: Date): string {
    return dateFormatter.format(date);
  }

  function updateDisplay(): void {
    if (!textEl || !triggerEl) return;

    // Remove existing clear button
    clearBtn?.remove();
    clearBtn = null;

    let displayText: string;
    let hasValue = false;

    if (mode === 'range') {
      if (
        Array.isArray(currentValue) &&
        currentValue.length === 2 &&
        currentValue[0] &&
        currentValue[1]
      ) {
        const [start, end] = currentValue as [Date, Date];
        displayText = `${formatDate(start)} - ${formatDate(end)}`;
        hasValue = true;
      } else if (Array.isArray(currentValue) && currentValue[0]) {
        displayText = `${formatDate(currentValue[0])} - ...`;
        hasValue = true;
      } else {
        displayText = placeholder;
      }
    } else if (mode === 'multiple') {
      if (Array.isArray(currentValue) && currentValue.length > 0) {
        displayText =
          currentValue.length === 1
            ? formatDate(currentValue[0])
            : `${currentValue.length} dates selected`;
        hasValue = true;
      } else {
        displayText = placeholder;
      }
    } else {
      if (currentValue instanceof Date) {
        displayText = formatDate(currentValue);
        hasValue = true;
      } else {
        displayText = placeholder;
      }
    }

    textEl.textContent = displayText;

    if (hasValue) {
      textEl.classList.remove(CLASSES.TRIGGER_PLACEHOLDER);
    } else {
      textEl.classList.add(CLASSES.TRIGGER_PLACEHOLDER);
    }

    // Add clear button if clearable and has value
    if (clearable && hasValue) {
      clearBtn = document.createElement('button');
      clearBtn.className = CLASSES.TRIGGER_CLEAR;
      clearBtn.setAttribute(ATTRS.CLEAR, '');
      clearBtn.type = 'button';
      clearBtn.setAttribute('aria-label', 'Clear date');
      clearBtn.innerHTML = CLEAR_ICON;
      triggerEl.appendChild(clearBtn);
    }
  }

  function setValue(value: Date | Date[] | [Date, Date] | null): void {
    currentValue = value;
    calendar?.setValue(value);
    updateDisplay();
    options.onChange?.(value);
  }

  function clear(): void {
    setValue(null);
  }

  function setDisabled(disabled: boolean): void {
    isDisabledState = disabled;

    if (disabled) {
      element.classList.add(CLASSES.DISABLED);
      triggerEl?.setAttribute('disabled', '');
      if (isOpenState) close();
    } else {
      element.classList.remove(CLASSES.DISABLED);
      triggerEl?.removeAttribute('disabled');
    }
  }

  function destroy(): void {
    if (isOpenState) {
      focusTrap?.deactivate();
      dismissHandler?.destroy();
      cleanupAutoUpdate?.();
    }

    calendar?.destroy();
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT, CLASSES.OPEN, CLASSES.DISABLED);
    element.removeAttribute('data-atlas-date-picker');
    element.removeAttribute('data-atlas-date-picker-initialized');
  }

  // Initialize
  init();

  return {
    getValue: () => currentValue,
    setValue,
    isOpen: () => isOpenState,
    open,
    close,
    toggle,
    clear,
    setDisabled,
    isDisabled: () => isDisabledState,
    getCalendar: () => calendar,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): DatePickerState {
  return {
    getValue: () => null,
    setValue: () => {},
    isOpen: () => false,
    open: () => {},
    close: () => {},
    toggle: () => {},
    clear: () => {},
    setDisabled: () => {},
    isDisabled: () => false,
    getCalendar: () => null,
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initDatePickers(root: Document | HTMLElement = document): DatePickerState[] {
  if (!isBrowser()) return [];

  const datePickers: DatePickerState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-date-picker]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-date-picker-initialized')) return;

    const options: DatePickerOptions = {
      mode: (element.getAttribute('data-mode') as DatePickerMode) ?? 'single',
      placeholder: element.getAttribute('data-placeholder') ?? 'Pick a date',
      placement: (element.getAttribute('data-placement') as FloatingPlacement) ?? 'bottom-start',
      offset: parseInt(element.getAttribute('data-offset') ?? '4', 10),
      showPresets: element.hasAttribute('data-show-presets'),
      disabled: element.hasAttribute('data-disabled'),
      clearable: element.getAttribute('data-clearable') !== 'false',
      closeOnEsc: element.getAttribute('data-close-on-esc') !== 'false',
      closeOnClickOutside: element.getAttribute('data-close-on-click-outside') !== 'false',
      weekStartsOn: parseInt(element.getAttribute('data-week-starts-on') ?? '1', 10) as
        | 0
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6,
      locale: element.getAttribute('data-locale') ?? 'en-US',
      numberOfMonths: parseInt(element.getAttribute('data-number-of-months') ?? '1', 10),
      showWeekNumbers: element.hasAttribute('data-show-week-numbers'),
    };

    // Parse min/max dates
    const minDateStr = element.getAttribute('data-min-date');
    const maxDateStr = element.getAttribute('data-max-date');
    if (minDateStr) options.minDate = new Date(minDateStr);
    if (maxDateStr) options.maxDate = new Date(maxDateStr);

    // Parse initial value
    const valueStr = element.getAttribute('data-value');
    if (valueStr) {
      if (options.mode === 'range') {
        const parts = valueStr.split(',');
        if (parts.length === 2) {
          options.value = [new Date(parts[0].trim()), new Date(parts[1].trim())];
        }
      } else if (options.mode === 'multiple') {
        options.value = valueStr.split(',').map((s) => new Date(s.trim()));
      } else {
        options.value = new Date(valueStr);
      }
    }

    const datePicker = createDatePicker(element, options);
    element.setAttribute('data-atlas-date-picker-initialized', '');
    datePickers.push(datePicker);
  });

  return datePickers;
}
