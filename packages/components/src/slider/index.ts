/**
 * Slider Component
 *
 * Range slider with single or dual handles for value selection.
 *
 * Features:
 * - Single or range mode (dual handles)
 * - Step increments
 * - Keyboard navigation
 * - Touch support
 * - Custom marks/ticks
 * - Tooltip display
 * - Vertical orientation
 *
 * @example
 * ```typescript
 * // Single value slider
 * const slider = createSlider(element, {
 *   min: 0,
 *   max: 100,
 *   value: 50,
 *   onChange: (value) => console.log('Value:', value),
 * });
 *
 * // Range slider with dual handles
 * const rangeSlider = createSlider(element, {
 *   min: 0,
 *   max: 1000,
 *   value: [200, 800],
 *   onChange: (value) => console.log('Range:', value),
 * });
 *
 * // Set value programmatically
 * slider.setValue(75);
 * rangeSlider.setValue([300, 700]);
 * ```
 */

import { generateId } from '../shared/aria';
import { addListener, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

export type SliderOrientation = 'horizontal' | 'vertical';

export type SliderSize = 'sm' | 'md' | 'lg';

export interface SliderMark {
  /** Value position */
  value: number;
  /** Optional label */
  label?: string;
}

export interface SliderOptions {
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Initial value (number for single, [number, number] for range) */
  value?: number | [number, number];
  /** Orientation (default: 'horizontal') */
  orientation?: SliderOrientation;
  /** Size (default: 'md') */
  size?: SliderSize;
  /** Disabled state (default: false) */
  disabled?: boolean;
  /** Show tooltip on drag (default: true) */
  showTooltip?: boolean;
  /** Always show tooltip (default: false) */
  alwaysShowTooltip?: boolean;
  /** Show marks/ticks */
  marks?: SliderMark[] | boolean;
  /** Format value for tooltip display */
  formatValue?: (value: number) => string;
  /** Form input name */
  name?: string;
  /** Called when value changes */
  onChange?: (value: number | [number, number]) => void;
  /** Called when drag starts */
  onDragStart?: () => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
}

export interface SliderState {
  /** Current value (number or [number, number] for range) */
  readonly value: number | [number, number];
  /** Whether slider is disabled */
  readonly isDisabled: boolean;
  /** Whether slider is being dragged */
  readonly isDragging: boolean;
  /** Whether it's a range slider */
  readonly isRange: boolean;
  /** Set value programmatically */
  setValue: (value: number | [number, number]) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Focus the slider */
  focus: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createSlider(element: HTMLElement, options: SliderOptions = {}): SliderState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopSliderState();
  }

  const {
    min = 0,
    max = 100,
    step = 1,
    value: initialValue = 50,
    orientation = 'horizontal',
    size = 'md',
    disabled: initialDisabled = false,
    showTooltip = true,
    alwaysShowTooltip = false,
    marks = false,
    formatValue = (v: number) => String(v),
    name,
    onChange,
    onDragStart,
    onDragEnd,
  } = options;

  const id = generateId('slider');
  const isRange = Array.isArray(initialValue);
  let currentValue: number | [number, number] = isRange
    ? ([...initialValue] as [number, number])
    : initialValue;
  let isDisabled = initialDisabled;
  let isDragging = false;
  let activeHandle: 'start' | 'end' | null = null;

  const cleanupListeners: (() => void)[] = [];

  // Size configurations
  const sizeConfig: Record<SliderSize, { track: number; thumb: number }> = {
    sm: { track: 4, thumb: 14 },
    md: { track: 6, thumb: 18 },
    lg: { track: 8, thumb: 22 },
  };

  const { track: trackSize, thumb: thumbSize } = sizeConfig[size];

  // DOM elements
  let track: HTMLElement;
  let trackFill: HTMLElement;
  let thumbStart: HTMLElement;
  let thumbEnd: HTMLElement | null = null;
  let tooltipStart: HTMLElement | null = null;
  let tooltipEnd: HTMLElement | null = null;

  // Create slider structure
  function createStructure(): void {
    element.innerHTML = '';
    element.classList.add('atlas-slider', `atlas-slider-${size}`, `atlas-slider-${orientation}`);
    element.setAttribute('data-atlas-slider', '');
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', 'Slider');

    const isVertical = orientation === 'vertical';

    element.style.cssText = `
      position: relative;
      ${isVertical ? 'height: 200px; width: auto;' : 'width: 100%; height: auto;'}
      display: flex;
      align-items: center;
      ${isVertical ? 'flex-direction: column;' : ''}
      padding: ${thumbSize / 2}px;
      touch-action: none;
      user-select: none;
    `;

    // Create track
    track = document.createElement('div');
    track.className = 'atlas-slider-track';
    track.style.cssText = `
      position: relative;
      ${isVertical ? `width: ${trackSize}px; height: 100%;` : `height: ${trackSize}px; width: 100%;`}
      background: var(--atlas-muted, hsl(210 40% 96.1%));
      border-radius: ${trackSize / 2}px;
      cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
    `;

    // Create track fill
    trackFill = document.createElement('div');
    trackFill.className = 'atlas-slider-fill';
    trackFill.style.cssText = `
      position: absolute;
      ${isVertical ? `width: 100%; left: 0;` : `height: 100%; top: 0;`}
      background: var(--atlas-primary, hsl(222.2 47.4% 11.2%));
      border-radius: ${trackSize / 2}px;
      pointer-events: none;
      transition: ${isDragging ? 'none' : `all ${ANIMATION_DURATION.fast}ms ${EASING.standard}`};
    `;
    track.appendChild(trackFill);

    // Create start thumb
    thumbStart = createThumb('start');
    track.appendChild(thumbStart);

    // Create end thumb for range
    if (isRange) {
      thumbEnd = createThumb('end');
      track.appendChild(thumbEnd);
    }

    element.appendChild(track);

    // Create marks if needed
    if (marks) {
      createMarks();
    }

    // Create hidden input for form submission
    if (name) {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = name;
      hiddenInput.id = `${id}-hidden`;
      hiddenInput.value = isRange
        ? (currentValue as [number, number]).join(',')
        : String(currentValue);
      element.appendChild(hiddenInput);
    }

    // Initial position update
    updatePositions();
  }

  function createThumb(type: 'start' | 'end'): HTMLElement {
    const thumb = document.createElement('div');
    thumb.className = `atlas-slider-thumb atlas-slider-thumb-${type}`;
    thumb.setAttribute('role', 'slider');
    thumb.setAttribute('tabindex', isDisabled ? '-1' : '0');
    thumb.setAttribute('aria-valuemin', String(min));
    thumb.setAttribute('aria-valuemax', String(max));
    thumb.setAttribute('aria-orientation', orientation);
    thumb.id = `${id}-thumb-${type}`;

    const isVertical = orientation === 'vertical';

    thumb.style.cssText = `
      position: absolute;
      width: ${thumbSize}px;
      height: ${thumbSize}px;
      background: var(--atlas-background, hsl(0 0% 100%));
      border: 2px solid var(--atlas-primary, hsl(222.2 47.4% 11.2%));
      border-radius: 50%;
      cursor: ${isDisabled ? 'not-allowed' : 'grab'};
      transform: translate(${isVertical ? '-50%' : '-50%'}, ${isVertical ? '50%' : '-50%'});
      ${isVertical ? 'left: 50%;' : 'top: 50%;'}
      transition: ${isDragging ? 'none' : `box-shadow ${ANIMATION_DURATION.fast}ms ${EASING.standard}`};
      z-index: 1;
    `;

    // Create tooltip
    if (showTooltip || alwaysShowTooltip) {
      const tooltip = document.createElement('div');
      tooltip.className = 'atlas-slider-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        ${isVertical ? 'left: calc(100% + 8px); top: 50%; transform: translateY(-50%);' : 'bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);'}
        background: var(--atlas-foreground, hsl(222.2 84% 4.9%));
        color: var(--atlas-background, hsl(0 0% 100%));
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        opacity: ${alwaysShowTooltip ? '1' : '0'};
        transition: opacity ${ANIMATION_DURATION.fast}ms ${EASING.standard};
      `;
      thumb.appendChild(tooltip);

      if (type === 'start') {
        tooltipStart = tooltip;
      } else {
        tooltipEnd = tooltip;
      }
    }

    // Set up event listeners for thumb
    setupThumbListeners(thumb, type);

    return thumb;
  }

  function createMarks(): void {
    const marksContainer = document.createElement('div');
    marksContainer.className = 'atlas-slider-marks';
    const isVertical = orientation === 'vertical';

    marksContainer.style.cssText = `
      position: absolute;
      ${isVertical ? 'left: calc(100% + 12px); top: 0; height: 100%;' : 'top: calc(100% + 8px); left: 0; width: 100%;'}
      pointer-events: none;
    `;

    const markPositions: SliderMark[] =
      marks === true ? generateAutoMarks() : (marks as SliderMark[]);

    markPositions.forEach((mark) => {
      const percent = ((mark.value - min) / (max - min)) * 100;
      const markEl = document.createElement('div');
      markEl.className = 'atlas-slider-mark';
      markEl.style.cssText = `
        position: absolute;
        ${isVertical ? `bottom: ${percent}%; transform: translateY(50%);` : `left: ${percent}%; transform: translateX(-50%);`}
        font-size: 11px;
        color: var(--atlas-muted-foreground, hsl(215.4 16.3% 46.9%));
      `;
      markEl.textContent = mark.label ?? String(mark.value);
      marksContainer.appendChild(markEl);
    });

    element.appendChild(marksContainer);
  }

  function generateAutoMarks(): SliderMark[] {
    const range = max - min;
    const markStep = range / 4; // 5 marks including min and max
    const marks: SliderMark[] = [];

    for (let i = 0; i <= 4; i++) {
      marks.push({ value: min + markStep * i });
    }

    return marks;
  }

  function setupThumbListeners(thumb: HTMLElement, type: 'start' | 'end'): void {
    // Mouse events
    const handleMouseDown = (e: MouseEvent): void => {
      if (isDisabled) return;
      e.preventDefault();
      startDrag(type);

      const handleMouseMove = (e: MouseEvent): void => {
        updateValueFromEvent(e, type);
      };

      const handleMouseUp = (): void => {
        endDrag();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    cleanupListeners.push(addListener(thumb, 'mousedown', handleMouseDown as EventListener));

    // Touch events
    const handleTouchStart = (e: TouchEvent): void => {
      if (isDisabled) return;
      e.preventDefault();
      startDrag(type);

      const handleTouchMove = (e: TouchEvent): void => {
        updateValueFromEvent(e.touches[0], type);
      };

      const handleTouchEnd = (): void => {
        endDrag();
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    };

    cleanupListeners.push(
      addListener(thumb, 'touchstart', handleTouchStart as EventListener, { passive: false })
    );

    // Keyboard events
    cleanupListeners.push(
      addListener(thumb, 'keydown', ((e: KeyboardEvent) => {
        if (isDisabled) return;
        handleKeyDown(e, type);
      }) as EventListener)
    );

    // Focus events for tooltip
    if (showTooltip && !alwaysShowTooltip) {
      cleanupListeners.push(
        addListener(thumb, 'focus', (() => {
          const tooltip = type === 'start' ? tooltipStart : tooltipEnd;
          if (tooltip) tooltip.style.opacity = '1';
        }) as EventListener),
        addListener(thumb, 'blur', (() => {
          const tooltip = type === 'start' ? tooltipStart : tooltipEnd;
          if (tooltip) tooltip.style.opacity = '0';
        }) as EventListener)
      );
    }
  }

  function startDrag(type: 'start' | 'end'): void {
    isDragging = true;
    activeHandle = type;
    const thumb = type === 'start' ? thumbStart : thumbEnd;

    if (thumb) {
      thumb.style.cursor = 'grabbing';
      thumb.style.boxShadow = '0 0 0 4px hsl(var(--atlas-ring) / 0.3)';
    }

    // Show tooltip
    if (showTooltip && !alwaysShowTooltip) {
      const tooltip = type === 'start' ? tooltipStart : tooltipEnd;
      if (tooltip) tooltip.style.opacity = '1';
    }

    onDragStart?.();
  }

  function endDrag(): void {
    isDragging = false;
    const thumb = activeHandle === 'start' ? thumbStart : thumbEnd;

    if (thumb) {
      thumb.style.cursor = isDisabled ? 'not-allowed' : 'grab';
      thumb.style.boxShadow = 'none';
    }

    // Hide tooltip
    if (showTooltip && !alwaysShowTooltip) {
      const tooltip = activeHandle === 'start' ? tooltipStart : tooltipEnd;
      if (tooltip) tooltip.style.opacity = '0';
    }

    activeHandle = null;
    onDragEnd?.();
  }

  function updateValueFromEvent(e: MouseEvent | Touch, type: 'start' | 'end'): void {
    const rect = track.getBoundingClientRect();
    const isVertical = orientation === 'vertical';

    let percent: number;
    if (isVertical) {
      percent = 1 - (e.clientY - rect.top) / rect.height;
    } else {
      percent = (e.clientX - rect.left) / rect.width;
    }

    percent = Math.max(0, Math.min(1, percent));
    let newValue = min + percent * (max - min);

    // Snap to step
    newValue = Math.round(newValue / step) * step;
    newValue = Math.max(min, Math.min(max, newValue));

    // Update value
    if (isRange) {
      const [startVal, endVal] = currentValue as [number, number];

      if (type === 'start') {
        // Don't allow start to exceed end
        newValue = Math.min(newValue, endVal);
        currentValue = [newValue, endVal];
      } else {
        // Don't allow end to be less than start
        newValue = Math.max(newValue, startVal);
        currentValue = [startVal, newValue];
      }
    } else {
      currentValue = newValue;
    }

    updatePositions();
    updateHiddenInput();
    onChange?.(currentValue);
  }

  function handleKeyDown(e: KeyboardEvent, type: 'start' | 'end'): void {
    const isVertical = orientation === 'vertical';
    let delta = 0;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        delta = isVertical ? (e.key === 'ArrowUp' ? step : 0) : e.key === 'ArrowRight' ? step : 0;
        if (delta === 0) delta = step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = isVertical
          ? e.key === 'ArrowDown'
            ? -step
            : 0
          : e.key === 'ArrowLeft'
            ? -step
            : 0;
        if (delta === 0) delta = -step;
        break;
      case 'PageUp':
        delta = step * 10;
        break;
      case 'PageDown':
        delta = -step * 10;
        break;
      case 'Home':
        if (isRange) {
          const [, endVal] = currentValue as [number, number];
          currentValue = type === 'start' ? [min, endVal] : [min, min];
        } else {
          currentValue = min;
        }
        updatePositions();
        updateHiddenInput();
        onChange?.(currentValue);
        e.preventDefault();
        return;
      case 'End':
        if (isRange) {
          const [startVal] = currentValue as [number, number];
          currentValue = type === 'end' ? [startVal, max] : [max, max];
        } else {
          currentValue = max;
        }
        updatePositions();
        updateHiddenInput();
        onChange?.(currentValue);
        e.preventDefault();
        return;
      default:
        return;
    }

    e.preventDefault();

    if (isRange) {
      const [startVal, endVal] = currentValue as [number, number];

      if (type === 'start') {
        let newStart = startVal + delta;
        newStart = Math.max(min, Math.min(newStart, endVal));
        currentValue = [newStart, endVal];
      } else {
        let newEnd = endVal + delta;
        newEnd = Math.max(startVal, Math.min(newEnd, max));
        currentValue = [startVal, newEnd];
      }
    } else {
      let newValue = (currentValue as number) + delta;
      newValue = Math.max(min, Math.min(newValue, max));
      currentValue = newValue;
    }

    updatePositions();
    updateHiddenInput();
    onChange?.(currentValue);
  }

  function updatePositions(): void {
    const isVertical = orientation === 'vertical';

    if (isRange) {
      const [startVal, endVal] = currentValue as [number, number];
      const startPercent = ((startVal - min) / (max - min)) * 100;
      const endPercent = ((endVal - min) / (max - min)) * 100;

      if (isVertical) {
        thumbStart.style.bottom = `${startPercent}%`;
        if (thumbEnd) thumbEnd.style.bottom = `${endPercent}%`;
        trackFill.style.bottom = `${startPercent}%`;
        trackFill.style.height = `${endPercent - startPercent}%`;
      } else {
        thumbStart.style.left = `${startPercent}%`;
        if (thumbEnd) thumbEnd.style.left = `${endPercent}%`;
        trackFill.style.left = `${startPercent}%`;
        trackFill.style.width = `${endPercent - startPercent}%`;
      }

      // Update ARIA
      thumbStart.setAttribute('aria-valuenow', String(startVal));
      thumbStart.setAttribute('aria-valuetext', formatValue(startVal));
      thumbEnd?.setAttribute('aria-valuenow', String(endVal));
      thumbEnd?.setAttribute('aria-valuetext', formatValue(endVal));

      // Update tooltips
      if (tooltipStart) tooltipStart.textContent = formatValue(startVal);
      if (tooltipEnd) tooltipEnd.textContent = formatValue(endVal);
    } else {
      const value = currentValue as number;
      const percent = ((value - min) / (max - min)) * 100;

      if (isVertical) {
        thumbStart.style.bottom = `${percent}%`;
        trackFill.style.bottom = '0';
        trackFill.style.height = `${percent}%`;
      } else {
        thumbStart.style.left = `${percent}%`;
        trackFill.style.left = '0';
        trackFill.style.width = `${percent}%`;
      }

      // Update ARIA
      thumbStart.setAttribute('aria-valuenow', String(value));
      thumbStart.setAttribute('aria-valuetext', formatValue(value));

      // Update tooltip
      if (tooltipStart) tooltipStart.textContent = formatValue(value);
    }
  }

  function updateHiddenInput(): void {
    if (!name) return;
    const hiddenInput = element.querySelector<HTMLInputElement>(`#${id}-hidden`);
    if (hiddenInput) {
      hiddenInput.value = isRange
        ? (currentValue as [number, number]).join(',')
        : String(currentValue);
    }
  }

  function updateDisabledState(): void {
    const thumbs = [thumbStart, thumbEnd].filter(Boolean) as HTMLElement[];

    thumbs.forEach((thumb) => {
      thumb.setAttribute('tabindex', isDisabled ? '-1' : '0');
      thumb.style.cursor = isDisabled ? 'not-allowed' : 'grab';
      thumb.style.opacity = isDisabled ? '0.5' : '1';
    });

    track.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    track.style.opacity = isDisabled ? '0.5' : '1';

    if (isDisabled) {
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.removeAttribute('aria-disabled');
    }
  }

  // Track click handling
  function setupTrackClick(): void {
    cleanupListeners.push(
      addListener(track, 'click', ((e: MouseEvent) => {
        if (isDisabled) return;
        if (e.target !== track && e.target !== trackFill) return;

        const rect = track.getBoundingClientRect();
        const isVertical = orientation === 'vertical';

        let percent: number;
        if (isVertical) {
          percent = 1 - (e.clientY - rect.top) / rect.height;
        } else {
          percent = (e.clientX - rect.left) / rect.width;
        }

        percent = Math.max(0, Math.min(1, percent));
        let newValue = min + percent * (max - min);
        newValue = Math.round(newValue / step) * step;

        if (isRange) {
          const [startVal, endVal] = currentValue as [number, number];
          const distToStart = Math.abs(newValue - startVal);
          const distToEnd = Math.abs(newValue - endVal);

          if (distToStart <= distToEnd) {
            currentValue = [Math.min(newValue, endVal), endVal];
          } else {
            currentValue = [startVal, Math.max(newValue, startVal)];
          }
        } else {
          currentValue = newValue;
        }

        updatePositions();
        updateHiddenInput();
        onChange?.(currentValue);
      }) as EventListener)
    );
  }

  // Initialize
  createStructure();
  setupTrackClick();
  updateDisabledState();

  // Public API
  const setValue = (value: number | [number, number]): void => {
    if (isRange && Array.isArray(value)) {
      currentValue = [
        Math.max(min, Math.min(value[0], max)),
        Math.max(min, Math.min(value[1], max)),
      ];
    } else if (!isRange && typeof value === 'number') {
      currentValue = Math.max(min, Math.min(value, max));
    }

    updatePositions();
    updateHiddenInput();
    onChange?.(currentValue);
  };

  const setDisabled = (disabled: boolean): void => {
    isDisabled = disabled;
    updateDisabledState();
  };

  const focus = (): void => {
    thumbStart.focus();
  };

  const destroy = (): void => {
    cleanupListeners.forEach((cleanup) => cleanup());
    element.innerHTML = '';
    element.classList.remove('atlas-slider', `atlas-slider-${size}`, `atlas-slider-${orientation}`);
    element.removeAttribute('data-atlas-slider');
    element.removeAttribute('role');
    element.removeAttribute('aria-label');
    element.removeAttribute('aria-disabled');
    element.style.cssText = '';
  };

  return {
    get value() {
      return currentValue;
    },
    get isDisabled() {
      return isDisabled;
    },
    get isDragging() {
      return isDragging;
    },
    get isRange() {
      return isRange;
    },
    setValue,
    setDisabled,
    focus,
    destroy,
  };
}

