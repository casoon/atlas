import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';

export interface SkeletonEffectOptions {
  variant?: 'text' | 'circle' | 'rect' | 'custom';
  width?: string;
  height?: string;
  count?: number;
  spacing?: string;
  animation?: 'pulse' | 'wave' | 'none';
  baseColor?: string;
  highlightColor?: string;
  borderRadius?: string;
}

/**
 * Creates a skeleton loading placeholder with animation.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the skeleton loader
 * @returns A cleanup function to remove the skeleton
 *
 * @example
 * ```typescript
 * const cleanup = skeleton('#container', {
 *   variant: 'text',
 *   count: 3,
 *   spacing: '10px',
 *   animation: 'wave'
 * });
 *
 * // Remove when content loads
 * cleanup();
 * ```
 */
export function skeletonEffect(
  target: Element | string,
  options: SkeletonEffectOptions = {}
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Skeleton] Element not found:', target);
    return () => {};
  }

  const {
    variant = 'text',
    width = '100%',
    height = variant === 'text' ? '1em' : '100px',
    count = 1,
    spacing = '8px',
    animation = 'wave',
    baseColor = '#e0e0e0',
    highlightColor = '#f5f5f5',
    borderRadius = variant === 'circle' ? '50%' : '4px',
  } = options;

  const reduceMotion = shouldReduceMotion();
  const effectiveAnimation = reduceMotion ? 'none' : animation;

  // Create style element for animations
  const styleId = `atlas-skeleton-styles-${Math.random().toString(36).substr(2, 9)}`;
  const style = document.createElement('style');
  style.id = styleId;

  if (effectiveAnimation === 'pulse') {
    style.textContent = `
      @keyframes atlas-skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .atlas-skeleton-item.atlas-skeleton-pulse {
        animation: atlas-skeleton-pulse 2s ease-in-out infinite;
      }
    `;
  } else if (effectiveAnimation === 'wave') {
    style.textContent = `
      @keyframes atlas-skeleton-wave {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .atlas-skeleton-item.atlas-skeleton-wave {
        position: relative;
        overflow: hidden;
      }
      .atlas-skeleton-item.atlas-skeleton-wave::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          ${highlightColor},
          transparent
        );
        animation: atlas-skeleton-wave 2s ease-in-out infinite;
      }
    `;
  }

  document.head.appendChild(style);

  // Create container
  const container = document.createElement('div');
  container.className = 'atlas-skeleton-container';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: ${spacing};
  `;

  // Create skeleton items
  const items: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = `atlas-skeleton-item atlas-skeleton-${effectiveAnimation}`;

    let itemWidth = width;
    let itemHeight = height;

    // Vary width for text variant to look more natural
    if (variant === 'text' && i === count - 1 && count > 1) {
      itemWidth = `${50 + Math.random() * 30}%`;
    }

    // Circle variant should be square
    if (variant === 'circle') {
      itemWidth = height;
      itemHeight = height;
    }

    item.style.cssText = `
      width: ${itemWidth};
      height: ${itemHeight};
      background-color: ${baseColor};
      border-radius: ${borderRadius};
      flex-shrink: 0;
    `;

    items.push(item);
    container.appendChild(item);
  }

  // Store original content
  const originalContent = element.innerHTML;

  // Replace content with skeleton
  element.innerHTML = '';
  element.appendChild(container);

  return () => {
    // Restore original content
    element.innerHTML = originalContent;

    // Remove style
    const styleElement = document.getElementById(styleId);
    if (styleElement) {
      styleElement.remove();
    }
  };
}
