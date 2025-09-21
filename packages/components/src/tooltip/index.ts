export interface TooltipOptions {
  delay?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'focus' | 'click';
}

export interface TooltipState {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

export function createTooltip(trigger: Element, options: TooltipOptions = {}): TooltipState {
  const { delay = 500, placement = 'top', trigger: triggerType = 'hover' } = options;
  let isVisible = false;
  let timeoutId: number;

  const show = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => { isVisible = true; }, delay);
  };

  const hide = () => {
    clearTimeout(timeoutId);
    isVisible = false;
  };

  const toggle = () => isVisible ? hide() : show();

  if (triggerType === 'hover') {
    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', hide);
  } else if (triggerType === 'focus') {
    trigger.addEventListener('focus', show);
    trigger.addEventListener('blur', hide);
  } else if (triggerType === 'click') {
    trigger.addEventListener('click', toggle);
  }

  return { get isVisible() { return isVisible; }, show, hide, toggle };
}