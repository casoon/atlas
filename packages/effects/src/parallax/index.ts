export interface ParallaxOptions {
  speed?: number;
  direction?: 'vertical' | 'horizontal' | 'both';
  offset?: number;
}

export function parallax(target: Element | string, options: ParallaxOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { speed = 0.5, direction = 'vertical', offset = 0 } = options;

  let ticking = false;

  const updatePosition = () => {
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.scrollY;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;
    const scrollTop = window.scrollY;

    // Calculate if element is in viewport
    const elementBottom = elementTop + elementHeight;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + windowHeight;

    if (elementBottom >= viewportTop && elementTop <= viewportBottom) {
      // Element is visible, apply parallax
      const scrolled = scrollTop - elementTop + offset;
      let transformValue = '';

      switch (direction) {
        case 'vertical':
          transformValue = `translateY(${scrolled * speed}px)`;
          break;
        case 'horizontal':
          transformValue = `translateX(${scrolled * speed}px)`;
          break;
        case 'both':
          transformValue = `translate(${scrolled * speed}px, ${scrolled * speed}px)`;
          break;
      }

      (element as HTMLElement).style.transform = transformValue;
    }

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updatePosition);
      ticking = true;
    }
  };

  // Initial position
  updatePosition();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', updatePosition);
    // Reset transform
    (element as HTMLElement).style.transform = '';
  };
}