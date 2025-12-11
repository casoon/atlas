/**
 * Manages a requestAnimationFrame loop with automatic cleanup.
 *
 * @param callback - The animation callback function
 * @returns A cleanup function to stop the animation
 *
 * @example
 * ```typescript
 * let rotation = 0;
 * const stopAnimation = createAnimationLoop(() => {
 *   rotation += 0.1;
 *   element.style.transform = `rotate(${rotation}rad)`;
 * });
 *
 * // Later, to stop:
 * stopAnimation();
 * ```
 */
export function createAnimationLoop(callback: (deltaTime: number) => void): () => void {
  let animationId: number | null = null;
  let lastTime = performance.now();
  let running = true;

  const animate = (currentTime: number) => {
    if (!running) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    callback(deltaTime);

    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => {
    running = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };
}

/**
 * Creates a managed animation loop that can be paused and resumed.
 *
 * @param callback - The animation callback function
 * @returns An object with pause, resume, and stop methods
 */
export function createControllableAnimationLoop(callback: (deltaTime: number) => void): {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isRunning: () => boolean;
} {
  let animationId: number | null = null;
  let lastTime = performance.now();
  let running = false;
  let stopped = false;

  const animate = (currentTime: number) => {
    if (!running || stopped) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    callback(deltaTime);

    animationId = requestAnimationFrame(animate);
  };

  const pause = () => {
    if (!running || stopped) return;
    running = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  const resume = () => {
    if (running || stopped) return;
    running = true;
    lastTime = performance.now();
    animationId = requestAnimationFrame(animate);
  };

  const stop = () => {
    stopped = true;
    pause();
  };

  const isRunning = () => running && !stopped;

  // Start immediately
  resume();

  return { pause, resume, stop, isRunning };
}

/**
 * Creates a simple animation loop without delta time tracking.
 * Useful for animations that don't need frame-independent timing.
 *
 * @param callback - The animation callback function
 * @returns A cleanup function to stop the animation
 */
export function createSimpleAnimationLoop(callback: () => void): () => void {
  let animationId: number | null = null;
  let running = true;

  const animate = () => {
    if (!running) return;
    callback();
    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => {
    running = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };
}