function createNoopSliderState(): SliderState {
  return {
    get value() {
      return 0;
    },
    get isDisabled() {
      return false;
    },
    get isDragging() {
      return false;
    },
    get isRange() {
      return false;
    },
    setValue: () => {},
    setDisabled: () => {},
    focus: () => {},
    destroy: () => {},
  };
}

/**
 * Auto-initialize all sliders with data-atlas-slider attribute
 */
export function initSliders(
  root: Document | HTMLElement = document
): Map<HTMLElement, SliderState> {
  const instances = new Map<HTMLElement, SliderState>();

  if (!isBrowser()) return instances;

  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-slider]');

  elements.forEach((element) => {
    // Skip if already initialized
    if (element.querySelector('.atlas-slider-track')) return;

    // Parse value - could be single number or range
    let value: number | [number, number] = 50;
    if (element.dataset.value) {
      if (element.dataset.value.includes(',')) {
        const parts = element.dataset.value.split(',').map(Number);
        value = [parts[0], parts[1]];
      } else {
        value = Number(element.dataset.value);
      }
    }

    // Parse marks
    let marks: SliderMark[] | boolean = false;
    if (element.dataset.marks === 'true') {
      marks = true;
    } else if (element.dataset.marks) {
      try {
        marks = JSON.parse(element.dataset.marks);
      } catch {
        marks = false;
      }
    }

    const options: SliderOptions = {
      min: element.dataset.min ? Number(element.dataset.min) : 0,
      max: element.dataset.max ? Number(element.dataset.max) : 100,
      step: element.dataset.step ? Number(element.dataset.step) : 1,
      value,
      orientation: (element.dataset.orientation as SliderOrientation) || 'horizontal',
      size: (element.dataset.size as SliderSize) || 'md',
      disabled: element.dataset.disabled === 'true',
      showTooltip: element.dataset.showTooltip !== 'false',
      alwaysShowTooltip: element.dataset.alwaysShowTooltip === 'true',
      marks,
      name: element.dataset.name,
    };

    const instance = createSlider(element, options);
    instances.set(element, instance);
  });

  return instances;
}
