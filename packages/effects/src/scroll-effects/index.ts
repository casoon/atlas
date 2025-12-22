/**
 * Modern Scroll Effects (2025)
 *
 * Advanced scroll-driven animations using:
 * - CSS Scroll-Linked Animations (where supported)
 * - Intersection Observer with fine-grained control
 * - Scroll velocity detection
 * - Parallax with depth layers
 * - Text/element splitting for character animations
 * - Sticky transitions
 * - Horizontal scroll sections
 *
 * @module
 */

import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';

// ============================================================================
// Types
// ============================================================================

/** Scroll progress (0 to 1) */
export type ScrollProgress = number;

/** Scroll direction */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right' | 'none';

/** Scroll velocity info */
export interface ScrollVelocity {
  /** Pixels per second */
  speed: number;
  /** Direction of scroll */
  direction: ScrollDirection;
}

/** Base options for scroll effects */
export interface ScrollEffectOptions {
  /** Root element for scroll (default: viewport) */
  root?: Element | null;
  /** Root margin for intersection */
  rootMargin?: string;
  /** Threshold(s) for intersection */
  threshold?: number | number[];
  /** Disable if user prefers reduced motion */
  respectReducedMotion?: boolean;
}

// ============================================================================
// Scroll Progress Tracking
// ============================================================================

export interface ScrollProgressOptions extends ScrollEffectOptions {
  /** Track 'element' position or 'page' scroll */
  mode?: 'element' | 'page';
  /** Callback with progress value (0-1) */
  onProgress?: (progress: number, element: HTMLElement) => void;
  /** Start offset (default: 'top bottom' - when top of element hits bottom of viewport) */
  start?: string;
  /** End offset (default: 'bottom top' - when bottom of element hits top of viewport) */
  end?: string;
}

/**
 * Track scroll progress of an element through the viewport
 *
 * @example
 * ```typescript
 * // Fade in as element scrolls into view
 * scrollProgress('#hero', {
 *   onProgress: (progress, el) => {
 *     el.style.opacity = String(progress);
 *   }
 * });
 *
 * // Scale based on scroll position
 * scrollProgress('.card', {
 *   onProgress: (progress, el) => {
 *     const scale = 0.8 + (progress * 0.2);
 *     el.style.transform = `scale(${scale})`;
 *   }
 * });
 * ```
 */
export function scrollProgress(
  target: Element | string,
  options: ScrollProgressOptions = {}
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) return () => {};

  const { mode = 'element', onProgress, respectReducedMotion = true } = options;

  if (respectReducedMotion && shouldReduceMotion()) {
    onProgress?.(1, element);
    return () => {};
  }

  let ticking = false;

  const updateProgress = () => {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    let progress: number;

    if (mode === 'element') {
      // Progress based on element position in viewport
      // 0 = element just entered bottom, 1 = element just left top
      const elementTop = rect.top;
      const elementHeight = rect.height;
      const start = windowHeight; // Bottom of viewport
      const end = -elementHeight; // Top of viewport (element fully passed)
      const range = start - end;
      progress = (start - elementTop) / range;
    } else {
      // Page scroll progress
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - windowHeight;
      progress = docHeight > 0 ? scrollTop / docHeight : 0;
    }

    // Clamp to 0-1
    progress = Math.max(0, Math.min(1, progress));
    onProgress?.(progress, element);
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  updateProgress(); // Initial update

  return () => {
    window.removeEventListener('scroll', onScroll);
  };
}

// ============================================================================
// Scroll Velocity
// ============================================================================

export interface ScrollVelocityOptions {
  /** Callback with velocity info */
  onVelocity?: (velocity: ScrollVelocity) => void;
  /** Smoothing factor (0-1, higher = more smooth) */
  smoothing?: number;
}

/**
 * Track scroll velocity for momentum-based effects
 *
 * @example
 * ```typescript
 * scrollVelocity({
 *   onVelocity: ({ speed, direction }) => {
 *     // Tilt elements based on scroll speed
 *     const tilt = Math.min(speed / 50, 10);
 *     element.style.transform = `rotateX(${direction === 'down' ? tilt : -tilt}deg)`;
 *   }
 * });
 * ```
 */
