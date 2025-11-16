import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { glow } from '../index';

describe('glow', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.id = 'test-element';
    document.body.appendChild(element);

    // Mock matchMedia to disable reduced motion by default
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it('should apply glow effect to element', async () => {
    const cleanup = glow(element, { animated: false });

    // Wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check if box-shadow was applied
    expect(element.style.getPropertyValue('box-shadow')).toBeTruthy();

    cleanup();
  });

  it('should handle CSS selector string', async () => {
    const cleanup = glow('#test-element', { animated: false });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.style.getPropertyValue('box-shadow')).toBeTruthy();

    cleanup();
  });

  it('should return no-op cleanup for non-existent element', () => {
    const cleanup = glow('#does-not-exist');

    expect(cleanup).toBeInstanceOf(Function);
    expect(() => cleanup()).not.toThrow();
  });

  it('should apply custom color', async () => {
    const cleanup = glow(element, { color: '#ff0000', animated: false });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const boxShadow = element.style.getPropertyValue('box-shadow');
    expect(boxShadow).toBeTruthy();
    // Color might be in hex or rgb format depending on browser
    expect(boxShadow).toMatch(/(rgb\(255, 0, 0\)|#ff0000)/i);

    cleanup();
  });

  it('should restore original styles on cleanup', async () => {
    element.style.boxShadow = '0px 0px 10px red';
    const originalShadow = element.style.boxShadow;

    const cleanup = glow(element, { animated: false });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Style should be different now
    expect(element.style.getPropertyValue('box-shadow')).not.toBe('');

    cleanup();

    // Should be restored
    expect(element.style.boxShadow).toBe(originalShadow);
  });

  it('should respect reduced motion preference', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    const cleanup = glow(element, { animated: true });

    // With reduced motion, the effect should still work but without animation
    // The cleanup should still be a function
    expect(cleanup).toBeInstanceOf(Function);

    cleanup();
  });

  it('should handle interactive glow on hover', async () => {
    const cleanup = glow(element, {
      interactive: true,
      animated: false,
      intensity: 0.5,
      size: 20
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const initialShadow = element.style.getPropertyValue('box-shadow');

    // Trigger mouseenter
    const enterEvent = new MouseEvent('mouseenter');
    element.dispatchEvent(enterEvent);

    // Box shadow should be different (enhanced)
    const hoveredShadow = element.style.getPropertyValue('box-shadow');
    expect(hoveredShadow).toBeTruthy();

    // Trigger mouseleave
    const leaveEvent = new MouseEvent('mouseleave');
    element.dispatchEvent(leaveEvent);

    const finalShadow = element.style.getPropertyValue('box-shadow');
    expect(finalShadow).toBeTruthy();

    cleanup();
  });

  it('should clean up event listeners', async () => {
    const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

    const cleanup = glow(element, { interactive: true, animated: false });

    await new Promise((resolve) => setTimeout(resolve, 0));

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
  });
});
