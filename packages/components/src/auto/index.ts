/**
 * Atlas Auto-Init System
 *
 * Automatically initializes components based on data-atlas attributes.
 * Perfect for SSR, HTMX, and Alpine.js workflows.
 *
 * Usage:
 * <button data-atlas="button" data-ripple data-hover="breathing">Save</button>
 * <div data-atlas="card" data-hover="lift" data-tilt>Card content</div>
 * <input data-atlas="input" data-focus-glow />
 * <div data-atlas="grid" data-stagger="50">Grid items...</div>
 */

import { type ButtonOptions, createButton } from '../button/index';
import { type CardOptions, createCard } from '../card/index';
import { addListener, isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';
import { createTooltip, type TooltipOptions } from '../tooltip/index';

const initialized = new WeakSet<Element>();
const cleanupMap = new WeakMap<Element, () => void>();

function parseBool(value: string | null): boolean {
  return value !== null && value !== 'false';
}

function initElement(element: HTMLElement): void {
  if (initialized.has(element)) return;

  const type = element.dataset.atlas;
  if (!type) return;

  let cleanup: (() => void) | undefined;

  switch (type) {
    case 'button':
      cleanup = initButton(element);
      break;
    case 'tooltip':
      cleanup = initTooltip(element);
      break;
    case 'card':
      cleanup = initCard(element);
      break;
    case 'input':
      cleanup = initInput(element);
      break;
    case 'grid':
      cleanup = initGrid(element);
      break;
  }

  if (cleanup) {
    initialized.add(element);
    cleanupMap.set(element, cleanup);
  }
}

function initButton(element: HTMLElement): () => void {
  const options: ButtonOptions = {
    ripple: parseBool(element.dataset.ripple ?? 'true'),
    hover: (element.dataset.hover as ButtonOptions['hover']) || 'breathing',
    haptic: parseBool(element.dataset.haptic ?? 'true'),
    pressScale: element.dataset.pressScale ? parseFloat(element.dataset.pressScale) : undefined,
  };

  const button = createButton(element, options);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-loading') {
        button.setLoading(parseBool(element.dataset.loading ?? null));
      }
      if (mutation.attributeName === 'data-disabled' || mutation.attributeName === 'disabled') {
        button.setDisabled(
          parseBool(element.dataset.disabled ?? null) || element.hasAttribute('disabled')
        );
      }
    }
  });

  observer.observe(element, { attributes: true });

  return () => {
    observer.disconnect();
    button.destroy();
  };
}

function initTooltip(element: HTMLElement): () => void {
  const options: TooltipOptions = {
    content: element.dataset.content || element.getAttribute('title') || '',
    placement: (element.dataset.placement as TooltipOptions['placement']) || 'top',
    delay: element.dataset.delay ? parseInt(element.dataset.delay, 10) : 500,
    trigger: (element.dataset.trigger as TooltipOptions['trigger']) || 'hover',
  };

  if (element.hasAttribute('title')) {
    element.removeAttribute('title');
  }

  const tooltip = createTooltip(element, options);
  return () => tooltip.destroy();
}

function initCard(element: HTMLElement): () => void {
  const options: CardOptions = {
    hover: (element.dataset.hover as CardOptions['hover']) || 'lift',
    tilt: parseBool(element.dataset.tilt ?? null),
    tiltMax: element.dataset.tiltMax ? parseFloat(element.dataset.tiltMax) : 10,
    shine: parseBool(element.dataset.shine ?? null),
    liftDistance: element.dataset.liftDistance
      ? parseFloat(element.dataset.liftDistance)
      : undefined,
    clickable: parseBool(element.dataset.clickable ?? 'true'),
  };

  const card = createCard(element, options);

  // Auto animate-in if data-animate is set
  if (parseBool(element.dataset.animate ?? null)) {
    const delay = element.dataset.delay ? parseInt(element.dataset.delay, 10) : 0;
    card.animateIn(delay);
  }

  return () => card.destroy();
}

/**
 * Input micro-transitions
 * - Focus glow effect
 * - Label float animation
 * - Error shake
 * - Success check
 */