export function scrollVelocity(options: ScrollVelocityOptions = {}): () => void {
  const { onVelocity, smoothing = 0.3 } = options;

  let lastScrollY = window.scrollY;
  let lastScrollX = window.scrollX;
  let lastTime = performance.now();
  const velocity: ScrollVelocity = { speed: 0, direction: 'none' };
  let animationId: number | null = null;

  const update = () => {
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000; // seconds
    const currentY = window.scrollY;
    const currentX = window.scrollX;

    if (deltaTime > 0) {
      const deltaY = currentY - lastScrollY;
      const deltaX = currentX - lastScrollX;
      const newSpeed = Math.sqrt(deltaY * deltaY + deltaX * deltaX) / deltaTime;

      // Smooth the velocity
      velocity.speed = velocity.speed * smoothing + newSpeed * (1 - smoothing);

      // Determine direction
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        velocity.direction = deltaY > 0 ? 'down' : deltaY < 0 ? 'up' : 'none';
      } else {
        velocity.direction = deltaX > 0 ? 'right' : deltaX < 0 ? 'left' : 'none';
      }

      onVelocity?.(velocity);
    }

    lastScrollY = currentY;
    lastScrollX = currentX;
    lastTime = now;
    animationId = requestAnimationFrame(update);
  };

  animationId = requestAnimationFrame(update);

  return () => {
    if (animationId) cancelAnimationFrame(animationId);
  };
}

// ============================================================================
// Parallax Layers (Depth-based)
// ============================================================================

export interface ParallaxLayerOptions extends ScrollEffectOptions {
  /** Speed multiplier (-1 to 1, negative = opposite direction) */
  speed?: number;
  /** Axis to move on */
  axis?: 'y' | 'x' | 'both';
  /** Use CSS transforms (default) or scroll position */
  mode?: 'transform' | 'position';
  /** Enable 3D perspective for depth effect */
  perspective?: boolean;
  /** Z-depth for 3D effect (0-1000) */
  depth?: number;
}

/**
 * Create depth-based parallax layers
 *
 * @example
 * ```typescript
 * // Background moves slower (depth effect)
 * parallaxLayer('.bg-layer', { speed: 0.3 });
 *
 * // Foreground moves faster
 * parallaxLayer('.fg-layer', { speed: -0.2 });
 *
 * // 3D depth effect
 * parallaxLayer('.floating-element', {
 *   perspective: true,
 *   depth: 200,
 *   speed: 0.5
 * });
 * ```
 */
export function parallaxLayer(
  target: Element | string,
  options: ParallaxLayerOptions = {}
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) return () => {};

  const {
    speed = 0.5,
    axis = 'y',
    perspective = false,
    depth = 0,
    respectReducedMotion = true,
  } = options;

  if (respectReducedMotion && shouldReduceMotion()) {
    return () => {};
  }

  const styleManager = createStyleManager();
  let ticking = false;

  // Set up perspective container if needed
  if (perspective && element.parentElement) {
    styleManager.setStyles(element.parentElement, {
      perspective: '1000px',
      'perspective-origin': 'center center',
    });
  }

  styleManager.setStyles(element, {
    'will-change': 'transform',
  });

  const update = () => {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const elementCenter = rect.top + rect.height / 2;
    const viewportCenter = windowHeight / 2;

    // Calculate offset from center (-0.5 to 0.5)
    const offset = (elementCenter - viewportCenter) / windowHeight;
    const movement = offset * speed * 100;

    let transform = '';

    if (perspective && depth > 0) {
      const z = depth * (1 - Math.abs(offset));
      transform = `translateZ(${z}px) `;
    }

    if (axis === 'y' || axis === 'both') {
      transform += `translateY(${movement}px) `;
    }
    if (axis === 'x' || axis === 'both') {
      transform += `translateX(${movement}px) `;
    }

    element.style.transform = transform.trim();
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => {
    window.removeEventListener('scroll', onScroll);
    styleManager.restore(element);
    if (perspective && element.parentElement) {
      element.parentElement.style.perspective = '';
    }
  };
}

// ============================================================================
// Text Split Animation
// ============================================================================

