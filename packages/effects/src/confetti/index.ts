import { shouldReduceMotion } from '../utils/accessibility';
import { createSimpleAnimationLoop } from '../utils/animation';
import { resolveElement } from '../utils/element';

export interface ConfettiOptions {
  count?: number;
  colors?: string[];
  spread?: number;
  gravity?: number;
  velocity?: number;
  decay?: number;
  origin?: { x: number; y: number };
  shapes?: ('circle' | 'square' | 'triangle')[];
  trigger?: 'auto' | 'manual';
  duration?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
  opacity: number;
}

/**
 * Creates a confetti celebration effect with physics-based particles.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the confetti effect
 * @returns An object with cleanup function and trigger method
 *
 * @example
 * ```typescript
 * const confetti = confetti('#container', {
 *   count: 100,
 *   colors: ['#ff0000', '#00ff00', '#0000ff'],
 *   spread: 60,
 *   gravity: 0.5,
 *   velocity: 15,
 *   trigger: 'manual'
 * });
 *
 * // Trigger celebration
 * confetti.trigger();
 * // Cleanup
 * confetti.cleanup();
 * ```
 */
export function confetti(
  target: Element | string,
  options: ConfettiOptions = {}
): { cleanup: () => void; trigger: () => void } {
  const element = resolveElement(target as string | HTMLElement);

  const noop = {
    cleanup: () => {},
    trigger: () => {},
  };

  if (!element) {
    console.warn('[Atlas Confetti] Element not found:', target);
    return noop;
  }

  if (shouldReduceMotion()) {
    console.info('[Atlas Confetti] Effect disabled due to prefers-reduced-motion');
    return noop;
  }

  const {
    count = 100,
    colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    spread = 60,
    gravity = 0.5,
    velocity = 15,
    decay = 0.98,
    origin = { x: 0.5, y: 0.5 },
    shapes = ['circle', 'square'],
    trigger: triggerMode = 'auto',
    duration = 3000,
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.warn('[Atlas Confetti] Canvas context not available');
    return noop;
  }

  canvas.className = 'atlas-confetti';
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
  `;

  document.body.appendChild(canvas);

  // Size canvas to viewport
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  resizeCanvas();

  let particles: Particle[] = [];
  let stopAnimation: (() => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Create particles
  const createParticles = () => {
    const newParticles: Particle[] = [];
    const originX = canvas.width * origin.x;
    const originY = canvas.height * origin.y;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
      const speed = velocity * (0.5 + Math.random() * 0.5);

      newParticles.push({
        x: originX,
        y: originY,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        opacity: 1,
      });
    }

    return newParticles;
  };

  // Draw particle
  const drawParticle = (particle: Particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particle.color;

    switch (particle.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'square':
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -particle.size / 2);
        ctx.lineTo(particle.size / 2, particle.size / 2);
        ctx.lineTo(-particle.size / 2, particle.size / 2);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  };

  // Update particles
  const updateParticles = () => {
    particles = particles.filter((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Apply gravity
      particle.vy += gravity;

      // Apply decay
      particle.vx *= decay;
      particle.vy *= decay;

      // Update rotation
      particle.rotation += particle.rotationSpeed;

      // Fade out near end
      if (particle.y > canvas.height - 100) {
        particle.opacity -= 0.02;
      }

      // Remove if out of bounds or fully transparent
      return particle.y < canvas.height + 50 && particle.opacity > 0;
    });
  };

  // Animation loop
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateParticles();

    particles.forEach((particle) => {
      drawParticle(particle);
    });

    // Stop animation if no particles left
    if (particles.length === 0 && stopAnimation) {
      stopAnimation();
      stopAnimation = null;
    }
  };

  // Trigger confetti
  const triggerConfetti = () => {
    // Add new particles
    particles.push(...createParticles());

    // Start animation if not running
    if (!stopAnimation) {
      stopAnimation = createSimpleAnimationLoop(animate);
    }

    // Auto-stop after duration if manual mode
    if (triggerMode === 'manual') {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        particles = [];
      }, duration);
    }
  };

  // Auto trigger if set
  if (triggerMode === 'auto') {
    triggerConfetti();
    // Auto cleanup after duration
    timeoutId = setTimeout(() => {
      particles = [];
    }, duration);
  }

  // Handle resize
  const handleResize = () => {
    resizeCanvas();
  };

  window.addEventListener('resize', handleResize);

  return {
    trigger: triggerConfetti,
    cleanup: () => {
      if (stopAnimation) {
        stopAnimation();
        stopAnimation = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener('resize', handleResize);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      particles = [];
    },
  };
}
