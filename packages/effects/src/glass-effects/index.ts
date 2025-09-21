export interface GlassEffectsOptions {
  intensity?: number;
  blurAmount?: number;
  animated?: boolean;
  interactiveBlur?: boolean;
  color?: string;
}

export function glassEffects(target: Element | string, options: GlassEffectsOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const {
    intensity = 0.15,
    blurAmount = 16,
    animated = true,
    interactiveBlur = true,
    color = 'rgba(255, 255, 255, 0.1)'
  } = options;

  const htmlElement = element as HTMLElement;
  let isAnimating = false;

  // Apply base glass styling
  const applyGlassStyle = (blur = blurAmount, opacity = intensity) => {
    htmlElement.style.cssText += `
      background: color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent);
      backdrop-filter: blur(${blur}px) saturate(1.2);
      -webkit-backdrop-filter: blur(${blur}px) saturate(1.2);
      border: 1px solid color-mix(in srgb, ${color} ${Math.round(opacity * 200)}%, transparent);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
  };

  // Interactive blur effect
  const handleMouseMove = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    if (!interactiveBlur || isAnimating) return;

    const rect = htmlElement.getBoundingClientRect();
    const x = (mouseEvent.clientX - rect.left) / rect.width;
    const y = (mouseEvent.clientY - rect.top) / rect.height;
    
    // Calculate distance from center
    const distanceFromCenter = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2));
    const dynamicBlur = blurAmount * (0.7 + distanceFromCenter * 0.6);
    const dynamicOpacity = intensity * (1.2 - distanceFromCenter * 0.4);
    
    applyGlassStyle(dynamicBlur, Math.max(0.05, dynamicOpacity));
  };

  const handleMouseLeave = () => {
    applyGlassStyle();
  };

  // Animated glass pulse
  const animateGlass = () => {
    if (!animated) return;

    let phase = 0;
    const animate = () => {
      const pulseIntensity = Math.sin(phase) * 0.3 + 1;
      const pulseBlur = blurAmount * pulseIntensity;
      const pulseOpacity = intensity * pulseIntensity;
      
      applyGlassStyle(pulseBlur, pulseOpacity);
      phase += 0.02;
      
      if (animated) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  };

  // Initialize
  applyGlassStyle();
  
  if (interactiveBlur) {
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
  }
  
  if (animated) {
    setTimeout(animateGlass, 100);
  }

  // Cleanup function
  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);
    isAnimating = false;
  };
}