export interface TextSplitOptions extends ScrollEffectOptions {
  /** Split by 'chars', 'words', or 'lines' */
  splitBy?: 'chars' | 'words' | 'lines';
  /** Animation preset */
  animation?: 'fade-up' | 'fade-down' | 'fade-in' | 'blur-in' | 'slide-up' | 'wave';
  /** Base duration per unit in ms */
  duration?: number;
  /** Stagger delay between units in ms */
  stagger?: number;
  /** Trigger once or repeat */
  once?: boolean;
  /** Custom easing */
  easing?: string;
}

/**
 * Split text and animate on scroll
 *
 * @example
 * ```typescript
 * // Animate each character
 * textSplit('.hero-title', {
 *   splitBy: 'chars',
 *   animation: 'fade-up',
 *   stagger: 30
 * });
 *
 * // Wave effect on words
 * textSplit('.tagline', {
 *   splitBy: 'words',
 *   animation: 'wave',
 *   stagger: 100
 * });
 * ```
 */
export function textSplit(target: Element | string, options: TextSplitOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) return () => {};

  const {
    splitBy = 'chars',
    animation = 'fade-up',
    duration = 600,
    stagger = 30,
    once = true,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    threshold = 0.2,
    respectReducedMotion = true,
  } = options;

  if (respectReducedMotion && shouldReduceMotion()) {
    return () => {};
  }

  const originalHTML = element.innerHTML;
  const text = element.textContent || '';

  // Split text into units
  let units: string[];
  switch (splitBy) {
    case 'chars':
      units = text.split('');
      break;
    case 'words':
      units = text.split(/\s+/);
      break;
    case 'lines':
      units = text.split(/\n/);
      break;
  }

  // Create wrapper spans
  const wrapperHTML = units
    .map((unit, i) => {
      const content = unit === ' ' ? '&nbsp;' : unit;
      const separator = splitBy === 'words' ? '&nbsp;' : '';
      return `<span class="atlas-text-unit" style="display: inline-block; opacity: 0;" data-index="${i}">${content}</span>${separator}`;
    })
    .join('');

  element.innerHTML = wrapperHTML;
  const unitElements = element.querySelectorAll<HTMLElement>('.atlas-text-unit');

  // Animation styles based on preset
  const getInitialStyles = (): Record<string, string> => {
    switch (animation) {
      case 'fade-up':
        return { opacity: '0', transform: 'translateY(20px)' };
      case 'fade-down':
        return { opacity: '0', transform: 'translateY(-20px)' };
      case 'fade-in':
        return { opacity: '0' };
      case 'blur-in':
        return { opacity: '0', filter: 'blur(10px)' };
      case 'slide-up':
        return { opacity: '0', transform: 'translateY(100%)' };
      case 'wave':
        return { opacity: '0', transform: 'translateY(10px) rotate(-5deg)' };
      default:
        return { opacity: '0' };
    }
  };

  const getFinalStyles = (): Record<string, string> => {
    return {
      opacity: '1',
      transform: 'translateY(0) rotate(0)',
      filter: 'blur(0)',
    };
  };

  // Apply initial styles
  unitElements.forEach((el) => {
    Object.assign(el.style, getInitialStyles());
  });

  let hasAnimated = false;

  const animate = () => {
    if (hasAnimated && once) return;

    unitElements.forEach((el, i) => {
      const delay = i * stagger;
      el.style.transition = `all ${duration}ms ${easing} ${delay}ms`;
      Object.assign(el.style, getFinalStyles());
    });

    hasAnimated = true;
  };

  const reset = () => {
    if (once) return;
    unitElements.forEach((el) => {
      el.style.transition = '';
      Object.assign(el.style, getInitialStyles());
    });
    hasAnimated = false;
  };

  // Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate();
        } else if (!once) {
          reset();
        }
      });
    },
    { threshold }
  );

  observer.observe(element);

  return () => {
    observer.disconnect();
    element.innerHTML = originalHTML;
  };
}

// ============================================================================
// Sticky Section Transitions
// ============================================================================

export interface StickyTransitionOptions {
  /** Sections to transition between */
  sections: (Element | string)[];
  /** Transition effect between sections */
  effect?: 'fade' | 'slide' | 'scale' | 'parallax';
  /** Duration of transition in scroll pixels */
  transitionDistance?: number;
  /** Callback when section changes */
  onSectionChange?: (index: number, element: HTMLElement) => void;
}

