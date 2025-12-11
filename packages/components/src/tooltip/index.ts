export interface TooltipOptions {
  delay?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'focus' | 'click';
  content?: string;
  onShow?: () => void;
  onHide?: () => void;
}

export interface TooltipState {
  readonly isVisible: boolean;
  readonly placement: 'top' | 'bottom' | 'left' | 'right';
  show: () => void;
  hide: () => void;
  toggle: () => void;
  destroy: () => void;
}

export function createTooltip(trigger: Element, options: TooltipOptions = {}): TooltipState {
  const {
    delay = 500,
    placement = 'top',
    trigger: triggerType = 'hover',
    onShow,
    onHide,
  } = options;

  let isVisible = false;
  let timeoutId: number;

  const show = () => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      isVisible = true;
      trigger.setAttribute('data-tooltip-visible', 'true');
      trigger.setAttribute('data-tooltip-placement', placement);
      onShow?.();
    }, delay);
  };

  const hide = () => {
    clearTimeout(timeoutId);
    isVisible = false;
    trigger.removeAttribute('data-tooltip-visible');
    onHide?.();
  };

  const toggle = () => (isVisible ? hide() : show());

  const handleMouseEnter = () => show();
  const handleMouseLeave = () => hide();
  const handleFocus = () => show();
  const handleBlur = () => hide();
  const handleClick = () => toggle();

  if (triggerType === 'hover') {
    trigger.addEventListener('mouseenter', handleMouseEnter);
    trigger.addEventListener('mouseleave', handleMouseLeave);
  } else if (triggerType === 'focus') {
    trigger.addEventListener('focus', handleFocus);
    trigger.addEventListener('blur', handleBlur);
  } else if (triggerType === 'click') {
    trigger.addEventListener('click', handleClick);
  }

  const destroy = () => {
    clearTimeout(timeoutId);
    trigger.removeEventListener('mouseenter', handleMouseEnter);
    trigger.removeEventListener('mouseleave', handleMouseLeave);
    trigger.removeEventListener('focus', handleFocus);
    trigger.removeEventListener('blur', handleBlur);
    trigger.removeEventListener('click', handleClick);
    trigger.removeAttribute('data-tooltip-visible');
    trigger.removeAttribute('data-tooltip-placement');
  };

  return {
    get isVisible() {
      return isVisible;
    },
    get placement() {
      return placement;
    },
    show,
    hide,
    toggle,
    destroy,
  };
}
