/**
 * Badge Component
 *
 * A small status indicator with optional animations.
 * Badges are typically used for:
 * - Status indicators (online/offline)
 * - Notification counts
 * - Labels and tags
 *
 * @example
 * ```typescript
 * const badge = createBadge(element, {
 *   variant: 'success',
 *   pulse: true,
 * });
 *
 * // Update badge content
 * badge.setContent('5');
 *
 * // Change variant
 * badge.setVariant('destructive');
 * ```
 */

import { isBrowser } from '../shared/dom';

/** Badge variant for styling */
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'outline';

/** Badge size */
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeOptions {
  /** Visual variant (default: 'default') */
  variant?: BadgeVariant;
  /** Size (default: 'md') */
  size?: BadgeSize;
  /** Enable pulse animation (default: false) */
  pulse?: boolean;
  /** Make badge a dot without content (default: false) */
  dot?: boolean;
  /** Initial content */
  content?: string | number;
  /** Maximum number to display (shows "99+" if exceeded) */
  max?: number;
}

export interface BadgeState {
  /** Current variant */
  readonly variant: BadgeVariant;
  /** Current content */
  readonly content: string;
  /** Whether pulse is active */
  readonly isPulsing: boolean;
  /** Set badge content */
  setContent: (content: string | number) => void;
  /** Set variant */
  setVariant: (variant: BadgeVariant) => void;
  /** Enable/disable pulse */
  setPulse: (pulse: boolean) => void;
  /** Show/hide badge */
  setVisible: (visible: boolean) => void;
  /** Clean up */
  destroy: () => void;
}

/** CSS class map for variants */
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'atlas-badge-default',
  primary: 'atlas-badge-primary',
  secondary: 'atlas-badge-secondary',
  destructive: 'atlas-badge-destructive',
  success: 'atlas-badge-success',
  warning: 'atlas-badge-warning',
  outline: 'atlas-badge-outline',
};

/** CSS class map for sizes */
const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'atlas-badge-sm',
  md: 'atlas-badge-md',
  lg: 'atlas-badge-lg',
};

export function createBadge(element: HTMLElement, options: BadgeOptions = {}): BadgeState {
  // SSR guard
  if (!isBrowser()) {
    return createNoopBadgeState();
  }

  const {
    variant: initialVariant = 'default',
    size = 'md',
    pulse: initialPulse = false,
    dot = false,
    content: initialContent = '',
    max,
  } = options;

  let currentVariant = initialVariant;
  let currentContent = formatContent(initialContent, max);
  let isPulsing = initialPulse;
  let pulseAnimation: Animation | null = null;

  // Apply base class
  element.classList.add('atlas-badge');
  element.classList.add(VARIANT_CLASSES[currentVariant]);
  element.classList.add(SIZE_CLASSES[size]);

  if (dot) {
    element.classList.add('atlas-badge-dot');
    element.setAttribute('aria-hidden', 'true');
  }

  // Set initial content
  if (!dot && currentContent) {
    element.textContent = currentContent;
  }

  // Apply pulse if enabled
  if (isPulsing) {
    startPulse();
  }

  function formatContent(content: string | number, maxValue?: number): string {
    if (typeof content === 'number' && maxValue !== undefined && content > maxValue) {
      return `${maxValue}+`;
    }
    return String(content);
  }

  function startPulse(): void {
    if (pulseAnimation || !element.animate) return;

    pulseAnimation = element.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0.7, transform: 'scale(1.1)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        easing: 'ease-in-out',
      }
    );
  }

  function stopPulse(): void {
    if (pulseAnimation) {
      pulseAnimation.cancel();
      pulseAnimation = null;
    }
  }

  const setContent = (content: string | number): void => {
    currentContent = formatContent(content, max);
    if (!dot) {
      element.textContent = currentContent;
    }
  };

  const setVariant = (variant: BadgeVariant): void => {
    element.classList.remove(VARIANT_CLASSES[currentVariant]);
    currentVariant = variant;
    element.classList.add(VARIANT_CLASSES[currentVariant]);
  };

  const setPulse = (pulse: boolean): void => {
    isPulsing = pulse;
    if (pulse) {
      startPulse();
    } else {
      stopPulse();
    }
  };

  const setVisible = (visible: boolean): void => {
    element.style.display = visible ? '' : 'none';
    element.setAttribute('aria-hidden', String(!visible));
  };

  const destroy = (): void => {
    stopPulse();
    element.classList.remove('atlas-badge');
    element.classList.remove(VARIANT_CLASSES[currentVariant]);
    element.classList.remove(SIZE_CLASSES[size]);
    if (dot) {
      element.classList.remove('atlas-badge-dot');
    }
  };

  return {
    get variant() {
      return currentVariant;
    },
    get content() {
      return currentContent;
    },
    get isPulsing() {
      return isPulsing;
    },
    setContent,
    setVariant,
    setPulse,
    setVisible,
    destroy,
  };
}

function createNoopBadgeState(): BadgeState {
  return {
    get variant(): BadgeVariant {
      return 'default';
    },
    get content() {
      return '';
    },
    get isPulsing() {
      return false;
    },
    setContent: () => {},
    setVariant: () => {},
    setPulse: () => {},
    setVisible: () => {},
    destroy: () => {},
  };
}
