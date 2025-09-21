export interface ParticlesOptions {
  count?: number;
  size?: [number, number];
  speed?: [number, number];
  color?: string | string[];
  opacity?: [number, number];
  interactive?: boolean;
  connectLines?: boolean;
  maxDistance?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  element: HTMLElement;
}

export function particles(target: Element | string, options: ParticlesOptions = {}) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return () => {};

  const {
    count = 30,
    size = [2, 8],
    speed = [0.1, 0.5],
    color = ['#3b82f6', '#8b5cf6', '#ec4899'],
    opacity = [0.3, 0.8],
    interactive = true,
    connectLines = false,
    maxDistance = 100
  } = options;

  const htmlContainer = container as HTMLElement;
  const particles: Particle[] = [];
  const colors = Array.isArray(color) ? color : [color];
  let animationId: number;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  // Setup canvas for connection lines if needed
  if (connectLines) {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d')!;
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;
    htmlContainer.appendChild(canvas);
  }

  // Ensure container positioning
  const originalPosition = getComputedStyle(htmlContainer).position;
  if (originalPosition === 'static') {
    htmlContainer.style.position = 'relative';
  }

  const rect = htmlContainer.getBoundingClientRect();

  // Create particles
  for (let i = 0; i < count; i++) {
    const particleSize = size[0] + Math.random() * (size[1] - size[0]);
    const particleSpeed = speed[0] + Math.random() * (speed[1] - speed[0]);
    
    const particle: Particle = {
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * particleSpeed,
      vy: (Math.random() - 0.5) * particleSpeed,
      size: particleSize,
      opacity: opacity[0] + Math.random() * (opacity[1] - opacity[0]),
      element: document.createElement('div')
    };

    const particleColor = colors[Math.floor(Math.random() * colors.length)];
    
    particle.element.style.cssText = `
      position: absolute;
      width: ${particleSize}px;
      height: ${particleSize}px;
      background: ${particleColor};
      border-radius: 50%;
      pointer-events: none;
      opacity: ${particle.opacity};
      will-change: transform;
      z-index: 2;
    `;

    htmlContainer.appendChild(particle.element);
    particles.push(particle);
  }

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;
  const handleMouseMove = (e: MouseEvent) => {
    if (!interactive) return;
    
    const containerRect = htmlContainer.getBoundingClientRect();
    mouseX = e.clientX - containerRect.left;
    mouseY = e.clientY - containerRect.top;
  };

  // Draw connection lines
  const drawConnections = () => {
    if (!ctx || !canvas) return;
    
    canvas.width = htmlContainer.offsetWidth;
    canvas.height = htmlContainer.offsetHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  };

  // Animation loop
  const animate = () => {
    particles.forEach((particle) => {
      // Mouse attraction
      if (interactive) {
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const force = (100 - distance) / 100 * 0.01;
          particle.vx += dx * force;
          particle.vy += dy * force;
        }
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Boundary collision with damping
      if (particle.x <= 0 || particle.x >= rect.width) {
        particle.vx *= -0.9;
        particle.x = Math.max(0, Math.min(rect.width, particle.x));
      }
      if (particle.y <= 0 || particle.y >= rect.height) {
        particle.vy *= -0.9;
        particle.y = Math.max(0, Math.min(rect.height, particle.y));
      }

      // Apply friction
      particle.vx *= 0.999;
      particle.vy *= 0.999;

      // Update DOM
      particle.element.style.transform = `translate(${particle.x - particle.size/2}px, ${particle.y - particle.size/2}px)`;
    });

    if (connectLines) {
      drawConnections();
    }

    animationId = requestAnimationFrame(animate);
  };

  // Start animation
  animate();

  if (interactive) {
    htmlContainer.addEventListener('mousemove', handleMouseMove);
  }

  // Cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    htmlContainer.removeEventListener('mousemove', handleMouseMove);
    
    particles.forEach((particle) => {
      if (particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    });
    
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };
}