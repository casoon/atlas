export interface OrbsOptions {
  count?: number;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  color?: string;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  element: HTMLElement;
}

export function orbs(target: Element | string, options: OrbsOptions = {}) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return () => {};

  const { 
    count = 5, 
    minSize = 20, 
    maxSize = 60, 
    speed = 0.5,
    color = 'rgba(255, 255, 255, 0.1)'
  } = options;

  const orbs: Orb[] = [];
  let animationId: number;

  // Ensure container has relative positioning and overflow hidden
  const originalPosition = getComputedStyle(container).position;
  const originalOverflow = getComputedStyle(container).overflow;
  
  if (originalPosition === 'static') {
    (container as HTMLElement).style.position = 'relative';
  }
  if (originalOverflow === 'visible') {
    (container as HTMLElement).style.overflow = 'hidden';
  }

  const rect = container.getBoundingClientRect();

  // Create orbs
  for (let i = 0; i < count; i++) {
    const size = minSize + Math.random() * (maxSize - minSize);
    const orb: Orb = {
      x: Math.random() * (rect.width - size),
      y: Math.random() * (rect.height - size),
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size,
      element: document.createElement('div')
    };

    orb.element.className = 'orb';
    orb.element.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      transition: transform 0.1s ease-out;
    `;

    container.appendChild(orb.element);
    orbs.push(orb);
  }

  // Animation loop
  const animate = () => {
    orbs.forEach((orb) => {
      orb.x += orb.vx;
      orb.y += orb.vy;

      // Bounce off walls
      if (orb.x <= 0 || orb.x >= rect.width - orb.size) {
        orb.vx *= -1;
        orb.x = Math.max(0, Math.min(rect.width - orb.size, orb.x));
      }
      if (orb.y <= 0 || orb.y >= rect.height - orb.size) {
        orb.vy *= -1;
        orb.y = Math.max(0, Math.min(rect.height - orb.size, orb.y));
      }

      orb.element.style.transform = `translate(${orb.x}px, ${orb.y}px)`;
    });

    animationId = requestAnimationFrame(animate);
  };

  animate();

  return () => {
    cancelAnimationFrame(animationId);
    orbs.forEach((orb) => {
      if (orb.element.parentNode) {
        orb.element.parentNode.removeChild(orb.element);
      }
    });
  };
}