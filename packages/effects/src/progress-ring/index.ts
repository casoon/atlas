import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';

export interface ProgressRingOptions {
  progress?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  labelFormatter?: (progress: number) => string;
  duration?: number;
  lineCap?: 'round' | 'square' | 'butt';
}

/**
 * Creates a circular progress ring indicator.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the progress ring
 * @returns An object with update and cleanup methods
 *
 * @example
 * ```typescript
 * const ring = progressRing('#container', {
 *   progress: 0,
 *   size: 120,
 *   strokeWidth: 8,
 *   color: '#3b82f6',
 *   showLabel: true,
 *   duration: 500
 * });
 *
 * // Update progress
 * ring.update(75);
 *
 * // Cleanup
 * ring.cleanup();
 * ```
 */
export function progressRing(
  target: Element | string,
  options: ProgressRingOptions = {}
): { update: (progress: number) => void; cleanup: () => void } {
  const element = resolveElement(target as string | HTMLElement);

  const noop = {
    update: () => {},
    cleanup: () => {},
  };

  if (!element) {
    console.warn('[Atlas ProgressRing] Element not found:', target);
    return noop;
  }

  const {
    progress: initialProgress = 0,
    size = 120,
    strokeWidth = 8,
    color = '#3b82f6',
    backgroundColor = '#e5e7eb',
    showLabel = true,
    labelFormatter = (p: number) => `${Math.round(p)}%`,
    duration = 500,
    lineCap = 'round',
  } = options;

  const reduceMotion = shouldReduceMotion();
  const effectiveDuration = reduceMotion ? 0 : duration;

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'atlas-progress-ring');
  svg.setAttribute('width', size.toString());
  svg.setAttribute('height', size.toString());
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', center.toString());
  bgCircle.setAttribute('cy', center.toString());
  bgCircle.setAttribute('r', radius.toString());
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', backgroundColor);
  bgCircle.setAttribute('stroke-width', strokeWidth.toString());

  // Progress circle
  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.setAttribute('cx', center.toString());
  progressCircle.setAttribute('cy', center.toString());
  progressCircle.setAttribute('r', radius.toString());
  progressCircle.setAttribute('fill', 'none');
  progressCircle.setAttribute('stroke', color);
  progressCircle.setAttribute('stroke-width', strokeWidth.toString());
  progressCircle.setAttribute('stroke-linecap', lineCap);
  progressCircle.setAttribute('stroke-dasharray', circumference.toString());
  progressCircle.setAttribute('stroke-dashoffset', circumference.toString());
  progressCircle.setAttribute('transform', `rotate(-90 ${center} ${center})`);
  progressCircle.style.transition = `stroke-dashoffset ${effectiveDuration}ms ease-out`;

  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);

  // Create container
  const container = document.createElement('div');
  container.className = 'atlas-progress-ring-container';
  container.style.cssText = `
    display: inline-flex;
    position: relative;
    align-items: center;
    justify-content: center;
  `;
  container.appendChild(svg);

  // Create label
  let label: HTMLSpanElement | null = null;
  if (showLabel) {
    label = document.createElement('span');
    label.className = 'atlas-progress-ring-label';
    label.style.cssText = `
      position: absolute;
      font-size: ${size / 5}px;
      font-weight: 600;
      color: ${color};
    `;
    label.textContent = labelFormatter(initialProgress);
    container.appendChild(label);
  }

  // Store original content
  const originalContent = element.innerHTML;

  // Add to element
  element.innerHTML = '';
  element.appendChild(container);

  // Update progress function
  const updateProgress = (newProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    const offset = circumference - (clampedProgress / 100) * circumference;

    progressCircle.setAttribute('stroke-dashoffset', offset.toString());

    if (label) {
      label.textContent = labelFormatter(clampedProgress);
    }
  };

  // Set initial progress
  // Use setTimeout to allow transition on first render
  setTimeout(() => {
    updateProgress(initialProgress);
  }, 10);

  return {
    update: updateProgress,
    cleanup: () => {
      element.innerHTML = originalContent;
    },
  };
}
