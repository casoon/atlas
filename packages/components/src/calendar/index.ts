/**
 * @fileoverview Calendar component - date picker calendar
 * @module @atlas/components/calendar
 */

import { generateId } from '../shared/aria';
import { isBrowser } from '../shared/dom';

// ============================================================================
// Types
// ============================================================================

export type CalendarMode = 'single' | 'range' | 'multiple';

export interface CalendarOptions {
  /** Selection mode */
  mode?: CalendarMode;
  /** Initial selected date(s) */
  value?: Date | Date[] | [Date, Date] | null;
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
  /** Show week numbers */
  showWeekNumbers?: boolean;
  /** Show outside days (days from prev/next month) */
  showOutsideDays?: boolean;
  /** Number of months to display */
  numberOfMonths?: number;
  /** Callback when selection changes */
  onChange?: (value: Date | Date[] | [Date, Date] | null) => void;
  /** Callback when month changes */
  onMonthChange?: (date: Date) => void;
}

export interface CalendarState {
  /** Get current value */
  getValue: () => Date | Date[] | [Date, Date] | null;
  /** Set value */
  setValue: (value: Date | Date[] | [Date, Date] | null) => void;
  /** Get current viewed month */
  getViewedMonth: () => Date;
  /** Set viewed month */
  setViewedMonth: (date: Date) => void;
  /** Go to next month */
  nextMonth: () => void;
  /** Go to previous month */
  prevMonth: () => void;
  /** Go to today */
  goToToday: () => void;
  /** Check if date is selected */
  isSelected: (date: Date) => boolean;
  /** Check if date is disabled */
  isDisabled: (date: Date) => boolean;
  /** Refresh calendar rendering */
  refresh: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  HEADER: 'data-atlas-calendar-header',
  GRID: 'data-atlas-calendar-grid',
  DAY: 'data-atlas-calendar-day',
  PREV: 'data-atlas-calendar-prev',
  NEXT: 'data-atlas-calendar-next',
} as const;

const CLASSES = {
  ROOT: 'atlas-calendar',
  HEADER: 'atlas-calendar-header',
  TITLE: 'atlas-calendar-title',
  NAV: 'atlas-calendar-nav',
  NAV_BTN: 'atlas-calendar-nav-btn',
  GRID: 'atlas-calendar-grid',
  WEEKDAYS: 'atlas-calendar-weekdays',
  WEEKDAY: 'atlas-calendar-weekday',
  WEEK: 'atlas-calendar-week',
  WEEK_NUMBER: 'atlas-calendar-week-number',
  DAY: 'atlas-calendar-day',
  DAY_TODAY: 'atlas-calendar-day--today',
  DAY_SELECTED: 'atlas-calendar-day--selected',
  DAY_DISABLED: 'atlas-calendar-day--disabled',
  DAY_OUTSIDE: 'atlas-calendar-day--outside',
  DAY_RANGE_START: 'atlas-calendar-day--range-start',
  DAY_RANGE_END: 'atlas-calendar-day--range-end',
  DAY_RANGE_MIDDLE: 'atlas-calendar-day--range-middle',
} as const;

const CHEVRON_LEFT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
const CHEVRON_RIGHT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a calendar component for date selection
 *
 * @example
 * ```ts
 * const calendar = createCalendar(element, {
 *   mode: 'single',
 *   value: new Date(),
 *   minDate: new Date(),
 *   onChange: (date) => console.log('Selected:', date)
 * });
 * ```
 */