/**
 * Create sticky section transitions (like Apple product pages)
 *
 * @example
 * ```typescript
 * stickyTransition({
 *   sections: ['.section-1', '.section-2', '.section-3'],
 *   effect: 'fade',
 *   transitionDistance: 200,
 *   onSectionChange: (index) => console.log('Section:', index)
 * });
 * ```
 */
export function stickyTransition(options: StickyTransitionOptions): () => void {
  const {
    sections: sectionSelectors,
    effect = 'fade',
    transitionDistance = 200,
    onSectionChange,
  } = options;

  const sections = sectionSelectors
    .map((s) => resolveElement(s as string | HTMLElement))
    .filter((el): el is HTMLElement => el !== null);

  if (sections.length === 0) return () => {};

  const styleManager = createStyleManager();
  let currentSection = 0;
  let ticking = false;

  // Set up container
  const container = sections[0].parentElement;
  if (!container) return () => {};

  styleManager.setStyles(container, {
    position: 'relative',
    height: `${sections.length * 100}vh`,
  });

  // Set up sections
  sections.forEach((section, i) => {
    styleManager.setStyles(section, {
      position: 'sticky',
      top: '0',
      height: '100vh',
      width: '100%',
      'z-index': String(sections.length - i),
    });
  });

  const update = () => {
    const containerRect = container.getBoundingClientRect();
    const scrollProgress = -containerRect.top;
    const sectionHeight = window.innerHeight;

    sections.forEach((section, i) => {
      const sectionStart = i * sectionHeight;
      const sectionEnd = sectionStart + sectionHeight;

      // Calculate progress within this section (0-1)
      let progress = 0;
      if (scrollProgress >= sectionStart && scrollProgress < sectionEnd) {
        progress = (scrollProgress - sectionStart) / transitionDistance;
        progress = Math.max(0, Math.min(1, progress));

        if (currentSection !== i) {
          currentSection = i;
          onSectionChange?.(i, section);
        }
      } else if (scrollProgress >= sectionEnd) {
        progress = 1;
      }

      // Apply effect
      switch (effect) {
        case 'fade':
          section.style.opacity = scrollProgress < sectionStart ? '1' : String(1 - progress);
          break;
        case 'slide':
          section.style.transform =
            scrollProgress < sectionStart ? '' : `translateY(${-progress * 100}%)`;
          break;
        case 'scale':
          section.style.transform =
            scrollProgress < sectionStart ? '' : `scale(${1 - progress * 0.1})`;
          section.style.opacity = String(1 - progress);
          break;
        case 'parallax':
          section.style.transform =
            scrollProgress < sectionStart ? '' : `translateY(${-progress * 50}%)`;
          break;
      }
    });

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => {
    window.removeEventListener('scroll', onScroll);
    sections.forEach((section) => styleManager.restore(section));
    if (container) {
      container.style.height = '';
      container.style.position = '';
    }
  };
}

// ============================================================================
// Horizontal Scroll Section
// ============================================================================

export interface HorizontalScrollOptions {
  /** Container element */
  container: Element | string;
  /** Section wrapper inside container */
  wrapper?: Element | string;
  /** Easing function */
  easing?: 'linear' | 'smooth';
  /** Show progress indicator */
  showProgress?: boolean;
}

/**
 * Convert vertical scroll to horizontal section scroll
 *
 * @example
 * ```typescript
 * // HTML:
 * // <div class="horizontal-container">
 * //   <div class="horizontal-wrapper">
 * //     <section>1</section>
 * //     <section>2</section>
 * //     <section>3</section>
 * //   </div>
 * // </div>
 *
 * horizontalScroll({
 *   container: '.horizontal-container',
 *   wrapper: '.horizontal-wrapper',
 *   showProgress: true
 * });
 * ```
 */
export function horizontalScroll(options: HorizontalScrollOptions): () => void {
  const container = resolveElement(options.container as string | HTMLElement);
  if (!container) return () => {};

  const wrapper = options.wrapper
    ? resolveElement(options.wrapper as string | HTMLElement)
    : (container.firstElementChild as HTMLElement);
  if (!wrapper) return () => {};

  const styleManager = createStyleManager();
  let ticking = false;

  // Calculate wrapper width
  const wrapperWidth = wrapper.scrollWidth;
  const containerHeight = wrapperWidth - window.innerWidth + window.innerHeight;

  // Set up container
  styleManager.setStyles(container, {
    height: `${containerHeight}px`,
    position: 'relative',
  });

  // Set up wrapper
  styleManager.setStyles(wrapper, {
    position: 'sticky',
    top: '0',
    display: 'flex',
    height: '100vh',
    'will-change': 'transform',
  });

  // Progress indicator
  let progressEl: HTMLElement | null = null;
  if (options.showProgress) {
    progressEl = document.createElement('div');
    progressEl.className = 'atlas-horizontal-progress';
    Object.assign(progressEl.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100px',
      height: '4px',
      background: 'rgba(255,255,255,0.2)',
      borderRadius: '2px',
      overflow: 'hidden',
      zIndex: '1000',
    });

    const progressBar = document.createElement('div');
    Object.assign(progressBar.style, {
      height: '100%',
      background: 'white',
      borderRadius: '2px',
      width: '0%',
      transition: 'width 0.1s',
    });
    progressEl.appendChild(progressBar);
    document.body.appendChild(progressEl);
  }

  const update = () => {
    const rect = container.getBoundingClientRect();
    const scrollProgress = -rect.top;
    const maxScroll = containerHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, scrollProgress / maxScroll));

    const translateX = -progress * (wrapperWidth - window.innerWidth);
    wrapper.style.transform = `translateX(${translateX}px)`;

    if (progressEl) {
      const progressBar = progressEl.firstElementChild as HTMLElement;
      progressBar.style.width = `${progress * 100}%`;
    }

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => {
    window.removeEventListener('scroll', onScroll);
    styleManager.restore(container);
    styleManager.restore(wrapper);
    if (progressEl) {
      progressEl.remove();
    }
  };
}