function initInput(element: HTMLElement): () => void {
  const input = element as HTMLInputElement | HTMLTextAreaElement;
  const cleanups: (() => void)[] = [];

  // Store original styles
  const originalTransition = input.style.transition;
  const originalBoxShadow = input.style.boxShadow;
  const originalBorderColor = input.style.borderColor;

  // Apply base transition
  input.style.transition = `
    box-shadow ${ANIMATION_DURATION.fast}ms ${EASING.standard},
    border-color ${ANIMATION_DURATION.fast}ms ${EASING.standard},
    transform ${ANIMATION_DURATION.fast}ms ${EASING.standard}
  `
    .replace(/\s+/g, ' ')
    .trim();

  // Focus glow
  if (parseBool(input.dataset.focusGlow ?? 'true')) {
    const glowColor = input.dataset.glowColor || 'rgba(59, 130, 246, 0.5)';

    const handleFocus = () => {
      input.style.boxShadow = `0 0 0 3px ${glowColor}`;
      input.style.borderColor = 'rgba(59, 130, 246, 0.8)';
    };

    const handleBlur = () => {
      if (!input.dataset.error) {
        input.style.boxShadow = originalBoxShadow || '';
        input.style.borderColor = originalBorderColor || '';
      }
    };

    cleanups.push(addListener(input, 'focus', handleFocus));
    cleanups.push(addListener(input, 'blur', handleBlur));
  }

  // Watch for error state changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-error') {
        if (parseBool(input.dataset.error ?? null)) {
          // Error shake animation
          input.style.borderColor = 'rgba(239, 68, 68, 0.8)';
          input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.3)';

          if (input.animate) {
            input.animate(
              [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-4px)' },
                { transform: 'translateX(4px)' },
                { transform: 'translateX(-4px)' },
                { transform: 'translateX(4px)' },
                { transform: 'translateX(0)' },
              ],
              {
                duration: 400,
                easing: 'ease-in-out',
              }
            );
          }
        } else {
          input.style.borderColor = originalBorderColor || '';
          input.style.boxShadow = originalBoxShadow || '';
        }
      }

      if (mutation.attributeName === 'data-success') {
        if (parseBool(input.dataset.success ?? null)) {
          input.style.borderColor = 'rgba(34, 197, 94, 0.8)';
          input.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.3)';

          // Brief pulse
          if (input.animate) {
            input.animate(
              [{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }],
              {
                duration: 200,
                easing: EASING.bounce,
              }
            );
          }
        }
      }
    }
  });

  observer.observe(input, { attributes: true });

  return () => {
    observer.disconnect();
    cleanups.forEach((fn) => fn());
    input.style.transition = originalTransition;
    input.style.boxShadow = originalBoxShadow;
    input.style.borderColor = originalBorderColor;
  };
}

/**
 * Grid with stagger animation for children
 */
function initGrid(element: HTMLElement): () => void {
  const staggerDelay = element.dataset.stagger ? parseInt(element.dataset.stagger, 10) : 50;
  const initialDelay = element.dataset.initialDelay
    ? parseInt(element.dataset.initialDelay, 10)
    : 0;
  const animateOnScroll = parseBool(element.dataset.animateOnScroll ?? null);

  const children = Array.from(element.children) as HTMLElement[];

  // Prepare children for animation
  children.forEach((child) => {
    child.style.opacity = '0';
    child.style.transform = 'translateY(20px)';
    child.style.transition = `
      opacity ${ANIMATION_DURATION.normal}ms ${EASING.decelerate},
      transform ${ANIMATION_DURATION.normal}ms ${EASING.spring}
    `
      .replace(/\s+/g, ' ')
      .trim();
  });

  const animateChildren = () => {
    children.forEach((child, index) => {
      setTimeout(
        () => {
          child.style.opacity = '1';
          child.style.transform = 'translateY(0)';
        },
        initialDelay + index * staggerDelay
      );
    });
  };

  let intersectionObserver: IntersectionObserver | null = null;

  if (animateOnScroll) {
    // Use IntersectionObserver for scroll-triggered animation
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateChildren();
            intersectionObserver?.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    intersectionObserver.observe(element);
  } else {
    // Animate immediately
    requestAnimationFrame(() => {
      animateChildren();
    });
  }

  return () => {
    intersectionObserver?.disconnect();
    children.forEach((child) => {
      child.style.opacity = '';
      child.style.transform = '';
      child.style.transition = '';
    });
  };
}

function destroyElement(element: Element): void {
  const cleanup = cleanupMap.get(element);
  if (cleanup) {
    cleanup();
    cleanupMap.delete(element);
    initialized.delete(element);
  }
}

function initAll(root: Element | Document = document): void {
  const elements = root.querySelectorAll<HTMLElement>('[data-atlas]');
  elements.forEach(initElement);
}

let observer: MutationObserver | null = null;

function startObserver(): void {
  if (!isBrowser() || observer) return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.dataset.atlas) initElement(node);
          node.querySelectorAll<HTMLElement>('[data-atlas]').forEach(initElement);
        }
      }
      for (const node of mutation.removedNodes) {
        if (node instanceof HTMLElement) {
          if (initialized.has(node)) destroyElement(node);
          node.querySelectorAll<HTMLElement>('[data-atlas]').forEach(destroyElement);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export function atlasInit(): void {
  if (!isBrowser()) return;
  initAll();
  startObserver();
}

export function atlasDestroy(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  document.querySelectorAll<HTMLElement>('[data-atlas]').forEach(destroyElement);
}

export function atlasInitElement(element: HTMLElement): void {
  if (element.dataset.atlas) initElement(element);
  initAll(element);
}

if (isBrowser()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', atlasInit);
  } else {
    atlasInit();
  }
  document.addEventListener('astro:page-load', atlasInit);
}

export { initButton, initTooltip, initCard, initInput, initGrid };
