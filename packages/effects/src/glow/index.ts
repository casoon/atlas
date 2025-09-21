export interface GlowOptions {
  color?: string;
  intensity?: number;
  size?: number;
  animated?: boolean;
  interactive?: boolean;
}

export function glow(target: Element | string, options: GlowOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { color = '#3b82f6', intensity = 0.5, size = 20, animated = true, interactive = true } = options;
  const htmlElement = element as HTMLElement;

  const applyGlow = (glowIntensity = intensity, glowSize = size) => {
    htmlElement.style.boxShadow = `0 0 ${glowSize}px ${Math.round(glowIntensity * glowSize)}px ${color}`;
  };

  if (animated) {
    let phase = 0;
    const animate = () => {
      const pulseIntensity = Math.sin(phase) * 0.3 + 0.7;
      applyGlow(intensity * pulseIntensity);
      phase += 0.02;
      requestAnimationFrame(animate);
    };
    animate();
  }

  if (interactive) {
    const handleMouseEnter = () => applyGlow(intensity * 1.5, size * 1.2);
    const handleMouseLeave = () => applyGlow();
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }

  applyGlow();
  return () => { htmlElement.style.boxShadow = ''; };
}