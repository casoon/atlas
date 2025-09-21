export interface MorphingOptions {
  shapes?: string[];
  duration?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

export function morphing(target: Element | string, options: MorphingOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { shapes = ['50%', '0%', '25%', '50%'], duration = 2000, autoPlay = true, loop = true } = options;
  const htmlElement = element as HTMLElement;
  
  let currentIndex = 0;
  let intervalId: number;

  const morph = (shapeIndex: number) => {
    htmlElement.style.borderRadius = shapes[shapeIndex];
    htmlElement.style.transition = `border-radius ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
  };

  const nextShape = () => {
    currentIndex = (currentIndex + 1) % shapes.length;
    morph(currentIndex);
  };

  if (autoPlay) {
    intervalId = setInterval(nextShape, duration + 100);
  }

  return () => {
    clearInterval(intervalId);
    htmlElement.style.borderRadius = '';
    htmlElement.style.transition = '';
  };
}