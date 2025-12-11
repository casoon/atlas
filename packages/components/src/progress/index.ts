/**
 * Progress Component
 *
 * Smooth loading progress indicators with micro-interactions:
 * - Linear progress bar with shimmer effect
 * - Circular progress ring with smooth animation
 * - Indeterminate mode with flowing animation
 * - Success/error states with animations
 * - Step indicator for multi-step processes
 *
 * @example
 * ```typescript
 * // Linear progress bar
 * const linear = createProgress(document.getElementById('progress'), {
 *   type: 'linear',
 *   value: 0,
 *   animated: true,
 * });
 *
 * // Update progress
 * linear.setValue(50);
 *
 * // Complete with success animation
 * linear.complete();
 *
 * // Circular progress ring
 * const circular = createProgress(document.getElementById('ring'), {
 *   type: 'circular',
 *   size: 64,
 *   strokeWidth: 4,
 * });
 *
 * circular.setValue(75);
 * ```
 */

import { announce } from '../shared/aria';
import { isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

/** Progress indicator type */
export type ProgressType = 'linear' | 'circular';

/** Progress visual state */
export type ProgressVisualState = 'idle' | 'loading' | 'success' | 'error';

export interface ProgressOptions {
  /** Type of progress indicator (default: 'linear') */
  type?: ProgressType;
  /** Initial value (0-100) */
  value?: number;
  /** Indeterminate mode - shows continuous animation (default: false) */
  indeterminate?: boolean;
  /** Enable shimmer effect on progress (default: true) */
  shimmer?: boolean;
  /** Animate value changes (default: true) */
  animated?: boolean;
  /** Size for circular progress in pixels (default: 48) */
  size?: number;
  /** Stroke width for circular progress (default: 4) */
  strokeWidth?: number;
  /** Primary color (default: uses CSS variable) */
  color?: string;
  /** Background/track color */
  trackColor?: string;
  /** Show percentage label (default: false) */
  showLabel?: boolean;
  /** Announce progress to screen readers (default: true) */
  announceProgress?: boolean;
  /** Called when progress changes */
  onChange?: (value: number) => void;
  /** Called when progress completes */
  onComplete?: () => void;
}

export interface ProgressState {
  /** Current progress value (0-100) */
  readonly value: number;
  /** Current visual state */
  readonly visualState: ProgressVisualState;
  /** Set progress value */
  setValue: (value: number) => void;
  /** Set indeterminate mode */
  setIndeterminate: (indeterminate: boolean) => void;
  /** Complete with success animation */
  complete: () => void;
  /** Show error state */
  error: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Clean up */
  destroy: () => void;
}

export function createProgress(element: HTMLElement, options: ProgressOptions = {}): ProgressState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopProgressState();
  }

  const {
    type = 'linear',
    value: initialValue = 0,
    indeterminate = false,
    shimmer = true,
    animated = true,
    size = 48,
    strokeWidth = 4,
    color = 'var(--atlas-primary, #3b82f6)',
    trackColor = 'var(--atlas-gray-200, #e5e7eb)',
    showLabel = false,
    announceProgress = true,
    onChange,
    onComplete,
  } = options;

  let currentValue = Math.max(0, Math.min(100, initialValue));
  let visualState: ProgressVisualState = indeterminate ? 'loading' : 'idle';
  let isIndeterminate = indeterminate;
  let progressElement: HTMLElement | null = null;
  let labelElement: HTMLElement | null = null;
  const animationFrame: number | null = null;

  // Store original content
  const originalContent = element.innerHTML;

  // Create progress structure based on type
  if (type === 'linear') {
    createLinearProgress();
  } else {
    createCircularProgress();
  }

  function createLinearProgress() {
    element.innerHTML = '';
    element.style.cssText = `
      position: relative;
      width: 100%;
      height: 4px;
      background: ${trackColor};
      border-radius: 9999px;
      overflow: hidden;
    `;

    element.setAttribute('role', 'progressbar');
    element.setAttribute('aria-valuemin', '0');
    element.setAttribute('aria-valuemax', '100');
    element.setAttribute('aria-valuenow', String(currentValue));

    // Create progress bar
    progressElement = document.createElement('div');
    progressElement.className = 'atlas-progress-bar';
    progressElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: ${currentValue}%;
      background: ${color};
      border-radius: 9999px;
      transition: ${animated ? `width ${ANIMATION_DURATION.normal}ms ${EASING.decelerate}` : 'none'};
    `;

    // Add shimmer effect
    if (shimmer) {
      const shimmerElement = document.createElement('div');
      shimmerElement.className = 'atlas-progress-shimmer';
      shimmerElement.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.3) 50%,
          transparent 100%
        );
        animation: atlas-shimmer 1.5s infinite;
      `;
      progressElement.appendChild(shimmerElement);
    }

    element.appendChild(progressElement);

    // Create label if needed
    if (showLabel) {
      labelElement = document.createElement('span');
      labelElement.className = 'atlas-progress-label';
      labelElement.style.cssText = `
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 12px;
        font-weight: 500;
        color: currentColor;
      `;
      labelElement.textContent = `${Math.round(currentValue)}%`;
      element.style.height = '20px';
      element.appendChild(labelElement);
    }

    // Set up indeterminate animation
    if (isIndeterminate) {
      applyIndeterminateLinear();
    }
  }

  function createCircularProgress() {
    element.innerHTML = '';
    element.style.cssText = `
      position: relative;
      width: ${size}px;
      height: ${size}px;
    `;

    element.setAttribute('role', 'progressbar');
    element.setAttribute('aria-valuemin', '0');
    element.setAttribute('aria-valuemax', '100');
    element.setAttribute('aria-valuenow', String(currentValue));

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (currentValue / 100) * circumference;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.style.cssText = 'transform: rotate(-90deg);';

    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', String(size / 2));
    bgCircle.setAttribute('cy', String(size / 2));
    bgCircle.setAttribute('r', String(radius));
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', trackColor);
    bgCircle.setAttribute('stroke-width', String(strokeWidth));

    // Progress circle
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', String(size / 2));
    progressCircle.setAttribute('cy', String(size / 2));
    progressCircle.setAttribute('r', String(radius));
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke', color);
    progressCircle.setAttribute('stroke-width', String(strokeWidth));
    progressCircle.setAttribute('stroke-linecap', 'round');
    progressCircle.setAttribute('stroke-dasharray', String(circumference));
    progressCircle.setAttribute('stroke-dashoffset', String(offset));
    progressCircle.style.cssText = animated
      ? `transition: stroke-dashoffset ${ANIMATION_DURATION.normal}ms ${EASING.decelerate};`
      : '';

    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);
    element.appendChild(svg);

    progressElement = progressCircle as unknown as HTMLElement;

    // Create label if needed
    if (showLabel) {
      labelElement = document.createElement('span');
      labelElement.className = 'atlas-progress-label';
      labelElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: ${size / 4}px;
        font-weight: 600;
        color: currentColor;
      `;
      labelElement.textContent = `${Math.round(currentValue)}%`;
      element.appendChild(labelElement);
    }

    // Set up indeterminate animation
    if (isIndeterminate) {
      applyIndeterminateCircular();
    }
  }

  function applyIndeterminateLinear() {
    if (progressElement) {
      progressElement.style.width = '30%';
      progressElement.style.animation = 'atlas-progress-indeterminate 1.5s ease-in-out infinite';
    }
  }

  function applyIndeterminateCircular() {
    const svg = element.querySelector('svg');
    if (svg) {
      svg.style.animation = 'atlas-spin 1.5s linear infinite';
    }

    if (progressElement) {
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      progressElement.setAttribute(
        'stroke-dasharray',
        `${circumference * 0.25} ${circumference * 0.75}`
      );
      progressElement.setAttribute('stroke-dashoffset', '0');
    }
  }

  function removeIndeterminate() {
    if (type === 'linear' && progressElement) {
      progressElement.style.animation = '';
      progressElement.style.width = `${currentValue}%`;
    } else {
      const svg = element.querySelector('svg');
      if (svg) {
        svg.style.animation = '';
      }
    }
  }

  // Set value
  const setValue = (value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));

    if (clampedValue === currentValue) return;

    currentValue = clampedValue;
    visualState = 'loading';

    if (isIndeterminate) {
      setIndeterminate(false);
    }

    element.setAttribute('aria-valuenow', String(currentValue));

    if (type === 'linear' && progressElement) {
      progressElement.style.width = `${currentValue}%`;
    } else if (type === 'circular' && progressElement) {
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (currentValue / 100) * circumference;
      progressElement.setAttribute('stroke-dashoffset', String(offset));
    }

    if (labelElement) {
      labelElement.textContent = `${Math.round(currentValue)}%`;
    }

    if (announceProgress && currentValue % 25 === 0) {
      announce(`Progress: ${Math.round(currentValue)}%`, 'polite');
    }

    onChange?.(currentValue);

    if (currentValue >= 100) {
      onComplete?.();
    }
  };

  // Set indeterminate mode
  const setIndeterminate = (indeterminate: boolean) => {
    if (isIndeterminate === indeterminate) return;

    isIndeterminate = indeterminate;

    if (indeterminate) {
      element.removeAttribute('aria-valuenow');
      visualState = 'loading';

      if (type === 'linear') {
        applyIndeterminateLinear();
      } else {
        applyIndeterminateCircular();
      }
    } else {
      element.setAttribute('aria-valuenow', String(currentValue));
      removeIndeterminate();
    }
  };

  // Complete with success animation
  const complete = () => {
    setValue(100);
    visualState = 'success';

    // Add success color and animation
    if (progressElement) {
      const successColor = 'var(--atlas-success, #22c55e)';

      if (type === 'linear') {
        progressElement.style.background = successColor;
      } else {
        progressElement.setAttribute('stroke', successColor);
      }

      // Pulse animation
      if (element.animate) {
        element.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
          {
            duration: 300,
            easing: EASING.bounce,
          }
        );
      }
    }

    if (showLabel && labelElement) {
      labelElement.textContent = '✓';
    }

    announce('Progress complete', 'polite');
  };

  // Show error state
  const error = () => {
    visualState = 'error';

    if (progressElement) {
      const errorColor = 'var(--atlas-error, #ef4444)';

      if (type === 'linear') {
        progressElement.style.background = errorColor;
      } else {
        progressElement.setAttribute('stroke', errorColor);
      }

      // Shake animation
      if (element.animate) {
        element.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(0)' },
          ],
          {
            duration: 300,
            easing: 'ease-in-out',
          }
        );
      }
    }

    if (showLabel && labelElement) {
      labelElement.textContent = '✕';
    }

    announce('Progress error', 'assertive');
  };

  // Reset to initial state
  const reset = () => {
    currentValue = 0;
    visualState = 'idle';
    isIndeterminate = indeterminate;

    if (type === 'linear') {
      createLinearProgress();
    } else {
      createCircularProgress();
    }
  };

  // Cleanup
  const destroy = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    element.innerHTML = originalContent;
    element.removeAttribute('role');
    element.removeAttribute('aria-valuemin');
    element.removeAttribute('aria-valuemax');
    element.removeAttribute('aria-valuenow');
    element.style.cssText = '';
  };

  return {
    get value() {
      return currentValue;
    },
    get visualState() {
      return visualState;
    },
    setValue,
    setIndeterminate,
    complete,
    error,
    reset,
    destroy,
  };
}

/** No-op progress state for SSR */
function createNoopProgressState(): ProgressState {
  return {
    get value() {
      return 0;
    },
    get visualState(): ProgressVisualState {
      return 'idle';
    },
    setValue: () => {},
    setIndeterminate: () => {},
    complete: () => {},
    error: () => {},
    reset: () => {},
    destroy: () => {},
  };
}

/**
 * Create a step indicator for multi-step processes
 *
 * @example
 * ```typescript
 * const steps = createStepProgress(document.getElementById('steps'), {
 *   steps: ['Account', 'Details', 'Confirm'],
 *   currentStep: 0,
 * });
 *
 * steps.next(); // Move to next step with animation
 * steps.setStep(2); // Jump to step with animation
 * ```
 */
export interface StepProgressOptions {
  /** Step labels */
  steps: string[];
  /** Current step index (0-based) */
  currentStep?: number;
  /** Connector line style */
  connectorStyle?: 'solid' | 'dashed';
  /** Called when step changes */
  onStepChange?: (step: number) => void;
}

export interface StepProgressState {
  /** Current step index */
  readonly currentStep: number;
  /** Move to next step */
  next: () => void;
  /** Move to previous step */
  previous: () => void;
  /** Set specific step */
  setStep: (step: number) => void;
  /** Clean up */
  destroy: () => void;
}

export function createStepProgress(
  element: HTMLElement,
  options: StepProgressOptions
): StepProgressState {
  if (!isBrowser()) {
    return {
      get currentStep() {
        return 0;
      },
      next: () => {},
      previous: () => {},
      setStep: () => {},
      destroy: () => {},
    };
  }

  const { steps, currentStep: initialStep = 0, connectorStyle = 'solid', onStepChange } = options;

  let currentStep = Math.max(0, Math.min(steps.length - 1, initialStep));
  const originalContent = element.innerHTML;

  // Create step indicator UI
  const createUI = () => {
    element.innerHTML = '';
    element.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    `;

    steps.forEach((label, index) => {
      // Step circle
      const stepWrapper = document.createElement('div');
      stepWrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      `;

      const circle = document.createElement('div');
      circle.className = 'atlas-step-circle';
      circle.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
        transition: all ${ANIMATION_DURATION.normal}ms ${EASING.spring};
        ${getStepStyles(index)}
      `;
      circle.textContent = index < currentStep ? '✓' : String(index + 1);

      const labelEl = document.createElement('span');
      labelEl.style.cssText = `
        font-size: 12px;
        color: ${index <= currentStep ? 'currentColor' : 'var(--atlas-gray-400, #9ca3af)'};
        transition: color ${ANIMATION_DURATION.fast}ms ${EASING.standard};
      `;
      labelEl.textContent = label;

      stepWrapper.appendChild(circle);
      stepWrapper.appendChild(labelEl);
      element.appendChild(stepWrapper);

      // Add connector (except for last step)
      if (index < steps.length - 1) {
        const connector = document.createElement('div');
        connector.className = 'atlas-step-connector';
        connector.style.cssText = `
          flex: 1;
          height: 2px;
          margin: 0 8px;
          margin-bottom: 24px;
          background: ${index < currentStep ? 'var(--atlas-primary, #3b82f6)' : 'var(--atlas-gray-200, #e5e7eb)'};
          border-style: ${connectorStyle};
          transition: background ${ANIMATION_DURATION.normal}ms ${EASING.standard};
        `;
        element.appendChild(connector);
      }
    });
  };

  const getStepStyles = (index: number): string => {
    if (index < currentStep) {
      // Completed
      return `
        background: var(--atlas-primary, #3b82f6);
        color: white;
        border: 2px solid var(--atlas-primary, #3b82f6);
      `;
    } else if (index === currentStep) {
      // Current
      return `
        background: white;
        color: var(--atlas-primary, #3b82f6);
        border: 2px solid var(--atlas-primary, #3b82f6);
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
      `;
    } else {
      // Future
      return `
        background: var(--atlas-gray-100, #f3f4f6);
        color: var(--atlas-gray-400, #9ca3af);
        border: 2px solid var(--atlas-gray-200, #e5e7eb);
      `;
    }
  };

  const updateUI = () => {
    createUI();
    onStepChange?.(currentStep);
  };

  // Initialize
  createUI();

  const next = () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      updateUI();
    }
  };

  const previous = () => {
    if (currentStep > 0) {
      currentStep--;
      updateUI();
    }
  };

  const setStep = (step: number) => {
    const clampedStep = Math.max(0, Math.min(steps.length - 1, step));
    if (clampedStep !== currentStep) {
      currentStep = clampedStep;
      updateUI();
    }
  };

  const destroy = () => {
    element.innerHTML = originalContent;
    element.style.cssText = '';
  };

  return {
    get currentStep() {
      return currentStep;
    },
    next,
    previous,
    setStep,
    destroy,
  };
}
