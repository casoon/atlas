export interface DropdownOptions {
  placement?: 'bottom' | 'top' | 'left' | 'right';
  closeOnSelect?: boolean;
  closeOnClickOutside?: boolean;
}

export interface DropdownState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function createDropdown(trigger: Element, options: DropdownOptions = {}): DropdownState {
  const { placement = 'bottom', closeOnSelect = true, closeOnClickOutside = true } = options;
  let isOpen = false;

  const handleClickOutside = (e: MouseEvent) => {
    if (!trigger.contains(e.target as Node)) close();
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    if (closeOnClickOutside) document.addEventListener('click', handleClickOutside);
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    document.removeEventListener('click', handleClickOutside);
  };

  const toggle = () => isOpen ? close() : open();

  return { get isOpen() { return isOpen; }, open, close, toggle };
}