/**
 * Marquee Component
 *
 * Infinite scrolling text/content ticker:
 * - Horizontal and vertical scrolling
 * - Configurable speed and direction
 * - Pause on hover
 * - Seamless looping
 * - Gradient fade edges
 *
 * @module
 */

import { isBrowser } from '../shared/dom';

// ============================================================================
// Types
// ============================================================================

/** Marquee direction */
export type MarqueeDirection = 'left' | 'right' | 'up' | 'down';

/** Marquee configuration */
export interface MarqueeConfig {
  /** Scroll direction (default: 'left') */
  direction?: MarqueeDirection;
  /** Speed in pixels per second (default: 50) */
  speed?: number;
  /** Pause on hover (default: true) */
  pauseOnHover?: boolean;
  /** Gap between items in px (default: 40) */
  gap?: number;
  /** Show gradient fade on edges (default: true) */
  gradient?: boolean;
  /** Gradient width/height in px (default: 50) */
  gradientSize?: number;
  /** Gradient color (default: 'white') */
  gradientColor?: string;
  /** Number of content duplications (default: auto) */
  copies?: number;
  /** Animation timing function (default: 'linear') */
  easing?: string;
  /** Delay before starting in ms (default: 0) */
  delay?: number;
  /** Play state (default: true) */
  autoplay?: boolean;
  /** Callback when animation completes one cycle */
  onCycle?: () => void;
}

/** Marquee instance */
export interface Marquee {
  /** Start/resume animation */
  play: () => void;
  /** Pause animation */
  pause: () => void;
  /** Check if playing */
  isPlaying: () => boolean;
  /** Set speed */
  setSpeed: (speed: number) => void;
  /** Set direction */
  setDirection: (direction: MarqueeDirection) => void;
  /** Destroy instance */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  ROOT: 'data-atlas-marquee',
  CONTENT: 'data-atlas-marquee-content',
  INNER: 'data-atlas-marquee-inner',
} as const;

const CLASSES = {
  ROOT: 'atlas-marquee',
  INNER: 'atlas-marquee-inner',
  CONTENT: 'atlas-marquee-content',
  GRADIENT_LEFT: 'atlas-marquee-gradient-left',
  GRADIENT_RIGHT: 'atlas-marquee-gradient-right',
  GRADIENT_TOP: 'atlas-marquee-gradient-top',
  GRADIENT_BOTTOM: 'atlas-marquee-gradient-bottom',
  PAUSED: 'atlas-marquee-paused',
} as const;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a Marquee instance
 *
 * @example
 * ```typescript
 * // Simple text marquee
 * const marquee = createMarquee(container, {
 *   speed: 60,
 *   pauseOnHover: true
 * });
 * // Container should have the text/content inside
 *
 * // Logo carousel
 * const logoMarquee = createMarquee(logoContainer, {
 *   direction: 'right',
 *   speed: 40,
 *   gap: 60,
 *   gradient: true
 * });
 *
 * // Vertical ticker
 * const ticker = createMarquee(newsContainer, {
 *   direction: 'up',
 *   speed: 30
 * });
 *
 * // Control playback
 * marquee.pause();
 * marquee.play();
 * marquee.setSpeed(100);
 *
 * // Cleanup
 * marquee.destroy();
 * ```
 */
