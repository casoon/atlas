import { resolveElement } from '../utils/element';
import { shouldReduceMotion } from '../utils/accessibility';

export interface TextScrambleOptions {
  text?: string;
  chars?: string;
  speed?: number;
  iterations?: number;
  onComplete?: () => void;
}

/**
 * Creates a text scramble effect (Matrix-style).
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the text scramble effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = textScramble('#heading', {
 *   text: 'Welcome to Atlas',
 *   chars: '!<>-_\\/[]{}—=+*^?#________',
 *   speed: 50,
 *   iterations: 8
 * });
 * ```
 */
export function textScramble(
  target: Element | string,
  options: TextScrambleOptions = {}
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas TextScramble] Element not found:', target);
    return () => {};
  }

  const {
    text = element.textContent || '',
    chars = '!<>-_\\/[]{}—=+*^?#________',
    speed = 50,
    iterations = 8,
    onComplete
  } = options;

  // If reduced motion, just set the text immediately
  if (shouldReduceMotion()) {
    element.textContent = text;
    onComplete?.();
    return () => {
      element.textContent = '';
    };
  }

  const originalText = element.textContent || '';
  let frame = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isRunning = true;

  const randomChar = () => chars[Math.floor(Math.random() * chars.length)];

  const scramble = () => {
    if (!isRunning) return;

    let output = '';
    let complete = 0;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        output += ' ';
        complete++;
      } else if (frame >= iterations + i) {
        output += text[i];
        complete++;
      } else {
        output += randomChar();
      }
    }

    element.textContent = output;
    frame++;

    if (complete === text.length) {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      onComplete?.();
    }
  };

  intervalId = setInterval(scramble, speed);

  return () => {
    isRunning = false;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    element.textContent = originalText;
  };
}
