/**
 * @fileoverview Avatar component - user/entity representation
 * @module @atlas/components/avatar
 */

import { generateId } from '../shared/aria';
import { isBrowser } from '../shared/dom';

// ============================================================================
// Types
// ============================================================================

export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | null;

export interface AvatarOptions {
  /** Image source URL */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Fallback text (initials) */
  fallback?: string;
  /** Avatar size */
  size?: AvatarSize;
  /** Avatar shape */
  shape?: AvatarShape;
  /** Whether to show online status indicator */
  status?: 'online' | 'offline' | 'busy' | 'away' | null;
  /** Custom color for fallback background */
  color?: string;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Callback when image loads successfully */
  onLoad?: () => void;
}

export interface AvatarState {
  /** Get current image source */
  getSrc: () => string | undefined;
  /** Set image source */
  setSrc: (src: string) => void;
  /** Set fallback text */
  setFallback: (fallback: string) => void;
  /** Set size */
  setSize: (size: AvatarSize) => void;
  /** Get size */
  getSize: () => AvatarSize;
  /** Set shape */
  setShape: (shape: AvatarShape) => void;
  /** Get shape */
  getShape: () => AvatarShape;
  /** Set status */
  setStatus: (status: 'online' | 'offline' | 'busy' | 'away' | null) => void;
  /** Get status */
  getStatus: () => 'online' | 'offline' | 'busy' | 'away' | null;
  /** Cleanup resources */
  destroy: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ATTRS = {
  IMAGE: 'data-atlas-avatar-image',
  FALLBACK: 'data-atlas-avatar-fallback',
  STATUS: 'data-atlas-avatar-status',
} as const;

const CLASSES = {
  ROOT: 'atlas-avatar',
  IMAGE: 'atlas-avatar-image',
  FALLBACK: 'atlas-avatar-fallback',
  STATUS: 'atlas-avatar-status',
  LOADING: 'atlas-avatar--loading',
  ERROR: 'atlas-avatar--error',
} as const;

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'atlas-avatar--xs',
  sm: 'atlas-avatar--sm',
  default: 'atlas-avatar--default',
  lg: 'atlas-avatar--lg',
  xl: 'atlas-avatar--xl',
};

const SHAPE_CLASSES: Record<AvatarShape, string> = {
  circle: 'atlas-avatar--circle',
  square: 'atlas-avatar--square',
};

const STATUS_CLASSES: Record<string, string> = {
  online: 'atlas-avatar-status--online',
  offline: 'atlas-avatar-status--offline',
  busy: 'atlas-avatar-status--busy',
  away: 'atlas-avatar-status--away',
};

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates an avatar component for user/entity representation
 *
 * @example
 * ```ts
 * const avatar = createAvatar(element, {
 *   src: '/images/user.jpg',
 *   alt: 'John Doe',
 *   fallback: 'JD',
 *   size: 'lg',
 *   status: 'online'
 * });
 * ```
 */
