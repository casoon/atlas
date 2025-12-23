/**
 * Base Component System
 *
 * Provides a unified foundation for all Atlas components:
 * - Automatic SSR handling
 * - Event listener management with auto-cleanup
 * - Consistent state management
 * - Lifecycle hooks
 * - Plugin support
 *
 * @module
 */

import { isBrowser } from './dom';

// ============================================================================
// Types
// ============================================================================

/** Base options for factory-created components */
export interface FactoryComponentOptions {
  /** Custom CSS class to add */
  className?: string;
  /** Whether component is initially disabled */
  disabled?: boolean;
  /** Callback when component is destroyed */
  onDestroy?: () => void;
}

/** Event handler type */
export type EventHandler<T = unknown> = (data: T) => void;

/** Event emitter interface */
export interface EventEmitter<TEvents extends Record<string, unknown>> {
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void;
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
}

/** Component instance interface - all components implement this */
export interface ComponentInstance<
  TState,
  TEvents extends Record<string, unknown> = Record<string, never>,
> {
  /** Read-only access to component state */
  readonly state: Readonly<TState>;
  /** The root element */
  readonly element: HTMLElement;
  /** Subscribe to component events */
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  /** Update component state */
  update(patch: Partial<TState>): void;
  /** Destroy and cleanup */
  destroy(): void;
}

/** Lifecycle hooks for components */
export interface ComponentLifecycle<TState> {
  /** Called after initialization */
  onInit?: () => void;
  /** Called before state update */
  onBeforeUpdate?: (current: TState, next: Partial<TState>) => void;
  /** Called after state update */
  onAfterUpdate?: (state: TState) => void;
  /** Called before destroy */
  onBeforeDestroy?: () => void;
  /** Called after destroy */
  onDestroy?: () => void;
}

/** Plugin interface */
export interface ComponentPlugin {
  name: string;
  onComponentCreate?: (instance: unknown, options: unknown) => void;
  onComponentDestroy?: (instance: unknown) => void;
  onStateChange?: (instance: unknown, state: unknown) => void;
}

// ============================================================================
// Plugin Registry
// ============================================================================

const plugins: ComponentPlugin[] = [];

/** Register a global plugin */
export function registerPlugin(plugin: ComponentPlugin): () => void {
  plugins.push(plugin);
  return () => {
    const index = plugins.indexOf(plugin);
    if (index > -1) plugins.splice(index, 1);
  };
}

/** Get all registered plugins */
export function getComponentPlugins(): readonly ComponentPlugin[] {
  return plugins;
}

// ============================================================================
// Event Emitter Implementation
// ============================================================================

/** Create a simple event emitter */
export function createEventEmitter<
  TEvents extends Record<string, unknown>,