// ============================================================================
// Scroll-Linked CSS Animations (Native API where supported)
// ============================================================================

export interface ScrollTimelineOptions {
  /** Animation name (CSS @keyframes) */
  animation: string;
  /** Scroll source element */
  source?: Element | string;
  /** Scroll axis */
  axis?: 'block' | 'inline' | 'x' | 'y';
  /** Timeline range start */
  rangeStart?: string;
  /** Timeline range end */
  rangeEnd?: string;
}

/**
 * Use native CSS Scroll-Linked Animations (where supported)
 * Falls back to JS-based animation if not supported
 *
 * @example
 * ```typescript
 * // CSS:
 * // @keyframes fadeIn {
 * //   from { opacity: 0; }
 * //   to { opacity: 1; }
 * // }
 *
 * scrollTimeline('.element', {
 *   animation: 'fadeIn',
 *   rangeStart: 'entry 0%',
 *   rangeEnd: 'cover 50%'
 * });
 * ```
 */
export function scrollTimeline(
  target: Element | string,
  options: ScrollTimelineOptions
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) return () => {};

  const {
    animation,
    axis: _axis = 'block',
    rangeStart = 'entry 0%',
    rangeEnd = 'cover 100%',
  } = options;

  // Check for native support
  const supportsScrollTimeline = 'ScrollTimeline' in window;

  if (supportsScrollTimeline) {
    // Use native CSS Scroll-Linked Animations
    // Using setProperty since these are new CSS properties not yet in TypeScript's CSSStyleDeclaration
    element.style.animation = animation;
    element.style.setProperty('animation-timeline', 'view()');
    element.style.setProperty('animation-range', `${rangeStart} ${rangeEnd}`);

    return () => {
      element.style.animation = '';
      element.style.removeProperty('animation-timeline');
      element.style.removeProperty('animation-range');
    };
  }

  // Fallback: Use Intersection Observer + scroll progress
  // This is a simplified fallback - full implementation would parse @keyframes
  console.warn(
    '[Atlas] ScrollTimeline not supported, using fallback. Consider using scrollProgress() instead.'
  );

  return scrollProgress(element, {
    onProgress: (progress) => {
      element.style.setProperty('--scroll-progress', String(progress));
    },
  });
}

// ============================================================================
// Magnetic Scroll Snap
// ============================================================================

export interface MagneticSnapOptions {
  /** Snap targets */
  targets: (Element | string)[];
  /** Snap threshold in pixels */
  threshold?: number;
  /** Duration of snap animation in ms */
  duration?: number;
  /** Callback when snapped to target */
  onSnap?: (index: number, element: HTMLElement) => void;
}

