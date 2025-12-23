/**
 * @fileoverview Alert component - status messages and notifications
 * @module @atlas/components/alert
 */

import { generateId } from '../shared/aria.js';
import { isBrowser } from '../shared/dom.js';

// ============================================================================
// Types
// ============================================================================

export type AlertVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

export interface AlertOptions {
  /** Alert variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Alert description */
  description?: string;
  /** Custom icon HTML */
  icon?: string;
  /** Whether alert is dismissible */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

export interface Alert {
  /** Root element */
  readonly element: HTMLElement;
  /** Set variant */
  setVariant: (variant: AlertVariant) => void;
  /** Get current variant */
  getVariant: () => AlertVariant;
  /** Set title */
  setTitle: (title: string) => void;
  /** Set description */
  setDescription: (description: string) => void;
  /** Dismiss alert */
  dismiss: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const CLASSES = {
  ROOT: 'atlas-alert',
  ICON: 'atlas-alert-icon',
  CONTENT: 'atlas-alert-content',
  TITLE: 'atlas-alert-title',
  DESCRIPTION: 'atlas-alert-description',
  DISMISS: 'atlas-alert-dismiss',
  VARIANT_DEFAULT: 'atlas-alert--default',
  VARIANT_DESTRUCTIVE: 'atlas-alert--destructive',
  VARIANT_SUCCESS: 'atlas-alert--success',
  VARIANT_WARNING: 'atlas-alert--warning',
  VARIANT_INFO: 'atlas-alert--info',
} as const;

const ATTRS = {
  ROOT: 'data-atlas-alert',
  ICON: 'data-atlas-alert-icon',
  TITLE: 'data-atlas-alert-title',
  DESCRIPTION: 'data-atlas-alert-description',
  DISMISS: 'data-atlas-alert-dismiss',
} as const;

const DEFAULT_ICONS: Record<AlertVariant, string> = {
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  destructive: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates an Alert instance
 */
export function createAlert(element: HTMLElement, options: AlertOptions = {}): Alert {
  if (!isBrowser()) {
    return createServerAlert(element);
  }

  const {
    variant: initialVariant = 'default',
    title: initialTitle = '',
    description: initialDescription = '',
    icon: customIcon,
    dismissible = false,
    onDismiss,
  } = options;

  // State
  let currentVariant = initialVariant;

  // Elements
  const id = generateId('alert');
  let iconEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;
  let titleEl: HTMLElement | null = null;
  let descriptionEl: HTMLElement | null = null;
  let dismissEl: HTMLButtonElement | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute(ATTRS.ROOT, '');
    element.setAttribute('role', 'alert');
    element.id = id;

    applyVariantClass();

    // Create icon
    iconEl = document.createElement('div');
    iconEl.className = CLASSES.ICON;
    iconEl.setAttribute(ATTRS.ICON, '');
    iconEl.innerHTML = customIcon ?? DEFAULT_ICONS[currentVariant];
    element.appendChild(iconEl);

    // Create content container
    contentEl = document.createElement('div');
    contentEl.className = CLASSES.CONTENT;

    // Create title
    if (initialTitle) {
      titleEl = document.createElement('div');
      titleEl.className = CLASSES.TITLE;
      titleEl.setAttribute(ATTRS.TITLE, '');
      titleEl.textContent = initialTitle;
      contentEl.appendChild(titleEl);
    }

    // Create description
    if (initialDescription) {
      descriptionEl = document.createElement('div');
      descriptionEl.className = CLASSES.DESCRIPTION;
      descriptionEl.setAttribute(ATTRS.DESCRIPTION, '');
      descriptionEl.textContent = initialDescription;
      contentEl.appendChild(descriptionEl);
    }

    element.appendChild(contentEl);

    // Create dismiss button
    if (dismissible) {
      dismissEl = document.createElement('button');
      dismissEl.className = CLASSES.DISMISS;
      dismissEl.setAttribute(ATTRS.DISMISS, '');
      dismissEl.setAttribute('type', 'button');
      dismissEl.setAttribute('aria-label', 'Dismiss');
      dismissEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
      dismissEl.addEventListener('click', dismiss);
      element.appendChild(dismissEl);
    }
  }

  function applyVariantClass(): void {
    // Remove all variant classes
    element.classList.remove(
      CLASSES.VARIANT_DEFAULT,
      CLASSES.VARIANT_DESTRUCTIVE,
      CLASSES.VARIANT_SUCCESS,
      CLASSES.VARIANT_WARNING,
      CLASSES.VARIANT_INFO
    );

    // Add current variant class
    const variantClass = CLASSES[`VARIANT_${currentVariant.toUpperCase()}` as keyof typeof CLASSES];
    if (variantClass) {
      element.classList.add(variantClass);
    }

    element.setAttribute('data-variant', currentVariant);
  }

  function setVariant(variant: AlertVariant): void {
    currentVariant = variant;
    applyVariantClass();

    // Update icon if using default icons
    if (iconEl && !customIcon) {
      iconEl.innerHTML = DEFAULT_ICONS[variant];
    }
  }

  function getVariant(): AlertVariant {
    return currentVariant;
  }

  function setTitle(title: string): void {
    if (!contentEl) return;

    if (!titleEl) {
      titleEl = document.createElement('div');
      titleEl.className = CLASSES.TITLE;
      titleEl.setAttribute(ATTRS.TITLE, '');
      contentEl.insertBefore(titleEl, contentEl.firstChild);
    }

    titleEl.textContent = title;
  }

  function setDescription(description: string): void {
    if (!contentEl) return;

    if (!descriptionEl) {
      descriptionEl = document.createElement('div');
      descriptionEl.className = CLASSES.DESCRIPTION;
      descriptionEl.setAttribute(ATTRS.DESCRIPTION, '');
      contentEl.appendChild(descriptionEl);
    }

    descriptionEl.textContent = description;
  }

  function dismiss(): void {
    element.style.opacity = '0';
    element.style.transform = 'translateX(100%)';

    setTimeout(() => {
      element.remove();
      onDismiss?.();
    }, 200);
  }

  function destroy(): void {
    dismissEl?.removeEventListener('click', dismiss);
    element.classList.remove(CLASSES.ROOT);
    element.removeAttribute(ATTRS.ROOT);
    element.removeAttribute('role');
    element.innerHTML = '';
  }

  // Initialize
  init();

  return {
    element,
    setVariant,
    getVariant,
    setTitle,
    setDescription,
    dismiss,
    destroy,
  };
}

// ============================================================================
// Server-side stub
// ============================================================================

function createServerAlert(element: HTMLElement): Alert {
  return {
    element,
    setVariant: () => {},
    getVariant: () => 'default',
    setTitle: () => {},
    setDescription: () => {},
    dismiss: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initAlerts(root: Document | HTMLElement = document): Alert[] {
  if (!isBrowser()) return [];

  const elements = root.querySelectorAll<HTMLElement>(
    `[${ATTRS.ROOT}]:not([data-atlas-alert-initialized])`
  );
  const alerts: Alert[] = [];

  elements.forEach((element) => {
    const options: AlertOptions = {
      variant: (element.getAttribute('data-variant') as AlertVariant) ?? 'default',
      dismissible: element.hasAttribute('data-dismissible'),
    };

    const alert = createAlert(element, options);
    element.setAttribute('data-atlas-alert-initialized', '');
    alerts.push(alert);
  });

  return alerts;
}