>(): EventEmitter<TEvents> {
  const listeners = new Map<keyof TEvents, Set<EventHandler<unknown>>>();

  return {
    on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)?.add(handler as EventHandler<unknown>);
      return () => this.off(event, handler);
    },

    off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
      listeners.get(event)?.delete(handler as EventHandler<unknown>);
    },

    emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
      listeners.get(event)?.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[Atlas] Error in event handler for "${String(event)}":`, error);
        }
      });
    },
  };
}

// ============================================================================
// Base Component Factory
// ============================================================================

/** Options for creating a component with the base factory */
export interface CreateComponentOptions<TOptions, TState, TEvents extends Record<string, unknown>> {
  /** Component name for debugging */
  name: string;
  /** Default options */
  defaults: Required<Omit<TOptions, keyof FactoryComponentOptions>>;
  /** Create initial state from element and options */
  createState: (element: HTMLElement, options: TOptions) => TState;
  /** Setup the component (add listeners, modify DOM, etc.) */
  setup: (context: ComponentContext<TState, TEvents>) => void;
  /** Handle state updates */
  onUpdate?: (context: ComponentContext<TState, TEvents>, prev: TState) => void;
  /** Cleanup function */
  cleanup?: (context: ComponentContext<TState, TEvents>) => void;
  /** Create no-op state for SSR */
  noopState: TState;
}

/** Context passed to component setup and lifecycle functions */
export interface ComponentContext<TState, TEvents extends Record<string, unknown>> {
  /** The root element */
  element: HTMLElement;
  /** Current state (mutable during setup) */
  state: TState;
  /** Merged options */
  options: Record<string, unknown>;
  /** Add an event listener with auto-cleanup */
  on<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void;
  /** Add a generic event listener with auto-cleanup */
  onEvent(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void;
  /** Emit a component event */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  /** Update state */
  setState(patch: Partial<TState>): void;
  /** Schedule cleanup function */
  onCleanup(fn: () => void): void;
  /** Request animation frame with auto-cleanup */
  raf(fn: FrameRequestCallback): number;
  /** Set timeout with auto-cleanup */
  timeout(fn: () => void, ms: number): number;
  /** Set interval with auto-cleanup */
  interval(fn: () => void, ms: number): number;
}

/**
 * Create a component factory with standardized patterns
 *
 * @example
 * ```typescript
 * const createCounter = createComponentFactory({
 *   name: 'counter',
 *   defaults: { initial: 0, step: 1 },
 *   createState: (el, opts) => ({ count: opts.initial ?? 0 }),
 *   setup: (ctx) => {
 *     ctx.on(ctx.element, 'click', () => {
 *       ctx.setState({ count: ctx.state.count + ctx.options.step });
 *     });
 *   },
 *   noopState: { count: 0 }
 * });
 *
 * const counter = createCounter(element, { initial: 5 });
 * counter.state.count; // 5
 * counter.on('change', (state) => console.log(state.count));
 * counter.destroy();
 * ```
 */
export function createComponentFactory<
  TOptions extends FactoryComponentOptions,
  TState,
  TEvents extends Record<string, unknown> = { change: TState; destroy: undefined },
>(
  config: CreateComponentOptions<TOptions, TState, TEvents>
): (element: HTMLElement, options?: Partial<TOptions>) => ComponentInstance<TState, TEvents> {
  const { name: _name, defaults, createState, setup, onUpdate, cleanup, noopState } = config;

  return (
    element: HTMLElement,
    options?: Partial<TOptions>
  ): ComponentInstance<TState, TEvents> => {
    // SSR guard
    if (!isBrowser()) {
      return createNoopInstance(noopState);
    }

    // Merge options with defaults
    const mergedOptions = { ...defaults, ...options } as unknown as TOptions &
      Record<string, unknown>;

    // Create state
    let state = createState(element, mergedOptions);

    // Event emitter
    const emitter = createEventEmitter<TEvents>();

    // Cleanup tracking
    const cleanupFns: (() => void)[] = [];
    const rafIds: number[] = [];
    const timeoutIds: number[] = [];
    const intervalIds: number[] = [];

    // Create context
    const context: ComponentContext<TState, TEvents> = {
      element,
      get state() {
        return state;
      },
      set state(newState: TState) {
        state = newState;
      },
      options: mergedOptions,

      on<K extends keyof HTMLElementEventMap>(
        target: EventTarget,
        event: K,
        handler: (e: HTMLElementEventMap[K]) => void,
        opts?: AddEventListenerOptions
      ): void {
        target.addEventListener(event, handler as EventListener, opts);
        cleanupFns.push(() => target.removeEventListener(event, handler as EventListener, opts));
      },

      onEvent(
        target: EventTarget,
        event: string,
        handler: EventListener,
        opts?: AddEventListenerOptions
      ): void {
        target.addEventListener(event, handler, opts);
        cleanupFns.push(() => target.removeEventListener(event, handler, opts));
      },

      emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
        emitter.emit(event, data);
      },

      setState(patch: Partial<TState>): void {
        const prev = { ...state };
        state = { ...state, ...patch };
        onUpdate?.(context, prev);
        emitter.emit('change' as keyof TEvents, state as TEvents[keyof TEvents]);

        // Notify plugins
        for (const plugin of plugins) {
          plugin.onStateChange?.(instance, state);
        }
      },

      onCleanup(fn: () => void): void {
        cleanupFns.push(fn);
      },

      raf(fn: FrameRequestCallback): number {
        const id = requestAnimationFrame(fn);
        rafIds.push(id);
        return id;
      },

      timeout(fn: () => void, ms: number): number {
        const id = window.setTimeout(fn, ms);
        timeoutIds.push(id);
        return id;
      },

      interval(fn: () => void, ms: number): number {
        const id = window.setInterval(fn, ms);
        intervalIds.push(id);
        return id;
      },
    };

    // Run setup
    setup(context);

    // Apply className if provided
    if (mergedOptions.className) {
      element.classList.add(...(mergedOptions.className as string).split(' '));
    }

    // Create instance
    const instance: ComponentInstance<TState, TEvents> = {
      get state() {
        return state;
      },
      element,

      on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
        return emitter.on(event, handler);
      },

      update(patch: Partial<TState>): void {
        context.setState(patch);
      },

      destroy(): void {
        // Run cleanup
        cleanup?.(context);

        // Cancel animation frames
        rafIds.forEach((id) => cancelAnimationFrame(id));

        // Clear timeouts
        timeoutIds.forEach((id) => clearTimeout(id));

        // Clear intervals
        intervalIds.forEach((id) => clearInterval(id));

        // Run all cleanup functions
        cleanupFns.forEach((fn) => fn());

        // Remove className
        if (mergedOptions.className) {
          element.classList.remove(...(mergedOptions.className as string).split(' '));
        }

        // Emit destroy event
        emitter.emit('destroy' as keyof TEvents, undefined as TEvents[keyof TEvents]);

        // Notify plugins
        for (const plugin of plugins) {
          plugin.onComponentDestroy?.(instance);
        }

        // Call user callback
        (mergedOptions as FactoryComponentOptions).onDestroy?.();
      },
    };

    // Notify plugins
    for (const plugin of plugins) {
      plugin.onComponentCreate?.(instance, mergedOptions);
    }

    return instance;
  };
}

/** Create a no-op instance for SSR */
function createNoopInstance<TState, TEvents extends Record<string, unknown>>(
  state: TState
): ComponentInstance<TState, TEvents> {
  return {
    state,
    element: null as unknown as HTMLElement,
    on: () => () => {},
    update: () => {},
    destroy: () => {},
  };
}

// ============================================================================
// Utility: Component Wrapper
// ============================================================================

/**
 * Wrap an existing create function to add base component features
 * Useful for gradually migrating existing components
 */
export function wrapComponent<TOptions, TState>(
  createFn: (element: HTMLElement, options?: TOptions) => TState,
  getState: (result: TState) => Record<string, unknown>,
  getDestroy: (result: TState) => () => void
): (
  element: HTMLElement,
  options?: TOptions
) => ComponentInstance<
  Record<string, unknown>,
  { change: Record<string, unknown>; destroy: undefined }
> {
  return (element: HTMLElement, options?: TOptions) => {
    if (!isBrowser()) {
      return createNoopInstance<
        Record<string, unknown>,
        { change: Record<string, unknown>; destroy: undefined }
      >({});
    }

    const result = createFn(element, options);
    const emitter = createEventEmitter<{ change: Record<string, unknown>; destroy: undefined }>();
    let state = getState(result);

    return {
      get state() {
        return state;
      },
      element,
      on: emitter.on.bind(emitter),
      update(patch) {
        state = { ...state, ...patch };
        emitter.emit('change', state);
      },
      destroy() {
        getDestroy(result)();
        emitter.emit('destroy', undefined);
      },
    };
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { ComponentInstance as Component };
