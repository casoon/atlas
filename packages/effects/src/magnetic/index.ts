export interface MagneticOptions {
  strength?: number;
  threshold?: number;
  returnSpeed?: number;
}

export function magnetic(target: Element | string, options: MagneticOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { strength = 0.3, threshold = 100, returnSpeed = 0.1 } = options;
  const htmlElement = element as HTMLElement;
  let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
  let animationId: number;

  const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

  const handleMouseMove = (e: MouseEvent) => {
    const rect = htmlElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2);

    if (distance < threshold) {
      const force = (threshold - distance) / threshold;
      targetX = (e.clientX - centerX) * strength * force;
      targetY = (e.clientY - centerY) * strength * force;
    } else {
      targetX = 0;
      targetY = 0;
    }
  };

  const animate = () => {
    currentX = lerp(currentX, targetX, returnSpeed);
    currentY = lerp(currentY, targetY, returnSpeed);
    htmlElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
    animationId = requestAnimationFrame(animate);
  };

  document.addEventListener('mousemove', handleMouseMove);
  animate();

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    cancelAnimationFrame(animationId);
    htmlElement.style.transform = '';
  };
}