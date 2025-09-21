export interface ModalOptions {
  backdrop?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface ModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function createModal(options: ModalOptions = {}): ModalState {
  const {
    backdrop = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    trapFocus = true,
    autoFocus = true,
    onOpen,
    onClose
  } = options;

  let isOpen = false;
  let backdropElement: HTMLElement | null = null;
  let focusableElements: Element[] = [];
  let previouslyFocusedElement: Element | null = null;

  const getFocusableElements = (container: Element): Element[] => {
    return Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;

    if (closeOnEscape && e.key === 'Escape') {
      close();
      return;
    }

    if (trapFocus && e.key === 'Tab') {
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (closeOnBackdrop && e.target === backdropElement) {
      close();
    }
  };

  const open = () => {
    if (isOpen) return;
    
    isOpen = true;
    previouslyFocusedElement = document.activeElement;
    
    if (backdrop) {
      backdropElement = document.createElement('div');
      backdropElement.style.cssText = `
        position: fixed; inset: 0; z-index: 50;
        background: rgba(0, 0, 0, 0.5); display: flex;
        align-items: center; justify-content: center;
      `;
      
      if (closeOnBackdrop) {
        backdropElement.addEventListener('click', handleBackdropClick);
      }
      
      document.body.appendChild(backdropElement);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    // Update focusable elements after DOM updates
    setTimeout(() => {
      const modalContainer = backdropElement || document.body;
      focusableElements = getFocusableElements(modalContainer);
      
      if (autoFocus && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }, 10);

    onOpen?.();
  };

  const close = () => {
    if (!isOpen) return;
    
    isOpen = false;
    
    if (backdropElement) {
      backdropElement.removeEventListener('click', handleBackdropClick);
      backdropElement.remove();
      backdropElement = null;
    }
    
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = '';
    
    if (previouslyFocusedElement) {
      (previouslyFocusedElement as HTMLElement).focus();
      previouslyFocusedElement = null;
    }

    onClose?.();
  };

  const toggle = () => {
    isOpen ? close() : open();
  };

  return {
    get isOpen() { return isOpen; },
    open,
    close,
    toggle
  };
}