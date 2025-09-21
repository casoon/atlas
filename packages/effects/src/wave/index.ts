export interface WaveOptions {
  amplitude?: number;
  frequency?: number;
  speed?: number;
  direction?: 'horizontal' | 'vertical';
}

export function wave(target: Element | string, options: WaveOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { amplitude = 10, frequency = 0.02, speed = 0.05, direction = 'horizontal' } = options;
  const htmlElement = element as HTMLElement;
  let animationId: number;
  let time = 0;

  const animate = () => {
    const offset = Math.sin(time) * amplitude;
    const transform = direction === 'horizontal' 
      ? `translateY(${offset}px)` 
      : `translateX(${offset}px)`;
    
    htmlElement.style.transform = transform;
    time += speed;
    animationId = requestAnimationFrame(animate);
  };

  animate();
  return () => {
    cancelAnimationFrame(animationId);
    htmlElement.style.transform = '';
  };
}