/**
 * Magnetic snap to sections on scroll stop
 *
 * @example
 * ```typescript
 * magneticSnap({
 *   targets: ['.section-1', '.section-2', '.section-3'],
 *   threshold: 100,
 *   onSnap: (index) => console.log('Snapped to section:', index)
 * });
 * ```
 */
export function magneticSnap(options: MagneticSnapOptions): () => void {
  const { targets: targetSelectors, threshold = 150, duration = 500, onSnap } = options;

  const targets = targetSelectors
    .map((s) => resolveElement(s as string | HTMLElement))
    .filter((el): el is HTMLElement => el !== null);

  if (targets.length === 0) return () => {};

  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let isSnapping = false;

  const findNearestTarget = (): {
    element: HTMLElement;
    index: number;
    distance: number;
  } | null => {
    const viewportCenter = window.innerHeight / 2;
    let nearest: { element: HTMLElement; index: number; distance: number } | null = null;

    targets.forEach((target, index) => {
      const rect = target.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - viewportCenter);

      if (!nearest || distance < nearest.distance) {
        nearest = { element: target, index, distance };
      }
    });

    return nearest;
  };

  const snapToNearest = () => {
    if (isSnapping) return;

    const nearest = findNearestTarget();
    if (!nearest || nearest.distance > threshold) return;

    isSnapping = true;

    const rect = nearest.element.getBoundingClientRect();
    const scrollTarget = window.scrollY + rect.top;

    // Smooth scroll to target
    window.scrollTo({
      top: scrollTarget,
      behavior: 'smooth',
    });

    onSnap?.(nearest.index, nearest.element);

    // Reset snapping flag after animation
    setTimeout(() => {
      isSnapping = false;
    }, duration);
  };

  const onScroll = () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(snapToNearest, 150);
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (scrollTimeout) clearTimeout(scrollTimeout);
  };
}

// ============================================================================
// Scroll-Based Counter
// ============================================================================

export interface ScrollCounterOptions extends ScrollEffectOptions {
  /** Start value */
  from?: number;
  /** End value */
  to: number;
  /** Number of decimal places */
  decimals?: number;
  /** Duration in ms */
  duration?: number;
  /** Prefix (e.g., '$') */
  prefix?: string;
  /** Suffix (e.g., '%', '+') */
  suffix?: string;
  /** Thousand separator */
  separator?: string;
  /** Trigger once or reset */
  once?: boolean;
}

/**
 * Animated counter triggered by scroll
 *
 * @example
 * ```typescript
 * scrollCounter('.stat-number', {
 *   to: 1000000,
 *   prefix: '$',
 *   separator: ',',
 *   suffix: '+'
 * });
 * // Displays: $1,000,000+
 * ```
 */
export function scrollCounter(target: Element | string, options: ScrollCounterOptions): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) return () => {};

  const {
    from = 0,
    to,
    decimals = 0,
    duration = 2000,
    prefix = '',
    suffix = '',
    separator = '',
    once = true,
    threshold = 0.5,
    respectReducedMotion = true,
  } = options;

  if (respectReducedMotion && shouldReduceMotion()) {
    element.textContent = formatNumber(to);
    return () => {};
  }

  function formatNumber(num: number): string {
    let formatted = num.toFixed(decimals);
    if (separator) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
      formatted = parts.join('.');
    }
    return `${prefix}${formatted}${suffix}`;
  }

  let hasAnimated = false;
  let animationId: number | null = null;

  const animate = () => {
    if (hasAnimated && once) return;

    const startTime = performance.now();
    let currentValue = from;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - (1 - progress) ** 3;
      currentValue = from + (to - from) * eased;

      element.textContent = formatNumber(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(tick);
      } else {
        hasAnimated = true;
        animationId = null;
      }
    };

    animationId = requestAnimationFrame(tick);
  };

  const reset = () => {
    if (once) return;
    if (animationId) cancelAnimationFrame(animationId);
    element.textContent = formatNumber(from);
    hasAnimated = false;
  };

  // Set initial value
  element.textContent = formatNumber(from);

  // Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate();
        } else if (!once) {
          reset();
        }
      });
    },
    { threshold }
  );

  observer.observe(element);

  return () => {
    observer.disconnect();
    if (animationId) cancelAnimationFrame(animationId);
  };
}
