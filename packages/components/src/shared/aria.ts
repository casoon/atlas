/**
 * Accessibility utilities for Atlas components
 * Implements WAI-ARIA best practices
 */

let idCounter = 0;

/** Generate a unique ID for ARIA relationships */
export const generateId = (prefix: string): string => {
  return `atlas-${prefix}-${++idCounter}`;
};

/** Reset ID counter (for testing) */
export const resetIdCounter = (): void => {
  idCounter = 0;
};

/** ARIA attributes for modal dialogs */
export const getModalAriaAttributes = (options: {
  labelledBy?: string;
  describedBy?: string;
}): Record<string, string> => ({
  role: 'dialog',
  'aria-modal': 'true',
  ...(options.labelledBy && { 'aria-labelledby': options.labelledBy }),
  ...(options.describedBy && { 'aria-describedby': options.describedBy }),
});

/** ARIA attributes for drawer/sheet */
export const getDrawerAriaAttributes = (options: {
  labelledBy?: string;
  side: 'left' | 'right' | 'top' | 'bottom';
}): Record<string, string> => ({
  role: 'dialog',
  'aria-modal': 'true',
  ...(options.labelledBy && { 'aria-labelledby': options.labelledBy }),
});

/** ARIA attributes for dropdown trigger */
export const getDropdownTriggerAttributes = (options: {
  isOpen: boolean;
  menuId: string;
}): Record<string, string> => ({
  'aria-haspopup': 'true',
  'aria-expanded': String(options.isOpen),
  'aria-controls': options.menuId,
});

/** ARIA attributes for dropdown menu */
export const getDropdownMenuAttributes = (options: {
  id: string;
  labelledBy: string;
}): Record<string, string> => ({
  role: 'menu',
  id: options.id,
  'aria-labelledby': options.labelledBy,
});

/** ARIA attributes for menu items */
export const getMenuItemAttributes = (options: { disabled?: boolean }): Record<string, string> => ({
  role: 'menuitem',
  tabindex: options.disabled ? '-1' : '0',
  ...(options.disabled && { 'aria-disabled': 'true' }),
});

/** Announce message to screen readers */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  if (typeof document === 'undefined') return;

  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', priority);
  region.setAttribute('aria-atomic', 'true');
  region.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(region);

  // Delay to ensure screen reader picks up the change
  setTimeout(() => {
    region.textContent = message;
  }, 100);

  // Clean up after announcement
  setTimeout(() => {
    region.remove();
  }, 1000);
};
