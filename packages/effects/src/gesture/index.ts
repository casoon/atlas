/**
 * Gesture Recognition System
 *
 * Modern touch/pointer gesture handling:
 * - Swipe (4 directions)
 * - Pinch to zoom
 * - Long press
 * - Pan/drag
 * - Rotation
 * - Double tap
 *
 * @module
 */

import { resolveElement } from '../utils/element';

// ============================================================================
// Types
// ============================================================================

/** Swipe direction */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/** Point coordinates */
export interface Point {
  x: number;
  y: number;
}

/** Gesture state */
export interface GestureState {
  /** Starting point */
  startPoint: Point;
  /** Current point */
  currentPoint: Point;
  /** Delta from start */
  delta: Point;
  /** Distance from start */
  distance: number;
  /** Velocity (pixels per ms) */
  velocity: Point;
  /** Scale factor (for pinch) */
  scale: number;
  /** Rotation angle in degrees (for rotate) */
  rotation: number;
  /** Number of active pointers */
  pointers: number;
  /** Timestamp of gesture start */
  startTime: number;
  /** Current timestamp */
  currentTime: number;
  /** Duration in ms */
  duration: number;
}

/** Swipe event data */
export interface SwipeEvent {
  direction: SwipeDirection;
  velocity: number;
  distance: number;
  duration: number;
}

/** Pinch event data */
export interface PinchEvent {
  scale: number;
  center: Point;
  velocity: number;
}

/** Rotation event data */
export interface RotationEvent {
  angle: number;
  center: Point;
  velocity: number;
}

/** Pan event data */
export interface PanEvent {
  delta: Point;
  position: Point;
  velocity: Point;
}

/** Long press event data */
export interface LongPressEvent {
  position: Point;
  duration: number;
}

/** Gesture options */
export interface GestureOptions {
  /** Enable swipe detection */
  swipe?:
    | boolean
    | {
        /** Minimum distance for swipe in px (default: 50) */
        threshold?: number;
        /** Maximum duration for swipe in ms (default: 300) */
        maxDuration?: number;
        /** Minimum velocity for swipe (default: 0.3) */
        velocity?: number;
      };
  /** Enable pinch/zoom detection */
  pinch?:
    | boolean
    | {
        /** Minimum scale change to trigger (default: 0.1) */
        threshold?: number;
      };
  /** Enable rotation detection */
  rotate?:
    | boolean
    | {
        /** Minimum rotation in degrees (default: 15) */
        threshold?: number;
      };
  /** Enable long press detection */
  longPress?:
    | boolean
    | {
        /** Duration for long press in ms (default: 500) */
        duration?: number;
        /** Maximum movement allowed in px (default: 10) */
        maxMovement?: number;
      };
  /** Enable pan/drag detection */
  pan?:
    | boolean
    | {
        /** Minimum movement to start pan in px (default: 10) */
        threshold?: number;
      };
  /** Enable double tap detection */
  doubleTap?:
    | boolean
    | {
        /** Maximum time between taps in ms (default: 300) */
        maxDelay?: number;
        /** Maximum distance between taps in px (default: 40) */
        maxDistance?: number;
      };
  /** Prevent default touch behavior */
  preventDefault?: boolean;
  /** Stop propagation */
  stopPropagation?: boolean;
  /** Callbacks */
  onSwipe?: (event: SwipeEvent) => void;
  onPinch?: (event: PinchEvent) => void;
  onPinchStart?: (event: PinchEvent) => void;
  onPinchEnd?: (event: PinchEvent) => void;
  onRotate?: (event: RotationEvent) => void;
  onRotateStart?: (event: RotationEvent) => void;
  onRotateEnd?: (event: RotationEvent) => void;
  onLongPress?: (event: LongPressEvent) => void;
  onPan?: (event: PanEvent) => void;
  onPanStart?: (event: PanEvent) => void;
  onPanEnd?: (event: PanEvent) => void;
  onDoubleTap?: (position: Point) => void;
  onTap?: (position: Point) => void;
}