export function createAvatar(element: HTMLElement, options: AvatarOptions = {}): AvatarState {
  if (!isBrowser()) {
    return createNoopState();
  }

  const {
    src: initialSrc,
    alt = '',
    fallback: initialFallback = '',
    size = 'default',
    shape = 'circle',
    status: initialStatus = null,
    color,
  } = options;

  // State
  let currentSrc = initialSrc;
  let currentFallback = initialFallback;
  let currentSize = size;
  let currentShape = shape;
  let currentStatus = initialStatus;
  let _imageLoaded = false;
  let imageError = false;

  // Elements
  const id = generateId('avatar');
  let imageEl: HTMLImageElement | null = null;
  let fallbackEl: HTMLElement | null = null;
  let statusEl: HTMLElement | null = null;

  // Initialize
  function init(): void {
    element.classList.add(CLASSES.ROOT);
    element.setAttribute('data-atlas-avatar', '');
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', alt || currentFallback || 'Avatar');
    element.id = id;

    // Apply size and shape
    applySizeClass();
    applyShapeClass();

    // Apply custom color
    if (color) {
      element.style.setProperty('--atlas-avatar-color', color);
    }

    // Create image element
    imageEl = document.createElement('img');
    imageEl.className = CLASSES.IMAGE;
    imageEl.setAttribute(ATTRS.IMAGE, '');
    imageEl.alt = alt;
    imageEl.addEventListener('load', handleImageLoad);
    imageEl.addEventListener('error', handleImageError);

    // Create fallback element
    fallbackEl = document.createElement('span');
    fallbackEl.className = CLASSES.FALLBACK;
    fallbackEl.setAttribute(ATTRS.FALLBACK, '');
    fallbackEl.setAttribute('aria-hidden', 'true');

    // Create status element
    if (currentStatus) {
      createStatusElement();
    }

    // Add elements
    element.appendChild(imageEl);
    element.appendChild(fallbackEl);

    // Load image or show fallback
    if (currentSrc) {
      loadImage(currentSrc);
    } else {
      showFallback();
    }
  }

  function loadImage(src: string): void {
    if (!imageEl) return;

    element.classList.add(CLASSES.LOADING);
    element.classList.remove(CLASSES.ERROR);
    _imageLoaded = false;
    imageError = false;

    imageEl.src = src;
  }

  function handleImageLoad(): void {
    _imageLoaded = true;
    imageError = false;
    element.classList.remove(CLASSES.LOADING, CLASSES.ERROR);

    if (imageEl) {
      imageEl.style.display = '';
    }
    if (fallbackEl) {
      fallbackEl.style.display = 'none';
    }

    options.onLoad?.();
  }

  function handleImageError(): void {
    _imageLoaded = false;
    imageError = true;
    element.classList.remove(CLASSES.LOADING);
    element.classList.add(CLASSES.ERROR);

    showFallback();
    options.onError?.();
  }

  function showFallback(): void {
    if (imageEl) {
      imageEl.style.display = 'none';
    }
    if (fallbackEl) {
      fallbackEl.style.display = '';
      fallbackEl.textContent = getInitials(currentFallback);
    }
  }

  function getInitials(text: string): string {
    if (!text) return '';

    const words = text.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  function createStatusElement(): void {
    if (statusEl) {
      statusEl.remove();
    }

    if (!currentStatus) return;

    statusEl = document.createElement('span');
    statusEl.className = `${CLASSES.STATUS} ${STATUS_CLASSES[currentStatus] || ''}`;
    statusEl.setAttribute(ATTRS.STATUS, '');
    statusEl.setAttribute('aria-label', currentStatus);
    element.appendChild(statusEl);
  }

  function applySizeClass(): void {
    Object.values(SIZE_CLASSES).forEach((cls) => {
      element.classList.remove(cls);
    });
    element.classList.add(SIZE_CLASSES[currentSize]);
  }

  function applyShapeClass(): void {
    Object.values(SHAPE_CLASSES).forEach((cls) => {
      element.classList.remove(cls);
    });
    element.classList.add(SHAPE_CLASSES[currentShape]);
  }

  function setSrc(src: string): void {
    currentSrc = src;
    if (src) {
      loadImage(src);
    } else {
      showFallback();
    }
  }

  function setFallback(fallback: string): void {
    currentFallback = fallback;
    if (fallbackEl && (!currentSrc || imageError)) {
      fallbackEl.textContent = getInitials(fallback);
    }
    element.setAttribute('aria-label', alt || fallback || 'Avatar');
  }

  function setSize(newSize: AvatarSize): void {
    currentSize = newSize;
    applySizeClass();
  }

  function setShape(newShape: AvatarShape): void {
    currentShape = newShape;
    applyShapeClass();
  }

  function setStatus(status: 'online' | 'offline' | 'busy' | 'away' | null): void {
    currentStatus = status;
    createStatusElement();
  }

  function destroy(): void {
    imageEl?.removeEventListener('load', handleImageLoad);
    imageEl?.removeEventListener('error', handleImageError);

    element.classList.remove(
      CLASSES.ROOT,
      CLASSES.LOADING,
      CLASSES.ERROR,
      ...Object.values(SIZE_CLASSES),
      ...Object.values(SHAPE_CLASSES)
    );
    element.removeAttribute('data-atlas-avatar');
    element.removeAttribute('role');
    element.removeAttribute('aria-label');
  }

  // Initialize
  init();

  return {
    getSrc: () => currentSrc,
    setSrc,
    setFallback,
    setSize,
    getSize: () => currentSize,
    setShape,
    getShape: () => currentShape,
    setStatus,
    getStatus: () => currentStatus,
    destroy,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createNoopState(): AvatarState {
  return {
    getSrc: () => undefined,
    setSrc: () => {},
    setFallback: () => {},
    setSize: () => {},
    getSize: () => 'default',
    setShape: () => {},
    getShape: () => 'circle',
    setStatus: () => {},
    getStatus: () => null,
    destroy: () => {},
  };
}

// ============================================================================
// Avatar Group
// ============================================================================

export interface AvatarGroupOptions {
  /** Maximum visible avatars */
  max?: number;
  /** Size for all avatars */
  size?: AvatarSize;
  /** Spacing between avatars (negative for overlap) */
  spacing?: number;
}

export interface AvatarGroupState {
  /** Get avatar count */
  getCount: () => number;
  /** Set max visible */
  setMax: (max: number) => void;
  /** Get max visible */
  getMax: () => number;
  /** Cleanup resources */
  destroy: () => void;
}

/**
 * Creates an avatar group with stacking/overlap
 *
 * @example
 * ```ts
 * const group = createAvatarGroup(element, {
 *   max: 3,
 *   size: 'sm',
 *   spacing: -8
 * });
 * ```
 */
export function createAvatarGroup(
  element: HTMLElement,
  options: AvatarGroupOptions = {}
): AvatarGroupState {
  if (!isBrowser()) {
    return {
      getCount: () => 0,
      setMax: () => {},
      getMax: () => 0,
      destroy: () => {},
    };
  }

  const { max: initialMax = Infinity, size = 'default', spacing = -8 } = options;

  let currentMax = initialMax;

  function init(): void {
    element.classList.add('atlas-avatar-group');
    element.setAttribute('data-atlas-avatar-group', '');
    element.setAttribute('role', 'group');
    element.style.setProperty('--atlas-avatar-group-spacing', `${spacing}px`);

    updateVisibility();
  }

  function updateVisibility(): void {
    const avatars = element.querySelectorAll('[data-atlas-avatar]');
    let hiddenCount = 0;

    avatars.forEach((avatar, index) => {
      const el = avatar as HTMLElement;
      if (index < currentMax) {
        el.style.display = '';
        el.style.setProperty('--atlas-avatar-index', String(index));
      } else {
        el.style.display = 'none';
        hiddenCount++;
      }
    });

    // Update or create overflow indicator
    let overflow = element.querySelector('.atlas-avatar-overflow') as HTMLElement;

    if (hiddenCount > 0) {
      if (!overflow) {
        overflow = document.createElement('span');
        overflow.className = `atlas-avatar-overflow ${SIZE_CLASSES[size]}`;
        element.appendChild(overflow);
      }
      overflow.textContent = `+${hiddenCount}`;
      overflow.style.display = '';
    } else if (overflow) {
      overflow.style.display = 'none';
    }
  }

  function setMax(max: number): void {
    currentMax = max;
    updateVisibility();
  }

  function destroy(): void {
    element.classList.remove('atlas-avatar-group');
    element.removeAttribute('data-atlas-avatar-group');
    element.removeAttribute('role');
  }

  init();

  return {
    getCount: () => element.querySelectorAll('[data-atlas-avatar]').length,
    setMax,
    getMax: () => currentMax,
    destroy,
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

export function initAvatars(root: Document | HTMLElement = document): AvatarState[] {
  if (!isBrowser()) return [];

  const avatars: AvatarState[] = [];
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas-avatar]');

  elements.forEach((element) => {
    if (element.hasAttribute('data-atlas-avatar-initialized')) return;

    const options: AvatarOptions = {
      src: element.getAttribute('data-src') ?? undefined,
      alt: element.getAttribute('data-alt') ?? undefined,
      fallback: element.getAttribute('data-fallback') ?? undefined,
      size: (element.getAttribute('data-size') as AvatarSize) ?? 'default',
      shape: (element.getAttribute('data-shape') as AvatarShape) ?? 'circle',
      status: (element.getAttribute('data-status') as AvatarStatus | null) ?? null,
      color: element.getAttribute('data-color') ?? undefined,
    };

    const avatar = createAvatar(element, options);
    element.setAttribute('data-atlas-avatar-initialized', '');
    avatars.push(avatar);
  });

  return avatars;
}
