export interface DrawerOptions {
  side?: 'left' | 'right' | 'top' | 'bottom';
  backdrop?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export function createDrawer(options: DrawerOptions = {}) {
  const { side = 'right', backdrop = true, closeOnBackdrop = true, closeOnEscape = true } = options;
  let isOpen = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') close();
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    document.body.style.overflow = 'hidden';
    if (closeOnEscape) document.addEventListener('keydown', handleKeyDown);
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
  };

  return { get isOpen() { return isOpen; }, open, close, toggle: () => isOpen ? close() : open() };
}