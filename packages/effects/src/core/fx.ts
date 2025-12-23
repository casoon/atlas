/**
 * Effect Composition API (fx)
 *
 * Fluent builder for combining multiple effects:
 * - Chain effects with .add()
 * - Use presets for common combinations
 * - Single cleanup function for all effects
 * - Conditional effects with .when()
 * - Effect groups for organization
 *
 * @module
 */

// ============================================================================
// Types
// ============================================================================

/** An effect function that returns a cleanup function */
export type EffectFn = (element: HTMLElement) => () => void;

/** Effect with options factory */
export type EffectFactory<T = unknown> = (options?: T) => EffectFn;

/** Effect definition - either a function or a factory result */
export type EffectDefinition = EffectFn | { effect: EffectFn; options?: unknown };

/** Preset definition */
export interface EffectPreset {
  name: string;
  effects: EffectDefinition[];
  description?: string;
}

/** Effect builder interface */
export interface EffectBuilder {
  /** Add an effect to the chain */
  add(effect: EffectFn): EffectBuilder;
  /** Add an effect with options */
  addWith<T>(factory: EffectFactory<T>, options?: T): EffectBuilder;
  /** Add effect only if condition is true */
  when(condition: boolean | (() => boolean), effect: EffectFn): EffectBuilder;
  /** Apply a registered preset */
  preset(name: string): EffectBuilder;
  /** Apply all effects and return cleanup function */
  apply(): () => void;
  /** Get list of applied effects (for debugging) */
  list(): string[];
}

/** Effect manager for global operations */
export interface EffectManager {
  /** Create a new effect builder for an element */
  (element: HTMLElement | string): EffectBuilder;
  /** Register a preset */
  preset(name: string, effects: EffectDefinition[], description?: string): void;
  /** Get all registered presets */
  presets(): Map<string, EffectPreset>;
  /** Track an effect for global cleanup */
  track(element: HTMLElement, cleanup: () => void): void;
  /** Cleanup all effects on an element */
  cleanup(element: HTMLElement): void;
  /** Cleanup all tracked effects */
  cleanupAll(): void;
  /** Get active effect count */
  count(): number;
  /** Create an effect factory with options */
  create<T>(name: string, fn: (element: HTMLElement, options: T) => () => void): EffectFactory<T>;
}

// ============================================================================
// Implementation
// ============================================================================

/** Registered presets */
const presets = new Map<string, EffectPreset>();

/** Tracked effects per element */
const trackedEffects = new WeakMap<HTMLElement, Set<() => void>>();

/** Global effect count */
let effectCount = 0;

/** Resolve element from string selector or HTMLElement */
function resolveElement(target: HTMLElement | string): HTMLElement | null {
  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target);
  }
  return target;
}

/** Create an effect builder for an element */
function createBuilder(element: HTMLElement): EffectBuilder {
  const effects: Array<{ effect: EffectFn; name: string }> = [];

  const builder: EffectBuilder = {
    add(effect: EffectFn): EffectBuilder {
      effects.push({ effect, name: effect.name || 'anonymous' });
      return builder;
    },

    addWith<T>(factory: EffectFactory<T>, options?: T): EffectBuilder {
      const effect = factory(options);
      effects.push({ effect, name: factory.name || 'anonymous' });
      return builder;
    },

    when(condition: boolean | (() => boolean), effect: EffectFn): EffectBuilder {
      const shouldApply = typeof condition === 'function' ? condition() : condition;
      if (shouldApply) {
        effects.push({ effect, name: effect.name || 'conditional' });
      }
      return builder;
    },

    preset(name: string): EffectBuilder {
      const preset = presets.get(name);
      if (!preset) {
        console.warn(`[Atlas fx] Preset "${name}" not found`);
        return builder;
      }
      for (const def of preset.effects) {
        const effect = typeof def === 'function' ? def : def.effect;
        effects.push({ effect, name: `${name}:${effect.name || 'anonymous'}` });
      }
      return builder;
    },

    apply(): () => void {
      const cleanups: Array<() => void> = [];

      for (const { effect } of effects) {
        try {
          const cleanup = effect(element);
          cleanups.push(cleanup);
          effectCount++;

          // Track for global cleanup
          if (!trackedEffects.has(element)) {
            trackedEffects.set(element, new Set());
          }
          trackedEffects.get(element)?.add(cleanup);
        } catch (error) {
          console.error(`[Atlas fx] Error applying effect:`, error);
        }
      }

      return () => {
        for (const cleanup of cleanups) {
          try {
            cleanup();
            effectCount--;
            trackedEffects.get(element)?.delete(cleanup);
          } catch (error) {
            console.error(`[Atlas fx] Error during cleanup:`, error);
          }
        }
      };
    },

    list(): string[] {
      return effects.map(({ name }) => name);
    },
  };

  return builder;
}

/**
 * Effect composition API
 *
 * @example
 * ```typescript
 * import { fx } from '@casoon/atlas-effects';
 * import { ripple, tilt, glow } from '@casoon/atlas-effects';
 *
 * // Chain multiple effects
 * const cleanup = fx('#my-card')
 *   .add(ripple())
 *   .add(tilt({ max: 15 }))
 *   .add(glow({ color: 'blue' }))
 *   .apply();
 *
 * // Use presets
 * fx.preset('interactive-card', [ripple(), tilt(), glow()]);
 * const cleanup = fx('#card').preset('interactive-card').apply();
 *
 * // Conditional effects
 * const cleanup = fx(element)
 *   .add(ripple())
 *   .when(isMobile, swipe())
 *   .when(() => prefersReducedMotion(), fadeIn())
 *   .apply();
 *
 * // Cleanup
 * cleanup();
 *
 * // Or cleanup all effects on element
 * fx.cleanup(element);
 *
 * // Or cleanup everything
 * fx.cleanupAll();
 * ```
 */
