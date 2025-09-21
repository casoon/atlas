export interface CursorFollowOptions {
  speed?: number;
  offset?: { x: number; y: number };
  magnetic?: boolean;
  magneticThreshold?: number;
}

export function cursorFollow(target: Element | string, options: CursorFollowOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { speed = 0.1, offset = { x: 0, y: 0 }, magnetic = false, magneticThreshold = 100 } = options;
  
  const htmlElement = element as HTMLElement;
  let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
  let animationId: number;

  const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

  const handleMouseMove = (e: MouseEvent) => {
    if (magnetic) {
      const rect = htmlElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2);
      
      if (distance < magneticThreshold) {
        targetX = e.clientX + offset.x;
        targetY = e.clientY + offset.y;
      }
    } else {
      targetX = e.clientX + offset.x;
      targetY = e.clientY + offset.y;
    }
  };

  const animate = () => {
    currentX = lerp(currentX, targetX, speed);
    currentY = lerp(currentY, targetY, speed);
    htmlElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
    animationId = requestAnimationFrame(animate);
  };

  document.addEventListener('mousemove', handleMouseMove);
  animate();

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    cancelAnimationFrame(animationId);
  };
}