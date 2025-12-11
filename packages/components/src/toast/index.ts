/**
 * Toast Component
 *
 * Non-blocking notification system with premium micro-interactions:
 * - Smooth slide + fade entrance
 * - Auto-dismiss with progress indicator
 * - Success checkmark animation
 * - Stackable notifications
 * - Swipe to dismiss (touch)
 * - Pause on hover
 *
 * "Satisfying success moments that don't treat users like children"
 *
 * @example
 * ```typescript
 * const toastManager = createToastManager({
 *   position: 'bottom-right',
 *   maxVisible: 3,
 * });
 *
 * // Show different types
 * toastManager.success('Changes saved');
 * toastManager.error('Something went wrong');
 * toastManager.info('New update available');
 *
 * // Show with options
 * toastManager.show('Custom message', {
 *   duration: 5000,
 *   action: { label: 'Undo', onClick: () => {} },
 * });
 * ```
 */

import { announce } from '../shared/aria';
import { addListener, createElement, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING, Z_INDEX } from '../shared/types';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
}

export interface ToastOptions {
  /** Toast type for styling (default: 'default') */
  type?: ToastType;
  /** Auto-dismiss duration in ms (default: 4000, 0 for persistent) */
  duration?: number;
  /** Show dismiss button (default: true) */
  dismissible?: boolean;
  /** Optional action button */
  action?: ToastAction;
  /** Pause timer on hover (default: true) */
  pauseOnHover?: boolean;
  /** Show progress bar (default: true for auto-dismiss) */
  showProgress?: boolean;
  /** Called when toast is dismissed */
  onDismiss?: () => void;
}

export interface ToastItem {
  /** Unique toast ID */
  id: string;
  /** Toast message */
  message: string;
  /** Toast type */
  type: ToastType;
  /** Dismiss this toast */
  dismiss: () => void;
}

export interface ToastManagerOptions {
  /** Position on screen (default: 'bottom-right') */
  position?: ToastPosition;
  /** Maximum visible toasts (default: 5) */
  maxVisible?: number;
  /** Gap between toasts in pixels (default: 12) */
  gap?: number;
  /** Container element (default: document.body) */
  container?: HTMLElement;
}

export interface ToastManager {
  /** Show a toast with message and options */
  show: (message: string, options?: ToastOptions) => ToastItem;
  /** Show success toast */
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => ToastItem;
  /** Show error toast */
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => ToastItem;
  /** Show warning toast */
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => ToastItem;
  /** Show info toast */
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => ToastItem;
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Get all active toasts */
  getToasts: () => ToastItem[];
  /** Destroy the toast manager */
  destroy: () => void;
}

// Position styles
const POSITION_STYLES: Record<ToastPosition, Partial<CSSStyleDeclaration>> = {
  'top-left': { top: '16px', left: '16px', alignItems: 'flex-start' },
  'top-center': {
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    alignItems: 'center',
  },
  'top-right': { top: '16px', right: '16px', alignItems: 'flex-end' },
  'bottom-left': { bottom: '16px', left: '16px', alignItems: 'flex-start' },
  'bottom-center': {
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    alignItems: 'center',
  },
  'bottom-right': { bottom: '16px', right: '16px', alignItems: 'flex-end' },
};

// Icons for different types
const ICONS: Record<ToastType, string> = {
  success: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
    <path class="atlas-toast-checkmark" d="M6 10l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
    <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2L18 17H2L10 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/>
    <path d="M10 8v4M10 14v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
    <path d="M10 9v5M10 6v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  default: '',
};

// Colors for types
const TYPE_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  default: { bg: '#f9fafb', border: '#6b7280', text: '#1f2937' },
};

let toastCounter = 0;