/** Gesture controller */
export interface GestureController {
  /** Enable gesture detection */
  enable: () => void;
  /** Disable gesture detection */
  disable: () => void;
  /** Check if enabled */
  isEnabled: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getCenter(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

function getAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

function getSwipeDirection(delta: Point): SwipeDirection {
  const absX = Math.abs(delta.x);
  const absY = Math.abs(delta.y);

  if (absX > absY) {
    return delta.x > 0 ? 'right' : 'left';
  }
  return delta.y > 0 ? 'down' : 'up';
}

// ============================================================================
// Main Gesture Handler
// ============================================================================

/**
 * Create gesture handler for an element
 *
 * @example
 * ```typescript
 * // Basic swipe detection
 * const gesture = createGesture(element, {
 *   onSwipe: ({ direction, velocity }) => {
 *     console.log(`Swiped ${direction} with velocity ${velocity}`);
 *   }
 * });
 *
 * // Pinch to zoom
 * const gesture = createGesture(element, {
 *   pinch: true,
 *   onPinch: ({ scale, center }) => {
 *     element.style.transform = `scale(${scale})`;
 *   }
 * });
 *
 * // Long press context menu
 * const gesture = createGesture(element, {
 *   longPress: { duration: 600 },
 *   onLongPress: ({ position }) => {
 *     showContextMenu(position);
 *   }
 * });
 *
 * // Cleanup
 * gesture.destroy();
 * ```
 */
export function createGesture(
  target: Element | string,
  options: GestureOptions
): GestureController {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    return {
      enable: () => {},
      disable: () => {},
      isEnabled: () => false,
      destroy: () => {},
    };
  }

  // Normalize options
  const swipeOpts = options.swipe === true ? {} : options.swipe || null;
  const pinchOpts = options.pinch === true ? {} : options.pinch || null;
  const rotateOpts = options.rotate === true ? {} : options.rotate || null;
  const longPressOpts = options.longPress === true ? {} : options.longPress || null;
  const panOpts = options.pan === true ? {} : options.pan || null;
  const doubleTapOpts = options.doubleTap === true ? {} : options.doubleTap || null;

  // State
  let enabled = true;
  const pointers: Map<number, PointerEvent> = new Map();
  const startPoints: Map<number, Point> = new Map();
  const lastPoints: Map<number, Point> = new Map();
  let startTime = 0;
  let lastTime = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTapTime = 0;
  let lastTapPosition: Point | null = null;
  let isPanning = false;
  let isPinching = false;
  let isRotating = false;
  let initialPinchDistance = 0;
  let initialRotationAngle = 0;
  let currentScale = 1;
  let currentRotation = 0;

  // Thresholds
  const swipeThreshold = swipeOpts?.threshold ?? 50;
  const swipeMaxDuration = swipeOpts?.maxDuration ?? 300;
  const swipeVelocity = swipeOpts?.velocity ?? 0.3;
  const pinchThreshold = pinchOpts?.threshold ?? 0.1;
  const rotateThreshold = rotateOpts?.threshold ?? 15;
  const longPressDuration = longPressOpts?.duration ?? 500;
  const longPressMaxMovement = longPressOpts?.maxMovement ?? 10;
  const panThreshold = panOpts?.threshold ?? 10;
  const doubleTapMaxDelay = doubleTapOpts?.maxDelay ?? 300;
  const doubleTapMaxDistance = doubleTapOpts?.maxDistance ?? 40;

  function getPointerPoint(e: PointerEvent): Point {
    return { x: e.clientX, y: e.clientY };
  }

  function clearLongPress(): void {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handlePointerDown(e: PointerEvent): void {
    if (!enabled) return;

    if (options.preventDefault) e.preventDefault();
    if (options.stopPropagation) e.stopPropagation();

    const point = getPointerPoint(e);
    pointers.set(e.pointerId, e);
    startPoints.set(e.pointerId, point);
    lastPoints.set(e.pointerId, point);

    if (pointers.size === 1) {
      startTime = Date.now();
      lastTime = startTime;

      // Long press detection
      if (longPressOpts && options.onLongPress) {
        longPressTimer = setTimeout(() => {
          const currentPoint = lastPoints.get(e.pointerId);
          const startPoint = startPoints.get(e.pointerId);
          if (currentPoint && startPoint) {
            const distance = getDistance(startPoint, currentPoint);
            if (distance <= longPressMaxMovement) {
              options.onLongPress?.({
                position: currentPoint,
                duration: longPressDuration,
              });
            }
          }
        }, longPressDuration);
      }
    }

    // Initialize pinch/rotate
    if (pointers.size === 2) {
      clearLongPress();
      const points = Array.from(lastPoints.values());
      initialPinchDistance = getDistance(points[0], points[1]);
      initialRotationAngle = getAngle(points[0], points[1]);
      currentScale = 1;
      currentRotation = 0;
    }

    (element as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!enabled || !pointers.has(e.pointerId)) return;

    if (options.preventDefault) e.preventDefault();

    const currentPoint = getPointerPoint(e);
    const startPoint = startPoints.get(e.pointerId);
    const previousPoint = lastPoints.get(e.pointerId);

    lastPoints.set(e.pointerId, currentPoint);
    lastTime = Date.now();

    if (!startPoint || !previousPoint) return;

    const delta = {
      x: currentPoint.x - startPoint.x,
      y: currentPoint.y - startPoint.y,
    };
    const distance = getDistance(startPoint, currentPoint);

    // Cancel long press if moved too much
    if (distance > longPressMaxMovement) {
      clearLongPress();
    }

    // Single pointer - pan
    if (pointers.size === 1 && panOpts) {
      if (!isPanning && distance > panThreshold) {
        isPanning = true;
        options.onPanStart?.({
          delta: { x: 0, y: 0 },
          position: startPoint,
          velocity: { x: 0, y: 0 },
        });
      }

      if (isPanning) {
        const timeDelta = Math.max(1, lastTime - startTime);
        options.onPan?.({
          delta,
          position: currentPoint,
          velocity: {
            x: delta.x / timeDelta,
            y: delta.y / timeDelta,
          },
        });
      }
    }

    // Two pointers - pinch/rotate
    if (pointers.size === 2) {
      const points = Array.from(lastPoints.values());
      const currentDistance = getDistance(points[0], points[1]);
      const currentAngle = getAngle(points[0], points[1]);
      const center = getCenter(points[0], points[1]);

      // Pinch
      if (pinchOpts) {
        const newScale = currentDistance / initialPinchDistance;
        const scaleDelta = Math.abs(newScale - currentScale);

        if (!isPinching && scaleDelta > pinchThreshold) {
          isPinching = true;
          options.onPinchStart?.({
            scale: 1,
            center,
            velocity: 0,
          });
        }

        if (isPinching) {
          const timeDelta = Math.max(1, lastTime - startTime);
          currentScale = newScale;
          options.onPinch?.({
            scale: currentScale,
            center,
            velocity: scaleDelta / timeDelta,
          });
        }
      }

      // Rotate
      if (rotateOpts) {
        let angleDelta = currentAngle - initialRotationAngle;
        // Normalize angle
        if (angleDelta > 180) angleDelta -= 360;
        if (angleDelta < -180) angleDelta += 360;

        if (!isRotating && Math.abs(angleDelta) > rotateThreshold) {
          isRotating = true;
          options.onRotateStart?.({
            angle: 0,
            center,
            velocity: 0,
          });
        }

        if (isRotating) {
          const timeDelta = Math.max(1, lastTime - startTime);
          currentRotation = angleDelta;
          options.onRotate?.({
            angle: currentRotation,
            center,
            velocity: Math.abs(angleDelta - currentRotation) / timeDelta,
          });
        }
      }
    }
  }

  function handlePointerUp(e: PointerEvent): void {
    if (!enabled || !pointers.has(e.pointerId)) return;

    const endTime = Date.now();
    const duration = endTime - startTime;
    const startPoint = startPoints.get(e.pointerId);
    const endPoint = lastPoints.get(e.pointerId);

    clearLongPress();

    // Process gestures before cleanup
    if (pointers.size === 1 && startPoint && endPoint) {
      const delta = {
        x: endPoint.x - startPoint.x,
        y: endPoint.y - startPoint.y,
      };
      const distance = getDistance(startPoint, endPoint);

      // Swipe detection
      if (swipeOpts && options.onSwipe) {
        const velocity = distance / duration;
        if (
          distance >= swipeThreshold &&
          duration <= swipeMaxDuration &&
          velocity >= swipeVelocity
        ) {
          options.onSwipe({
            direction: getSwipeDirection(delta),
            velocity,
            distance,
            duration,
          });
        }
      }

      // Tap / Double tap
      if (distance < panThreshold) {
        const now = Date.now();

        // Double tap
        if (
          doubleTapOpts &&
          options.onDoubleTap &&
          lastTapPosition &&
          now - lastTapTime < doubleTapMaxDelay &&
          getDistance(lastTapPosition, endPoint) < doubleTapMaxDistance
        ) {
          options.onDoubleTap(endPoint);
          lastTapTime = 0;
          lastTapPosition = null;
        } else {
          // Single tap
          if (options.onTap && duration < 200) {
            options.onTap(endPoint);
          }
          lastTapTime = now;
          lastTapPosition = endPoint;
        }
      }

      // End pan
      if (isPanning) {
        const timeDelta = Math.max(1, duration);
        options.onPanEnd?.({
          delta,
          position: endPoint,
          velocity: {
            x: delta.x / timeDelta,
            y: delta.y / timeDelta,
          },
        });
        isPanning = false;
      }
    }

    // End pinch/rotate
    if (pointers.size === 2) {
      const points = Array.from(lastPoints.values());
      const center = getCenter(points[0], points[1]);

      if (isPinching) {
        options.onPinchEnd?.({
          scale: currentScale,
          center,
          velocity: 0,
        });
        isPinching = false;
      }

      if (isRotating) {
        options.onRotateEnd?.({
          angle: currentRotation,
          center,
          velocity: 0,
        });
        isRotating = false;
      }
    }

    // Cleanup
    pointers.delete(e.pointerId);
    startPoints.delete(e.pointerId);
    lastPoints.delete(e.pointerId);

    try {
      (element as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Pointer may already be released
    }
  }

  function handlePointerCancel(e: PointerEvent): void {
    clearLongPress();
    pointers.delete(e.pointerId);
    startPoints.delete(e.pointerId);
    lastPoints.delete(e.pointerId);
    isPanning = false;
    isPinching = false;
    isRotating = false;
  }

  // Attach listeners
  element.addEventListener('pointerdown', handlePointerDown as EventListener);
  element.addEventListener('pointermove', handlePointerMove as EventListener);
  element.addEventListener('pointerup', handlePointerUp as EventListener);
  element.addEventListener('pointercancel', handlePointerCancel as EventListener);
  element.addEventListener('pointerleave', handlePointerCancel as EventListener);

  // Prevent context menu on long press (optional)
  const handleContextMenu = (e: Event) => {
    if (options.preventDefault) {
      e.preventDefault();
    }
  };
  element.addEventListener('contextmenu', handleContextMenu);

  // Touch-action for better gesture handling
  (element as HTMLElement).style.touchAction = 'none';

  return {
    enable: () => {
      enabled = true;
    },
    disable: () => {
      enabled = false;
      clearLongPress();
    },
    isEnabled: () => enabled,
    destroy: () => {
      enabled = false;
      clearLongPress();
      element.removeEventListener('pointerdown', handlePointerDown as EventListener);
      element.removeEventListener('pointermove', handlePointerMove as EventListener);
      element.removeEventListener('pointerup', handlePointerUp as EventListener);
      element.removeEventListener('pointercancel', handlePointerCancel as EventListener);
      element.removeEventListener('pointerleave', handlePointerCancel as EventListener);
      element.removeEventListener('contextmenu', handleContextMenu);
      (element as HTMLElement).style.touchAction = '';
    },
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Simple swipe detector
 */
export function onSwipe(
  target: Element | string,
  callback: (direction: SwipeDirection) => void,
  options?: { threshold?: number }
): () => void {
  const gesture = createGesture(target, {
    swipe: { threshold: options?.threshold },
    onSwipe: (e) => callback(e.direction),
  });
  return () => gesture.destroy();
}

/**
 * Simple pinch detector
 */
export function onPinch(target: Element | string, callback: (scale: number) => void): () => void {
  const gesture = createGesture(target, {
    pinch: true,
    onPinch: (e) => callback(e.scale),
  });
  return () => gesture.destroy();
}

/**
 * Simple long press detector
 */
export function onLongPress(
  target: Element | string,
  callback: (position: Point) => void,
  duration?: number
): () => void {
  const gesture = createGesture(target, {
    longPress: { duration },
    onLongPress: (e) => callback(e.position),
  });
  return () => gesture.destroy();
}
