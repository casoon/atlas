export interface TiltOptions {
  intensity?: number;
  scale?: number;
  perspective?: number;
  speed?: number;
  glareEffect?: boolean;
}

export function tilt(target: Element | string, options: TiltOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { intensity = 20, scale = 1.05, perspective = 1000, speed = 300, glareEffect = true } = options;
  const htmlElement = element as HTMLElement;
  let glareElement: HTMLElement | null = null;

  if (glareEffect) {
    glareElement = document.createElement('div');
    glareElement.style.cssText = `
      position: absolute; inset: 0; border-radius: inherit;
      background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%);
      opacity: 0; pointer-events: none; transition: opacity ${speed}ms ease;
    `;
    htmlElement.appendChild(glareElement);
  }

  htmlElement.style.transformStyle = 'preserve-3d';
  htmlElement.style.transition = `transform ${speed}ms ease`;

  const handleMouseMove = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const rect = htmlElement.getBoundingClientRect();
    const x = ((mouseEvent.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((mouseEvent.clientY - rect.top) / rect.height - 0.5) * 2;
    
    const rotateX = -y * intensity;
    const rotateY = x * intensity;
    
    htmlElement.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    
    if (glareElement) {
      glareElement.style.opacity = '1';
      glareElement.style.background = `linear-gradient(${Math.atan2(y, x) * 180 / Math.PI + 90}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)`;
    }
  };

  const handleMouseLeave = () => {
    htmlElement.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    if (glareElement) glareElement.style.opacity = '0';
  };

  element.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);
    if (glareElement && glareElement.parentNode) glareElement.parentNode.removeChild(glareElement);
  };
}