export function createToastManager(managerOptions: ToastManagerOptions = {}): ToastManager {
  // SSR guard
  if (!isBrowser()) {
    return createNoopToastManager();
  }

  const {
    position = 'bottom-right',
    maxVisible = 5,
    gap = 12,
    container = document.body,
  } = managerOptions;

  const toasts = new Map<string, { element: HTMLElement; cleanup: () => void }>();
  let containerElement: HTMLElement | null = null;

  // Create container
  const createContainer = () => {
    if (containerElement) return containerElement;

    containerElement = createElement('div', {
      className: 'atlas-toast-container',
      attributes: {
        'data-atlas-toast-container': '',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      },
      styles: {
        position: 'fixed',
        zIndex: String(Z_INDEX.toast),
        display: 'flex',
        flexDirection: position.startsWith('top') ? 'column' : 'column-reverse',
        gap: `${gap}px`,
        pointerEvents: 'none',
        ...POSITION_STYLES[position],
      },
    });

    if (containerElement) {
      container.appendChild(containerElement);
    }

    return containerElement;
  };

  const show = (message: string, options: ToastOptions = {}): ToastItem => {
    const {
      type = 'default',
      duration = 4000,
      dismissible = true,
      action,
      pauseOnHover = true,
      showProgress = duration > 0,
      onDismiss,
    } = options;

    const id = `toast-${++toastCounter}`;
    const colors = TYPE_COLORS[type];
    const icon = ICONS[type];

    // Ensure container exists
    const toastContainer = createContainer();
    if (!toastContainer) {
      return { id, message, type, dismiss: () => {} };
    }

    // Remove excess toasts
    while (toasts.size >= maxVisible) {
      const firstId = toasts.keys().next().value;
      if (firstId) dismiss(firstId);
    }

    // Create toast element
    const toast = createElement('div', {
      className: `atlas-toast atlas-toast-${type}`,
      attributes: {
        'data-atlas-toast': id,
        role: 'alert',
      },
      styles: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        pointerEvents: 'auto',
        opacity: '0',
        transform: position.startsWith('top') ? 'translateY(-100%)' : 'translateY(100%)',
        transition: `opacity ${ANIMATION_DURATION.normal}ms ${EASING.decelerate}, transform ${ANIMATION_DURATION.normal}ms ${EASING.spring}`,
        maxWidth: '400px',
        position: 'relative',
        overflow: 'hidden',
      },
    });

    if (!toast) {
      return { id, message, type, dismiss: () => {} };
    }

    // Build toast content
    let html = '';

    // Icon
    if (icon) {
      html += `<span class="atlas-toast-icon" style="flex-shrink: 0; color: ${colors.border};">${icon}</span>`;
    }

    // Message
    html += `<span class="atlas-toast-message" style="flex: 1;">${message}</span>`;

    // Action button
    if (action) {
      html += `<button class="atlas-toast-action" style="
        background: transparent;
        border: none;
        color: ${colors.border};
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
        margin: -4px;
        border-radius: 4px;
        transition: background ${ANIMATION_DURATION.fast}ms;
      " data-action>${action.label}</button>`;
    }

    // Dismiss button
    if (dismissible) {
      html += `<button class="atlas-toast-dismiss" aria-label="Dismiss" style="
        background: transparent;
        border: none;
        color: currentColor;
        opacity: 0.5;
        cursor: pointer;
        padding: 4px;
        margin: -4px;
        display: flex;
        transition: opacity ${ANIMATION_DURATION.fast}ms;
      " data-dismiss>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>`;
    }

    // Progress bar
    if (showProgress && duration > 0) {
      html += `<div class="atlas-toast-progress" style="
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: ${colors.border};
        opacity: 0.3;
        width: 100%;
        transform-origin: left;
        animation: atlas-toast-progress ${duration}ms linear forwards;
      "></div>`;
    }

    toast.innerHTML = html;

    // Event handlers
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let remainingTime = duration;
    let startTime = Date.now();
    const cleanupListeners: (() => void)[] = [];

    const startTimer = () => {
      if (duration <= 0) return;
      startTime = Date.now();
      timeoutId = setTimeout(() => dismiss(id), remainingTime);
    };

    const pauseTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        remainingTime -= Date.now() - startTime;
      }
      // Pause progress animation
      const progress = toast.querySelector('.atlas-toast-progress') as HTMLElement;
      if (progress) {
        progress.style.animationPlayState = 'paused';
      }
    };

    const resumeTimer = () => {
      if (duration > 0 && remainingTime > 0) {
        startTimer();
        // Resume progress animation
        const progress = toast.querySelector('.atlas-toast-progress') as HTMLElement;
        if (progress) {
          progress.style.animationPlayState = 'running';
        }
      }
    };

    // Pause on hover
    if (pauseOnHover) {
      cleanupListeners.push(
        addListener(
          toast,
          'mouseenter',
          pauseTimer as (ev: DocumentEventMap['mouseenter']) => void
        ),
        addListener(
          toast,
          'mouseleave',
          resumeTimer as (ev: DocumentEventMap['mouseleave']) => void
        )
      );
    }

    // Dismiss button
    const dismissBtn = toast.querySelector('[data-dismiss]');
    if (dismissBtn) {
      cleanupListeners.push(
        addListener(
          dismissBtn,
          'click',
          () => dismiss(id) as unknown as (ev: DocumentEventMap['click']) => void
        )
      );
    }

    // Action button
    const actionBtn = toast.querySelector('[data-action]');
    if (actionBtn && action) {
      cleanupListeners.push(
        addListener(actionBtn, 'click', (() => {
          action.onClick();
          dismiss(id);
        }) as (ev: DocumentEventMap['click']) => void)
      );
    }

    // Store cleanup
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      cleanupListeners.forEach((fn) => fn());
      onDismiss?.();
    };

    toasts.set(id, { element: toast, cleanup });

    // Add to container
    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Start auto-dismiss timer
    startTimer();

    // Announce to screen readers
    announce(message, type === 'error' ? 'assertive' : 'polite');

    return {
      id,
      message,
      type,
      dismiss: () => dismiss(id),
    };
  };

  const dismiss = (id: string) => {
    const toast = toasts.get(id);
    if (!toast) return;

    const { element, cleanup } = toast;
    cleanup();

    // Animate out
    element.style.opacity = '0';
    element.style.transform = position.startsWith('top') ? 'translateY(-100%)' : 'translateY(100%)';

    setTimeout(() => {
      element.remove();
      toasts.delete(id);

      // Remove container if empty
      if (toasts.size === 0 && containerElement) {
        containerElement.remove();
        containerElement = null;
      }
    }, ANIMATION_DURATION.normal);
  };

  const dismissAll = () => {
    for (const id of toasts.keys()) {
      dismiss(id);
    }
  };

  const getToasts = (): ToastItem[] => {
    return Array.from(toasts.keys()).map((id) => ({
      id,
      message: '', // Could store this if needed
      type: 'default' as ToastType,
      dismiss: () => dismiss(id),
    }));
  };

  const destroy = () => {
    dismissAll();
    if (containerElement) {
      containerElement.remove();
      containerElement = null;
    }
  };

  // Convenience methods
  const success = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    show(message, { ...options, type: 'success' });

  const error = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    show(message, { ...options, type: 'error' });

  const warning = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    show(message, { ...options, type: 'warning' });

  const info = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    show(message, { ...options, type: 'info' });

  return {
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
    getToasts,
    destroy,
  };
}

/** No-op toast manager for SSR */
function createNoopToastManager(): ToastManager {
  const noopItem: ToastItem = {
    id: '',
    message: '',
    type: 'default',
    dismiss: () => {},
  };
  return {
    show: () => noopItem,
    success: () => noopItem,
    error: () => noopItem,
    warning: () => noopItem,
    info: () => noopItem,
    dismiss: () => {},
    dismissAll: () => {},
    getToasts: () => [],
    destroy: () => {},
  };
}
