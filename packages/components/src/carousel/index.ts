/**
 * @fileoverview Carousel component - slideshow with navigation
 * @module @atlas/components/carousel
 */

import { generateId } from '../shared/aria';
import { addListener, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

// ============================================================================
// Types
// ============================================================================

export type CarouselOrientation = 'horizontal' | 'vertical';

export interface CarouselOptions {
  /** Initial slide index */
  startIndex?: number;
  /** Enable infinite loop */
  loop?: boolean;
  /** Autoplay interval in ms (0 to disable) */
  autoplay?: number;
  /** Pause autoplay on hover */
  pauseOnHover?: boolean;
  /** Enable drag/swipe */
  draggable?: boolean;
  /** Slides to show at once */
  slidesToShow?: number;
  /** Slides to scroll per navigation */
  slidesToScroll?: number;
  /** Carousel orientation */
  orientation?: CarouselOrientation;
  /** Gap between slides (CSS value) */
  gap?: string;
  /** Animation duration in ms */
  duration?: number;
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show dot indicators */
  showDots?: boolean;
  /** Callback when slide changes */
  onChange?: (index: number) => void;
}

export interface CarouselState {
  /** Get current slide index */
  getIndex: () => number;
  /** Go to specific slide */
  goTo: (index: number) => void;
  /** Go to next slide */
  next: () => void;
  /** Go to previous slide */
  prev: () => void;
  /** Get total slide count */
  getCount: () => number;
  /** Start autoplay */
  play: () => void;
  /** Stop autoplay */
  pause: () => void;
  /** Check if autoplay is running */
  isPlaying: () => boolean;
  /** Refresh carousel (after DOM changes) */
  refresh: () => void;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  VIEWPORT: 'data-atlas-carousel-viewport',
  CONTAINER: 'data-atlas-carousel-container',
  SLIDE: 'data-atlas-carousel-slide',
  PREV: 'data-atlas-carousel-prev',
  NEXT: 'data-atlas-carousel-next',
  DOTS: 'data-atlas-carousel-dots',
  DOT: 'data-atlas-carousel-dot',
} as const;

const CLASSES = {
  ROOT: 'atlas-carousel',
  VIEWPORT: 'atlas-carousel-viewport',
  CONTAINER: 'atlas-carousel-container',
  SLIDE: 'atlas-carousel-slide',
  SLIDE_ACTIVE: 'atlas-carousel-slide--active',
  ARROW: 'atlas-carousel-arrow',
  ARROW_PREV: 'atlas-carousel-arrow--prev',
  ARROW_NEXT: 'atlas-carousel-arrow--next',
  ARROW_DISABLED: 'atlas-carousel-arrow--disabled',
  DOTS: 'atlas-carousel-dots',
  DOT: 'atlas-carousel-dot',
  DOT_ACTIVE: 'atlas-carousel-dot--active',
  DRAGGING: 'atlas-carousel--dragging',
  HORIZONTAL: 'atlas-carousel--horizontal',
  VERTICAL: 'atlas-carousel--vertical',
} as const;

const ARROW_PREV_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
const ARROW_NEXT_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a carousel/slideshow component
 *
 * @example
 * ```ts
 * const carousel = createCarousel(element, {
 *   autoplay: 5000,
 *   loop: true,
 *   slidesToShow: 3,
 *   onChange: (index) => console.log('Slide:', index)
 * });
 * ```
 */
export function createCarousel(element: HTMLElement, options: CarouselOptions = {}): CarouselState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    startIndex = 0,
    loop = false,
    autoplay = 0,
    pauseOnHover = true,
    draggable = true,
    slidesToShow = 1,
    slidesToScroll = 1,
    orientation = 'horizontal',
    gap = '0px',
    duration = ANIMATION_DURATION.normal,
    showArrows = true,
    showDots = true,
  } = options;

  // State
  let currentIndex = startIndex;
  let isPlayingState = autoplay > 0;
  let autoplayTimer: ReturnType<typeof setInterval> | null = null;
  let isDragging = false;
  let dragStart = 0;
  let dragOffset = 0;

  // Elements
  const id = generateId('carousel');
  let viewportEl: HTMLElement | null = null;
  let containerEl: HTMLElement | null = null;
  let slides: HTMLElement[] = [];
  let prevBtn: HTMLButtonElement | null = null;
  let nextBtn: HTMLButtonElement | null = null;
  let dotsEl: HTMLElement | null = null;
  const cleanups: (() => void)[] = [];

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.classList.add(orientation === 'horizontal' ? CLASSES.HORIZONTAL : CLASSES.VERTICAL);
    element.setAttribute('data-atlas-carousel', '');
    element.setAttribute('role', 'region');
    element.setAttribute('aria-roledescription', 'carousel');
    element.setAttribute('aria-label', 'Image carousel');
    element.id = id;

    // Find or create viewport
    viewportEl = element.querySelector(`[${ATTRS.VIEWPORT}]`);
    if (!viewportEl) {
      viewportEl = document.createElement('div');
      viewportEl.className = CLASSES.VIEWPORT;
      viewportEl.setAttribute(ATTRS.VIEWPORT, '');

      // Move existing children into viewport
      const existingContent = Array.from(element.children);
      existingContent.forEach((child) => viewportEl?.appendChild(child));
      element.appendChild(viewportEl);
    }

    // Find or create container
    containerEl = viewportEl.querySelector(`[${ATTRS.CONTAINER}]`);
    if (!containerEl) {
      containerEl = document.createElement('div');
      containerEl.className = CLASSES.CONTAINER;
      containerEl.setAttribute(ATTRS.CONTAINER, '');

      // Move viewport children into container
      const viewportContent = Array.from(viewportEl.children);
      viewportContent.forEach((child) => containerEl?.appendChild(child));
      viewportEl.appendChild(containerEl);
    }

    // Setup slides
    refreshSlides();

    // Apply gap
    containerEl.style.gap = gap;

    // Create navigation arrows
    if (showArrows) {
      createArrows();
    }

    // Create dot indicators
    if (showDots) {
      createDots();
    }

    // Setup drag handlers
    if (draggable) {
      setupDrag();
    }

    // Setup keyboard navigation
    setupKeyboard();

    // Setup hover pause
    if (pauseOnHover && autoplay > 0) {
      cleanups.push(addListener(element, 'mouseenter', () => stopAutoplay()));
      cleanups.push(
        addListener(element, 'mouseleave', () => {
          if (isPlayingState) startAutoplay();
        })
      );
    }

    // Initial position
    goTo(currentIndex, false);

    // Start autoplay
    if (autoplay > 0) {
      startAutoplay();
    }
  }

  function refreshSlides(): void {
    slides = Array.from(containerEl?.querySelectorAll(`[${ATTRS.SLIDE}]`) ?? []) as HTMLElement[];

    // If no slides marked, treat all children as slides
    if (slides.length === 0 && containerEl) {
      slides = Array.from(containerEl.children) as HTMLElement[];
      slides.forEach((slide) => {
        slide.classList.add(CLASSES.SLIDE);
        slide.setAttribute(ATTRS.SLIDE, '');
      });
    }

    // Setup slide attributes
    slides.forEach((slide, index) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`);

      // Set slide width based on slidesToShow
      const width = `calc((100% - ${gap} * ${slidesToShow - 1}) / ${slidesToShow})`;
      slide.style.flex = `0 0 ${width}`;
      slide.style.minWidth = width;
    });

    // Recreate dots if needed
    if (showDots && dotsEl) {
      createDots();
    }
  }

  function createArrows(): void {
    // Previous button
    prevBtn = document.createElement('button');
    prevBtn.className = `${CLASSES.ARROW} ${CLASSES.ARROW_PREV}`;
    prevBtn.setAttribute(ATTRS.PREV, '');
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.type = 'button';
    prevBtn.innerHTML = ARROW_PREV_ICON;
    prevBtn.addEventListener('click', prev);
    element.appendChild(prevBtn);

    // Next button
    nextBtn = document.createElement('button');
    nextBtn.className = `${CLASSES.ARROW} ${CLASSES.ARROW_NEXT}`;
    nextBtn.setAttribute(ATTRS.NEXT, '');
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.type = 'button';
    nextBtn.innerHTML = ARROW_NEXT_ICON;
    nextBtn.addEventListener('click', next);
    element.appendChild(nextBtn);
  }

  function createDots(): void {
    if (dotsEl) {
      dotsEl.remove();
    }

    const dotCount = Math.ceil((slides.length - slidesToShow + 1) / slidesToScroll);
    if (dotCount <= 1) return;

    dotsEl = document.createElement('div');
    dotsEl.className = CLASSES.DOTS;
    dotsEl.setAttribute(ATTRS.DOTS, '');
    dotsEl.setAttribute('role', 'tablist');
    dotsEl.setAttribute('aria-label', 'Slide navigation');

    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('button');
      dot.className = `${CLASSES.DOT} ${i === Math.floor(currentIndex / slidesToScroll) ? CLASSES.DOT_ACTIVE : ''}`;
      dot.setAttribute(ATTRS.DOT, '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.setAttribute(
        'aria-selected',
        i === Math.floor(currentIndex / slidesToScroll) ? 'true' : 'false'
      );
      dot.type = 'button';
      dot.addEventListener('click', () => goTo(i * slidesToScroll));
      dotsEl.appendChild(dot);
    }

    element.appendChild(dotsEl);
  }

  function setupDrag(): void {
    if (!containerEl) return;

    const isHorizontal = orientation === 'horizontal';

    function handlePointerDown(e: PointerEvent): void {
      if (e.button !== 0) return;

      isDragging = true;
      dragStart = isHorizontal ? e.clientX : e.clientY;
      dragOffset = 0;

      element.classList.add(CLASSES.DRAGGING);
      if (containerEl) containerEl.style.transition = 'none';

      containerEl?.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent): void {
      if (!isDragging) return;

      const current = isHorizontal ? e.clientX : e.clientY;
      dragOffset = current - dragStart;

      const baseOffset = getSlideOffset(currentIndex);
      const transform = isHorizontal
        ? `translateX(${baseOffset + dragOffset}px)`
        : `translateY(${baseOffset + dragOffset}px)`;
      if (containerEl) containerEl.style.transform = transform;
    }

    function handlePointerUp(e: PointerEvent): void {
      if (!isDragging) return;

      isDragging = false;
      element.classList.remove(CLASSES.DRAGGING);
      if (containerEl) containerEl.style.transition = '';

      const threshold = (viewportEl?.clientWidth ?? 0) / 4;

      if (Math.abs(dragOffset) > threshold) {
        if (dragOffset > 0) {
          prev();
        } else {
          next();
        }
      } else {
        goTo(currentIndex);
      }

      containerEl?.releasePointerCapture(e.pointerId);
    }

    containerEl.addEventListener('pointerdown', handlePointerDown);
    containerEl.addEventListener('pointermove', handlePointerMove);
    containerEl.addEventListener('pointerup', handlePointerUp);
    containerEl.addEventListener('pointercancel', handlePointerUp);

    cleanups.push(() => {
      containerEl?.removeEventListener('pointerdown', handlePointerDown);
      containerEl?.removeEventListener('pointermove', handlePointerMove);
      containerEl?.removeEventListener('pointerup', handlePointerUp);
      containerEl?.removeEventListener('pointercancel', handlePointerUp);
    });
  }

  function setupKeyboard(): void {
    function handleKeydown(e: KeyboardEvent): void {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prev();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          next();
          break;
      }
    }

    element.setAttribute('tabindex', '0');
    cleanups.push(addListener(element, 'keydown', handleKeydown as EventListener));
  }

  function getSlideOffset(index: number): number {
    if (!viewportEl || slides.length === 0) return 0;

    const slideWidth = slides[0].offsetWidth;
    const gapValue = parseFloat(gap) || 0;

    return -(index * (slideWidth + gapValue));
  }

  function goTo(index: number, animate: boolean = true): void {
    const maxIndex = Math.max(0, slides.length - slidesToShow);

    if (loop) {
      if (index < 0) {
        index = maxIndex;
      } else if (index > maxIndex) {
        index = 0;
      }
    } else {
      index = Math.max(0, Math.min(index, maxIndex));
    }

    currentIndex = index;

    // Update container position
    if (containerEl) {
      const offset = getSlideOffset(currentIndex);
      const isHorizontal = orientation === 'horizontal';

      containerEl.style.transition = animate
        ? `transform ${duration}ms ${EASING.standard}`
        : 'none';
      containerEl.style.transform = isHorizontal
        ? `translateX(${offset}px)`
        : `translateY(${offset}px)`;
    }

    // Update active slide
    slides.forEach((slide, i) => {
      const isActive = i >= currentIndex && i < currentIndex + slidesToShow;
      slide.classList.toggle(CLASSES.SLIDE_ACTIVE, isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    // Update arrows
    updateArrows();

    // Update dots
    updateDots();

    // Callback
    if (animate) {
      options.onChange?.(currentIndex);
    }
  }

  function next(): void {
    goTo(currentIndex + slidesToScroll);
  }

  function prev(): void {
    goTo(currentIndex - slidesToScroll);
  }

  function updateArrows(): void {
    if (!loop) {
      const maxIndex = Math.max(0, slides.length - slidesToShow);
      prevBtn?.classList.toggle(CLASSES.ARROW_DISABLED, currentIndex === 0);
      nextBtn?.classList.toggle(CLASSES.ARROW_DISABLED, currentIndex >= maxIndex);
    }
  }

  function updateDots(): void {
    if (!dotsEl) return;

    const dots = dotsEl.querySelectorAll(`[${ATTRS.DOT}]`);
    const activeDotIndex = Math.floor(currentIndex / slidesToScroll);

    dots.forEach((dot, i) => {
      dot.classList.toggle(CLASSES.DOT_ACTIVE, i === activeDotIndex);
      dot.setAttribute('aria-selected', i === activeDotIndex ? 'true' : 'false');
    });
  }

  function startAutoplay(): void {
    if (autoplayTimer) return;

    autoplayTimer = setInterval(() => {
      next();
    }, autoplay);
  }

  function stopAutoplay(): void {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function play(): void {
    isPlayingState = true;
    startAutoplay();
  }

  function pause(): void {
    isPlayingState = false;
    stopAutoplay();
  }

  function refresh(): void {
    refreshSlides();
    goTo(Math.min(currentIndex, slides.length - slidesToShow), false);
  }

  function destroy(): void {
    stopAutoplay();
    cleanups.forEach((cleanup) => cleanup());

    element.classList.remove(CLASSES.ROOT, CLASSES.HORIZONTAL, CLASSES.VERTICAL, CLASSES.DRAGGING);
    element.removeAttribute('data-atlas-carousel');
    element.removeAttribute('role');
    element.removeAttribute('aria-roledescription');
    element.removeAttribute('aria-label');
    element.removeAttribute('tabindex');
  }

  // Initialize
  init();

  return {
    getIndex: () => currentIndex,
    goTo,
    next,
    prev,
    getCount: () => slides.length,
    play,
    pause,
    isPlaying: () => isPlayingState && autoplayTimer !== null,
    refresh,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): CarouselState {
  return {
    getIndex: () => 0,
    goTo: () => {},
    next: () => {},
    prev: () => {},
    getCount: () => 0,
    play: () => {},
    pause: () => {},
    isPlaying: () => false,
    refresh: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initCarousels(root: Document | HTMLElement = document): CarouselState[] {
  if (!isBrowser()) return [];

  const carousels: CarouselState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-carousel]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-carousel-initialized')) return;

    const options: CarouselOptions = {
      startIndex: parseInt(element.getAttribute('data-start-index') ?? '0', 10),
      loop: element.hasAttribute('data-loop'),
      autoplay: parseInt(element.getAttribute('data-autoplay') ?? '0', 10),
      pauseOnHover: element.getAttribute('data-pause-on-hover') !== 'false',
      draggable: element.getAttribute('data-draggable') !== 'false',
      slidesToShow: parseInt(element.getAttribute('data-slides-to-show') ?? '1', 10),
      slidesToScroll: parseInt(element.getAttribute('data-slides-to-scroll') ?? '1', 10),
      orientation:
        (element.getAttribute('data-orientation') as CarouselOrientation) ?? 'horizontal',
      gap: element.getAttribute('data-gap') ?? '0px',
      showArrows: element.getAttribute('data-show-arrows') !== 'false',
      showDots: element.getAttribute('data-show-dots') !== 'false',
    };

    const carousel = createCarousel(element, options);
    element.setAttribute('data-atlas-carousel-initialized', '');
    carousels.push(carousel);
  });

  return carousels;
}