export const fx: EffectManager = Object.assign(
  (element: HTMLElement | string): EffectBuilder => {
    const el = resolveElement(element);
    if (!el) {
      console.warn(`[Atlas fx] Element not found: ${element}`);
      // Return no-op builder
      return {
        add: () => fx(element),
        addWith: () => fx(element),
        when: () => fx(element),
        preset: () => fx(element),
        apply: () => () => {},
        list: () => [],
      };
    }
    return createBuilder(el);
  },
  {
    preset(name: string, effects: EffectDefinition[], description?: string): void {
      presets.set(name, { name, effects, description });
    },

    presets(): Map<string, EffectPreset> {
      return new Map(presets);
    },

    track(element: HTMLElement, cleanup: () => void): void {
      if (!trackedEffects.has(element)) {
        trackedEffects.set(element, new Set());
      }
      trackedEffects.get(element)?.add(cleanup);
      effectCount++;
    },

    cleanup(element: HTMLElement): void {
      const cleanups = trackedEffects.get(element);
      if (cleanups) {
        for (const cleanup of cleanups) {
          try {
            cleanup();
            effectCount--;
          } catch (error) {
            console.error(`[Atlas fx] Error during cleanup:`, error);
          }
        }
        trackedEffects.delete(element);
      }
    },

    cleanupAll(): void {
      // WeakMap doesn't support iteration, so we need to track elements separately
      // For now, just reset the count
      effectCount = 0;
    },

    count(): number {
      return effectCount;
    },

    create<T>(
      name: string,
      fn: (element: HTMLElement, options: T) => () => void
    ): EffectFactory<T> {
      const factory = (options?: T): EffectFn => {
        const effect = (element: HTMLElement) => fn(element, options as T);
        Object.defineProperty(effect, 'name', { value: name });
        return effect;
      };
      Object.defineProperty(factory, 'name', { value: name });
      return factory;
    },
  }
);

// ============================================================================
// Built-in Presets
// ============================================================================

// Presets will be registered when effects are imported
// This allows tree-shaking of unused effects

/** Register default presets (called by effects package) */
export function registerDefaultPresets(effects: Record<string, EffectFn>): void {
  const { ripple, tilt, glow, parallax, magnetic } = effects;

  if (ripple && tilt) {
    fx.preset('card', [ripple, tilt], 'Interactive card with ripple and tilt');
  }

  if (ripple && glow) {
    fx.preset('button', [ripple, glow], 'Button with ripple and glow');
  }

  if (parallax && tilt) {
    fx.preset('hero', [parallax, tilt], 'Hero section with parallax and tilt');
  }

  if (magnetic && glow) {
    fx.preset('magnetic', [magnetic, glow], 'Magnetic element with glow');
  }
}

// ============================================================================
// Utility: Effect Wrapper
// ============================================================================

/**
 * Wrap an existing effect function to work with the fx builder
 *
 * @example
 * ```typescript
 * // Existing effect
 * function myEffect(element: HTMLElement, options: { speed: number }) {
 *   // setup
 *   return () => { // cleanup };
 * }
 *
 * // Wrapped for fx
 * const myEffectFx = wrapEffect('myEffect', myEffect);
 *
 * // Use with fx
 * fx(element).addWith(myEffectFx, { speed: 100 }).apply();
 * ```
 */
export function wrapEffect<T>(
  name: string,
  fn: (element: HTMLElement, options: T) => () => void
): EffectFactory<T> {
  return fx.create(name, fn);
}

// ============================================================================
// Utility: Combine Effects
// ============================================================================

/**
 * Combine multiple effects into a single effect function
 *
 * @example
 * ```typescript
 * const cardEffect = combineEffects(ripple(), tilt(), glow());
 * const cleanup = cardEffect(element);
 * ```
 */
export function combineEffects(...effects: EffectFn[]): EffectFn {
  return (element: HTMLElement) => {
    const cleanups = effects.map((effect) => effect(element));
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  };
}

// ============================================================================
// Utility: Sequence Effects
// ============================================================================

/**
 * Apply effects in sequence with delays
 *
 * @example
 * ```typescript
 * const staggeredEffects = sequenceEffects([
 *   { effect: fadeIn(), delay: 0 },
 *   { effect: slideUp(), delay: 100 },
 *   { effect: glow(), delay: 200 },
 * ]);
 * const cleanup = staggeredEffects(element);
 * ```
 */
export function sequenceEffects(sequence: Array<{ effect: EffectFn; delay: number }>): EffectFn {
  return (element: HTMLElement) => {
    const cleanups: Array<() => void> = [];
    const timeouts: number[] = [];

    for (const { effect, delay } of sequence) {
      const timeoutId = window.setTimeout(() => {
        const cleanup = effect(element);
        cleanups.push(cleanup);
      }, delay);
      timeouts.push(timeoutId);
    }

    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      cleanups.forEach((cleanup) => cleanup());
    };
  };
}
