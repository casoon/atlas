export interface RippleOptions {
  strength?: number;
  duration?: number;
  color?: string;
}

export function ripple(target: Element | string, options: RippleOptions = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return () => {};

  const { strength = 0.5, duration = 600, color = 'rgba(255, 255, 255, 0.3)' } = options;

  const onPointerDown = (e: Event) => {
    const pointerEvent = e as PointerEvent;
    const rect = el.getBoundingClientRect();
    const x = pointerEvent.clientX - rect.left;
    const y = pointerEvent.clientY - rect.top;

    // Create ripple element
    const ripple = document.createElement('div');
    const size = Math.max(rect.width, rect.height) * 2 * strength;

    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      transform: translate(-50%, -50%) scale(0);
      transition: transform ${duration}ms ease-out, opacity ${duration}ms ease-out;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      opacity: 1;
      z-index: 1000;
    `;

    // Ensure parent has relative positioning
    const originalPosition = getComputedStyle(el).position;
    if (originalPosition === 'static') {
      (el as HTMLElement).style.position = 'relative';
    }

    el.appendChild(ripple);

    // Trigger animation
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(1)';
      ripple.style.opacity = '0';
    });

    // Clean up
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, duration);
  };

  el.addEventListener('pointerdown', onPointerDown, { passive: true });
  
  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
  };
}