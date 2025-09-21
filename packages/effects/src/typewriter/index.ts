export interface TypewriterOptions {
  texts?: string[];
  speed?: number;
  deleteSpeed?: number;
  pause?: number;
  loop?: boolean;
  cursor?: boolean;
  cursorChar?: string;
}

export function typewriter(target: Element | string, options: TypewriterOptions = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return () => {};

  const { 
    texts = ['Hello World!'], 
    speed = 100, 
    deleteSpeed = 50, 
    pause = 1000, 
    loop = true, 
    cursor = true, 
    cursorChar = '|' 
  } = options;

  let currentTextIndex = 0;
  let currentCharIndex = 0;
  let isDeleting = false;
  let timeoutId: number;

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
      timeoutId = setTimeout(() => { isDeleting = true; updateText(); }, pause);
    } else if (isDeleting && currentCharIndex === 0) {
      isDeleting = false;
      currentTextIndex = loop ? (currentTextIndex + 1) % texts.length : Math.min(currentTextIndex + 1, texts.length - 1);
      timeoutId = setTimeout(updateText, 500);
    }
  };

  updateText();
  return () => clearTimeout(timeoutId);
}