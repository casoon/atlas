export interface ScrollRevealOptions {
  distance?: string;
  duration?: number;
  delay?: number;
  easing?: string;
  origin?: 'top' | 'bottom' | 'left' | 'right';
  scale?: number;
  opacity?: [number, number];
  threshold?: number;
  once?: boolean;
}

export function scrollReveal(target: Element | string, options: ScrollRevealOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const {
    distance = '20px',
    duration = 800,
    delay = 0,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    origin = 'bottom',
    scale = 0.95,
    opacity = [0, 1],
    threshold = 0.1,
    once = true
  } = options;

  const htmlElement = element as HTMLElement;
  let hasAnimated = false;

  // Set initial state
  const setInitialState = () => {
    const transforms = [];
    
    switch (origin) {
      case 'top':
        transforms.push(`translateY(-${distance})`);
        break;
      case 'bottom':
        transforms.push(`translateY(${distance})`);
        break;
      case 'left':
        transforms.push(`translateX(-${distance})`);
        break;
      case 'right':
        transforms.push(`translateX(${distance})`);
        break;
    }
    
    if (scale !== 1) {
      transforms.push(`scale(${scale})`);
    }

    htmlElement.style.cssText += `
      opacity: ${opacity[0]};
      transform: ${transforms.join(' ')};
      transition: all ${duration}ms ${easing} ${delay}ms;
      will-change: transform, opacity;
    `;
  };

  // Animate to visible state
  const reveal = () => {
    if (hasAnimated && once) return;
    
    htmlElement.style.opacity = opacity[1].toString();
    htmlElement.style.transform = 'translateX(0) translateY(0) scale(1)';
    hasAnimated = true;
  };

  // Hide element (for reanimation)
  const hide = () => {
    if (once) return;
    setInitialState();
    hasAnimated = false;
  };

  // Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal();
        } else if (!once) {
          hide();
        }
      });
    },
    { 
      threshold,
      rootMargin: '50px 0px -50px 0px' 
    }
  );

  // Initialize
  setInitialState();
  observer.observe(element);

  // Cleanup function
  return () => {
    observer.unobserve(element);
    observer.disconnect();
    htmlElement.style.willChange = 'auto';
  };
}