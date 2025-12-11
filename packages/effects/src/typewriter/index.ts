import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';

export interface TypewriterOptions {
  texts?: string[];
  speed?: number;
  deleteSpeed?: number;
  pause?: number;
  loop?: boolean;
  cursor?: boolean;
  cursorChar?: string;
}

/**
 * Creates a typewriter effect that types and deletes text.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the typewriter effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = typewriter('#text', {
 *   texts: ['Hello World!', 'Welcome to Atlas'],
 *   speed: 100,
 *   deleteSpeed: 50,
 *   pause: 1000,
 *   loop: true,
 *   cursor: true,
 *   cursorChar: '|'
 * });
 * ```
 */
export function typewriter(target: Element | string, options: TypewriterOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Typewriter] Element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion (but still show final text)
  const reduceMotion = shouldReduceMotion();

  const {
    texts = ['Hello World!'],
    speed = 100,
    deleteSpeed = 50,
    pause = 1000,
    loop = true,
    cursor = true,
    cursorChar = '|',
  } = options;

  // If reduced motion, just show the first text
  if (reduceMotion) {
    element.textContent = texts[0];
    return () => {
      element.textContent = '';
    };
  }

  let currentTextIndex = 0;
  let currentCharIndex = 0;
  let isDeleting = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const updateText = () => {
    const currentText = texts[currentTextIndex];
    const displayText = isDeleting
      ? currentText.substring(0, currentCharIndex - 1)
      : currentText.substring(0, currentCharIndex + 1);

    element.textContent = displayText + (cursor ? cursorChar : '');

    if (!isDeleting && currentCharIndex < currentText.length) {
      currentCharIndex++;
      timeoutId = setTimeout(updateText, speed);
    } else if (isDeleting && currentCharIndex > 0) {
      currentCharIndex--;
      timeoutId = setTimeout(updateText, deleteSpeed);
    } else if (!isDeleting && currentCharIndex === currentText.length) {
      timeoutId = setTimeout(() => {
        isDeleting = true;
        updateText();
      }, pause);
    } else if (isDeleting && currentCharIndex === 0) {
      isDeleting = false;
      currentTextIndex = loop
        ? (currentTextIndex + 1) % texts.length
        : Math.min(currentTextIndex + 1, texts.length - 1);
      timeoutId = setTimeout(updateText, 500);
    }
  };

  updateText();

  return () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    element.textContent = '';
  };
}
