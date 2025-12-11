/**
 * Atlas Auto-Init System
 *
 * Automatically initializes components based on data-atlas attributes.
 * Perfect for SSR, HTMX, and Alpine.js workflows.
 *
 * Usage:
 * <button data-atlas="button" data-ripple data-hover="breathing">Save</button>
 * <div data-atlas="tooltip" data-content="Hello!">Hover me</div>
 */

import { type ButtonOptions, createButton } from '../button/index';
import { isBrowser } from '../shared/dom';
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

export { initButton, initTooltip };