export function createMarquee(container: HTMLElement, config: MarqueeConfig = {}): Marquee {
  // SSR guard
  if (!isBrowser()) {
    return {
      play: () => {},
      pause: () => {},
      isPlaying: () => false,
      setSpeed: () => {},
      setDirection: () => {},
      destroy: () => {},
    };
  }

  const {
    direction: initialDirection = 'left',
    speed: initialSpeed = 50,
    pauseOnHover = true,
    gap = 40,
    gradient = true,
    gradientSize = 50,
    gradientColor = 'white',
    copies: configCopies,
    easing: _easing = 'linear',
    delay = 0,
    autoplay = true,
    onCycle,
  } = config;

  let direction = initialDirection;
  let speed = initialSpeed;
  let playing = false;
  let animationId: number | null = null;
  let startTime: number | null = null;
  let pausedAt = 0;
  let offset = 0;

  const isHorizontal = direction === 'left' || direction === 'right';
  const isReverse = direction === 'right' || direction === 'down';

  // Store original content
  const originalContent = container.innerHTML;

  // Set up structure
  container.innerHTML = '';
  container.setAttribute(ATTRS.ROOT, '');
  container.classList.add(CLASSES.ROOT);
  container.style.overflow = 'hidden';
  container.style.position = 'relative';

  // Create inner wrapper
  const innerEl = document.createElement('div');
  innerEl.className = CLASSES.INNER;
  innerEl.setAttribute(ATTRS.INNER, '');
  innerEl.style.display = 'flex';
  innerEl.style.flexDirection = isHorizontal ? 'row' : 'column';
  innerEl.style.width = isHorizontal ? 'max-content' : '100%';
  innerEl.style.height = isHorizontal ? '100%' : 'max-content';
  innerEl.style.gap = `${gap}px`;

  // Create content elements
  const contentEl = document.createElement('div');
  contentEl.className = CLASSES.CONTENT;
  contentEl.setAttribute(ATTRS.CONTENT, '');
  contentEl.innerHTML = originalContent;
  contentEl.style.display = 'flex';
  contentEl.style.flexDirection = isHorizontal ? 'row' : 'column';
  contentEl.style.gap = `${gap}px`;
  contentEl.style.flexShrink = '0';

  innerEl.appendChild(contentEl);
  container.appendChild(innerEl);

  // Calculate content size and determine copies needed
  let contentSize = isHorizontal ? contentEl.offsetWidth : contentEl.offsetHeight;
  const containerSize = isHorizontal ? container.offsetWidth : container.offsetHeight;
  const copies = configCopies ?? Math.ceil((containerSize * 2) / contentSize) + 1;

  // Add copies for seamless loop
  for (let i = 0; i < copies; i++) {
    const copy = contentEl.cloneNode(true) as HTMLElement;
    copy.setAttribute('aria-hidden', 'true');
    innerEl.appendChild(copy);
  }

  // Recalculate with gap
  contentSize = contentSize + gap;

  // Add gradient overlays
  if (gradient) {
    const gradientStyle = `
      position: absolute;
      z-index: 1;
      pointer-events: none;
    `;

    if (isHorizontal) {
      const leftGradient = document.createElement('div');
      leftGradient.className = CLASSES.GRADIENT_LEFT;
      leftGradient.style.cssText = `
        ${gradientStyle}
        left: 0;
        top: 0;
        bottom: 0;
        width: ${gradientSize}px;
        background: linear-gradient(to right, ${gradientColor}, transparent);
      `;

      const rightGradient = document.createElement('div');
      rightGradient.className = CLASSES.GRADIENT_RIGHT;
      rightGradient.style.cssText = `
        ${gradientStyle}
        right: 0;
        top: 0;
        bottom: 0;
        width: ${gradientSize}px;
        background: linear-gradient(to left, ${gradientColor}, transparent);
      `;

      container.appendChild(leftGradient);
      container.appendChild(rightGradient);
    } else {
      const topGradient = document.createElement('div');
      topGradient.className = CLASSES.GRADIENT_TOP;
      topGradient.style.cssText = `
        ${gradientStyle}
        left: 0;
        right: 0;
        top: 0;
        height: ${gradientSize}px;
        background: linear-gradient(to bottom, ${gradientColor}, transparent);
      `;

      const bottomGradient = document.createElement('div');
      bottomGradient.className = CLASSES.GRADIENT_BOTTOM;
      bottomGradient.style.cssText = `
        ${gradientStyle}
        left: 0;
        right: 0;
        bottom: 0;
        height: ${gradientSize}px;
        background: linear-gradient(to top, ${gradientColor}, transparent);
      `;

      container.appendChild(topGradient);
      container.appendChild(bottomGradient);
    }
  }

  // Animation loop
  function animate(timestamp: number): void {
    if (!playing) return;

    if (startTime === null) {
      startTime = timestamp - pausedAt;
    }

    const elapsed = timestamp - startTime;
    const pixelsMoved = (elapsed / 1000) * speed;

    // Calculate offset with wrapping
    offset = pixelsMoved % contentSize;
    const translateValue = isReverse ? offset : -offset;

    if (isHorizontal) {
      innerEl.style.transform = `translateX(${translateValue}px)`;
    } else {
      innerEl.style.transform = `translateY(${translateValue}px)`;
    }

    // Check for cycle completion
    if (
      onCycle &&
      Math.floor(pixelsMoved / contentSize) > Math.floor((pixelsMoved - speed / 60) / contentSize)
    ) {
      onCycle();
    }

    animationId = requestAnimationFrame(animate);
  }

  function play(): void {
    if (playing) return;
    playing = true;
    container.classList.remove(CLASSES.PAUSED);
    animationId = requestAnimationFrame(animate);
  }

  function pause(): void {
    if (!playing) return;
    playing = false;
    container.classList.add(CLASSES.PAUSED);
    pausedAt = performance.now() - (startTime || 0);
    startTime = null;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // Hover handlers
  function handleMouseEnter(): void {
    if (pauseOnHover && playing) {
      pause();
      container.dataset.wasPlaying = 'true';
    }
  }

  function handleMouseLeave(): void {
    if (pauseOnHover && container.dataset.wasPlaying === 'true') {
      delete container.dataset.wasPlaying;
      play();
    }
  }

  if (pauseOnHover) {
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
  }

  // Start after delay
  if (autoplay) {
    if (delay > 0) {
      setTimeout(play, delay);
    } else {
      play();
    }
  }

  return {
    play,
    pause,

    isPlaying(): boolean {
      return playing;
    },

    setSpeed(newSpeed: number): void {
      const wasPlaying = playing;
      if (wasPlaying) pause();
      speed = newSpeed;
      if (wasPlaying) play();
    },

    setDirection(newDirection: MarqueeDirection): void {
      direction = newDirection;
      // Would need to rebuild for direction change
      console.warn('[Marquee] Direction change requires rebuild');
    },

    destroy(): void {
      pause();
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.innerHTML = originalContent;
      container.removeAttribute(ATTRS.ROOT);
      container.classList.remove(CLASSES.ROOT);
      container.style.overflow = '';
      container.style.position = '';
    },
  };
}

// ============================================================================
// Web Component
// ============================================================================

export class AtlasMarquee extends HTMLElement {
  private _marquee: Marquee | null = null;

  static get observedAttributes(): string[] {
    return ['speed', 'direction', 'pause-on-hover', 'gap', 'gradient'];
  }

  connectedCallback(): void {
    // Use requestAnimationFrame to ensure content is rendered
    requestAnimationFrame(() => {
      this._init();
    });
  }

  disconnectedCallback(): void {
    this._marquee?.destroy();
    this._marquee = null;
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    if (!this._marquee) return;

    switch (name) {
      case 'speed':
        this._marquee.setSpeed(parseFloat(newValue) || 50);
        break;
    }
  }

  private _init(): void {
    this._marquee = createMarquee(this, {
      speed: parseFloat(this.getAttribute('speed') || '50'),
      direction: (this.getAttribute('direction') as MarqueeDirection) || 'left',
      pauseOnHover: this.getAttribute('pause-on-hover') !== 'false',
      gap: parseFloat(this.getAttribute('gap') || '40'),
      gradient: this.getAttribute('gradient') !== 'false',
      gradientSize: parseFloat(this.getAttribute('gradient-size') || '50'),
      gradientColor: this.getAttribute('gradient-color') || 'white',
    });
  }

  play(): void {
    this._marquee?.play();
  }

  pause(): void {
    this._marquee?.pause();
  }
}

// Register web component
if (isBrowser() && !customElements.get('atlas-marquee')) {
  customElements.define('atlas-marquee', AtlasMarquee);
}