export function createCalendar(element: HTMLElement, options: CalendarOptions = {}): CalendarState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    mode = 'single',
    value: initialValue = null,
    minDate,
    maxDate,
    disabledDates,
    weekStartsOn = 1,
    locale = 'en-US',
    showWeekNumbers = false,
    showOutsideDays = true,
    numberOfMonths = 1,
  } = options;

  // State
  let currentValue = initialValue;
  let viewedMonth = initialValue instanceof Date ? new Date(initialValue) : new Date();
  let _rangeHover: Date | null = null;

  // Elements
  const id = generateId('calendar');
  const cleanups: (() => void)[] = [];

  // Formatters
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-calendar', '');
    element.setAttribute('role', 'application');
    element.setAttribute('aria-label', 'Calendar');
    element.id = id;

    render();
  }

  function render(): void {
    element.innerHTML = '';

    for (let i = 0; i < numberOfMonths; i++) {
      const monthDate = new Date(viewedMonth);
      monthDate.setMonth(monthDate.getMonth() + i);
      element.appendChild(createMonthView(monthDate, i === 0, i === numberOfMonths - 1));
    }
  }

  function createMonthView(date: Date, showPrev: boolean, showNext: boolean): HTMLElement {
    const container = document.createElement('div');
    container.className = 'atlas-calendar-month';

    // Header
    const header = document.createElement('div');
    header.className = CLASSES.HEADER;
    header.setAttribute(ATTRS.HEADER, '');

    // Prev button
    if (showPrev) {
      const prevBtn = document.createElement('button');
      prevBtn.className = CLASSES.NAV_BTN;
      prevBtn.setAttribute(ATTRS.PREV, '');
      prevBtn.type = 'button';
      prevBtn.innerHTML = CHEVRON_LEFT;
      prevBtn.setAttribute('aria-label', 'Previous month');
      prevBtn.addEventListener('click', prevMonth);
      header.appendChild(prevBtn);
    } else {
      header.appendChild(document.createElement('span'));
    }

    // Title
    const title = document.createElement('div');
    title.className = CLASSES.TITLE;
    title.textContent = monthFormatter.format(date);
    title.setAttribute('aria-live', 'polite');
    header.appendChild(title);

    // Next button
    if (showNext) {
      const nextBtn = document.createElement('button');
      nextBtn.className = CLASSES.NAV_BTN;
      nextBtn.setAttribute(ATTRS.NEXT, '');
      nextBtn.type = 'button';
      nextBtn.innerHTML = CHEVRON_RIGHT;
      nextBtn.setAttribute('aria-label', 'Next month');
      nextBtn.addEventListener('click', nextMonth);
      header.appendChild(nextBtn);
    } else {
      header.appendChild(document.createElement('span'));
    }

    container.appendChild(header);

    // Grid
    const grid = document.createElement('div');
    grid.className = CLASSES.GRID;
    grid.setAttribute(ATTRS.GRID, '');
    grid.setAttribute('role', 'grid');

    // Weekday headers
    const weekdays = document.createElement('div');
    weekdays.className = CLASSES.WEEKDAYS;
    weekdays.setAttribute('role', 'row');

    if (showWeekNumbers) {
      const empty = document.createElement('div');
      empty.className = CLASSES.WEEK_NUMBER;
      weekdays.appendChild(empty);
    }

    for (let i = 0; i < 7; i++) {
      const dayIndex = (weekStartsOn + i) % 7;
      const day = document.createElement('div');
      day.className = CLASSES.WEEKDAY;
      day.setAttribute('role', 'columnheader');

      const tempDate = new Date(2024, 0, dayIndex); // Jan 2024 starts on Monday
      day.textContent = dayFormatter.format(tempDate).slice(0, 2);
      weekdays.appendChild(day);
    }

    grid.appendChild(weekdays);

    // Days
    const weeks = getWeeksInMonth(date);
    weeks.forEach((week) => {
      const weekRow = document.createElement('div');
      weekRow.className = CLASSES.WEEK;
      weekRow.setAttribute('role', 'row');

      if (showWeekNumbers) {
        const weekNum = document.createElement('div');
        weekNum.className = CLASSES.WEEK_NUMBER;
        weekNum.textContent = String(getWeekNumber(week[0]));
        weekRow.appendChild(weekNum);
      }

      week.forEach((dayDate) => {
        const dayEl = createDayElement(dayDate, date);
        weekRow.appendChild(dayEl);
      });

      grid.appendChild(weekRow);
    });

    container.appendChild(grid);

    return container;
  }

  function createDayElement(date: Date, monthDate: Date): HTMLElement {
    const day = document.createElement('button');
    day.className = CLASSES.DAY;
    day.setAttribute(ATTRS.DAY, '');
    day.setAttribute('role', 'gridcell');
    day.type = 'button';
    day.textContent = String(date.getDate());
    day.setAttribute('data-date', date.toISOString());

    const isToday = isSameDay(date, new Date());
    const isOutside = date.getMonth() !== monthDate.getMonth();
    const disabled = isDisabled(date);
    const selected = isSelected(date);

    if (isToday) day.classList.add(CLASSES.DAY_TODAY);
    if (isOutside) day.classList.add(CLASSES.DAY_OUTSIDE);
    if (disabled) {
      day.classList.add(CLASSES.DAY_DISABLED);
      day.disabled = true;
    }
    if (selected) day.classList.add(CLASSES.DAY_SELECTED);

    // Range styling
    if (mode === 'range' && Array.isArray(currentValue) && currentValue.length === 2) {
      const [start, end] = currentValue as [Date, Date];
      if (isSameDay(date, start)) day.classList.add(CLASSES.DAY_RANGE_START);
      if (isSameDay(date, end)) day.classList.add(CLASSES.DAY_RANGE_END);
      if (date > start && date < end) day.classList.add(CLASSES.DAY_RANGE_MIDDLE);
    }

    day.setAttribute('aria-selected', selected ? 'true' : 'false');
    if (disabled) day.setAttribute('aria-disabled', 'true');

    if (!isOutside || showOutsideDays) {
      day.addEventListener('click', () => handleDayClick(date));
      if (mode === 'range') {
        day.addEventListener('mouseenter', () => handleDayHover(date));
      }
    } else {
      day.style.visibility = 'hidden';
    }

    return day;
  }

  function handleDayClick(date: Date): void {
    if (isDisabled(date)) return;

    switch (mode) {
      case 'single':
        currentValue = date;
        break;

      case 'multiple': {
        const current = (currentValue as Date[]) ?? [];
        const index = current.findIndex((d) => isSameDay(d, date));
        if (index >= 0) {
          current.splice(index, 1);
        } else {
          current.push(date);
        }
        currentValue = [...current];
        break;
      }

      case 'range': {
        const range = currentValue as [Date, Date] | null;
        if (!range || range.length === 2 || !range[0]) {
          currentValue = [date, date];
        } else {
          const [start] = range;
          if (date < start) {
            currentValue = [date, start];
          } else {
            currentValue = [start, date];
          }
        }
        break;
      }
    }

    render();
    options.onChange?.(currentValue);
  }

  function handleDayHover(date: Date): void {
    _rangeHover = date;
    // Could implement preview rendering here
  }

  function getWeeksInMonth(date: Date): Date[][] {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust to week start
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    const diff = (dayOfWeek - weekStartsOn + 7) % 7;
    startDate.setDate(startDate.getDate() - diff);

    const weeks: Date[][] = [];
    const current = new Date(startDate);

    while (current <= lastDay || weeks.length < 6) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);

      if (current.getMonth() !== month && weeks.length >= 4) {
        break;
      }
    }

    return weeks;
  }

  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  function isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isSelected(date: Date): boolean {
    if (!currentValue) return false;

    if (currentValue instanceof Date) {
      return isSameDay(date, currentValue);
    }

    if (Array.isArray(currentValue)) {
      return currentValue.some((d) => isSameDay(date, d));
    }

    return false;
  }

  function isDisabled(date: Date): boolean {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    if (typeof disabledDates === 'function') {
      return disabledDates(date);
    }

    if (Array.isArray(disabledDates)) {
      return disabledDates.some((d) => isSameDay(date, d));
    }

    return false;
  }

  function nextMonth(): void {
    viewedMonth.setMonth(viewedMonth.getMonth() + 1);
    render();
    options.onMonthChange?.(new Date(viewedMonth));
  }

  function prevMonth(): void {
    viewedMonth.setMonth(viewedMonth.getMonth() - 1);
    render();
    options.onMonthChange?.(new Date(viewedMonth));
  }

  function goToToday(): void {
    viewedMonth = new Date();
    render();
    options.onMonthChange?.(new Date(viewedMonth));
  }

  function setValue(value: Date | Date[] | [Date, Date] | null): void {
    currentValue = value;
    if (value instanceof Date) {
      viewedMonth = new Date(value);
    }
    render();
  }

  function setViewedMonth(date: Date): void {
    viewedMonth = new Date(date);
    render();
    options.onMonthChange?.(new Date(viewedMonth));
  }

  function refresh(): void {
    render();
  }

  function destroy(): void {
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute('data-atlas-calendar');
    element.removeAttribute('role');
    element.removeAttribute('aria-label');
    element.innerHTML = '';
  }

  // Initialize
  init();

  return {
    getValue: () => currentValue,
    setValue,
    getViewedMonth: () => new Date(viewedMonth),
    setViewedMonth,
    nextMonth,
    prevMonth,
    goToToday,
    isSelected,
    isDisabled,
    refresh,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): CalendarState {
  return {
    getValue: () => null,
    setValue: () => {},
    getViewedMonth: () => new Date(),
    setViewedMonth: () => {},
    nextMonth: () => {},
    prevMonth: () => {},
    goToToday: () => {},
    isSelected: () => false,
    isDisabled: () => false,
    refresh: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initCalendars(root: Document | HTMLElement = document): CalendarState[] {
  if (!isBrowser()) return [];

  const calendars: CalendarState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-calendar]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-calendar-initialized')) return;

    const options: CalendarOptions = {
      mode: (element.getAttribute('data-mode') as CalendarMode) ?? 'single',
      weekStartsOn: parseInt(element.getAttribute('data-week-starts-on') ?? '1', 10) as
        | 0
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6,
      locale: element.getAttribute('data-locale') ?? 'en-US',
      showWeekNumbers: element.hasAttribute('data-show-week-numbers'),
      showOutsideDays: element.getAttribute('data-show-outside-days') !== 'false',
      numberOfMonths: parseInt(element.getAttribute('data-number-of-months') ?? '1', 10),
    };

    const calendar = createCalendar(element, options);
    element.setAttribute('data-atlas-calendar-initialized', '');
    calendars.push(calendar);
  });

  return calendars;
}
