/**
 * Unified State Management API
 *
 * Provides reactive state management for components:
 * - Immutable state updates
 * - Subscription system
 * - Computed values
 * - State persistence
 * - Undo/redo support
 *
 * @module
 */

// ============================================================================
// Types
// ============================================================================

/** State update function */
export type StateUpdater<T> = (current: T) => Partial<T>;

/** State selector function */
export type StateSelector<T, R> = (state: T) => R;

/** Subscription callback */
export type StateSubscriber<T> = (state: T, prev: T) => void;

/** State store interface */
export interface StateStore<T> {
  /** Get current state */
  get(): T;
  /** Get a specific value from state */
  select<R>(selector: StateSelector<T, R>): R;
  /** Update state with partial object */
  set(patch: Partial<T>): void;
  /** Update state with updater function */
  update(updater: StateUpdater<T>): void;
  /** Subscribe to state changes */
  subscribe(subscriber: StateSubscriber<T>): () => void;
  /** Subscribe to specific value changes */
  watch<R>(selector: StateSelector<T, R>, callback: (value: R, prev: R) => void): () => void;
  /** Reset to initial state */
  reset(): void;
  /** Get state history (if enabled) */
  history(): T[];
  /** Undo last change (if history enabled) */
  undo(): boolean;
  /** Redo last undone change (if history enabled) */
  redo(): boolean;
  /** Destroy store and cleanup */
  destroy(): void;
}

/** Store options */
export interface StateStoreOptions<T> {
  /** Enable state history for undo/redo */
  history?: boolean;
  /** Maximum history length */
  maxHistory?: number;
  /** Persist state to localStorage */
  persist?: string; // localStorage key
  /** Compare function for detecting changes */
  compare?: (a: T, b: T) => boolean;
  /** Middleware functions */
  middleware?: StateMiddleware<T>[];
}

/** Middleware function */
export type StateMiddleware<T> = (state: T, nextState: T, store: StateStore<T>) => T | undefined;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a reactive state store
 *
 * @example
 * ```typescript
 * interface CounterState {
 *   count: number;
 *   step: number;
 * }
 *
 * const store = createStore<CounterState>({
 *   count: 0,
 *   step: 1
 * });
 *
 * // Subscribe to changes
 * store.subscribe((state, prev) => {
 *   console.log(`Count changed from ${prev.count} to ${state.count}`);
 * });
 *
 * // Update state
 * store.set({ count: 5 });
 * store.update(state => ({ count: state.count + state.step }));
 *
 * // Watch specific value
 * store.watch(
 *   state => state.count,
 *   (count, prevCount) => console.log(`Count: ${count}`)
 * );
 *
 * // With history
 * const storeWithHistory = createStore({ count: 0 }, { history: true });
 * storeWithHistory.set({ count: 1 });
 * storeWithHistory.set({ count: 2 });
 * storeWithHistory.undo(); // count = 1
 * storeWithHistory.redo(); // count = 2
 * ```
 */
export function createStore<T extends Record<string, unknown>>(
  initialState: T,
  options: StateStoreOptions<T> = {}
): StateStore<T> {
  const {
    history: enableHistory = false,
    maxHistory = 50,
    persist,
    compare = shallowEqual,
    middleware = [],
  } = options;

  // Load persisted state
  let state: T = initialState;
  if (persist && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(persist);
      if (saved) {
        state = { ...initialState, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parse errors
    }
  }

  // History tracking
  const stateHistory: T[] = enableHistory ? [state] : [];
  let historyIndex = 0;
  const undoneStates: T[] = [];

  // Subscribers
  const subscribers = new Set<StateSubscriber<T>>();
  const watchers = new Map<
    StateSelector<T, unknown>,
    Set<(value: unknown, prev: unknown) => void>
  >();

  // Notify subscribers
  function notify(prev: T): void {
    // Notify general subscribers
    for (const subscriber of subscribers) {
      try {
        subscriber(state, prev);
      } catch (error) {
        console.error('[Atlas State] Error in subscriber:', error);
      }
    }

    // Notify watchers
    for (const [selector, callbacks] of watchers) {
      const prevValue = selector(prev);
      const newValue = selector(state);
      if (prevValue !== newValue) {
        for (const callback of callbacks) {
          try {
            callback(newValue, prevValue);
          } catch (error) {
            console.error('[Atlas State] Error in watcher:', error);
          }
        }
      }
    }
  }

  // Persist state
  function persistState(): void {
    if (persist && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(persist, JSON.stringify(state));
      } catch {
        // Ignore storage errors
      }
    }
  }

  // Apply middleware
  function applyMiddleware(prev: T, next: T): T {
    let result = next;
    for (const mw of middleware) {
      const modified = mw(prev, result, store);
      if (modified !== undefined) {
        result = modified;
      }
    }
    return result;
  }

  const store: StateStore<T> = {
    get(): T {
      return state;
    },

    select<R>(selector: StateSelector<T, R>): R {
      return selector(state);
    },

    set(patch: Partial<T>): void {
      const prev = state;
      let next = { ...state, ...patch };

      // Apply middleware
      next = applyMiddleware(prev, next);

      // Check if actually changed
      if (compare(prev, next)) {
        return;
      }

      state = next;

      // Track history
      if (enableHistory) {
        // Clear redo stack on new change
        undoneStates.length = 0;
        stateHistory.push(state);
        if (stateHistory.length > maxHistory) {
          stateHistory.shift();
        }
        historyIndex = stateHistory.length - 1;
      }

      // Persist
      persistState();

      // Notify
      notify(prev);
    },

    update(updater: StateUpdater<T>): void {
      const patch = updater(state);
      this.set(patch);
    },

    subscribe(subscriber: StateSubscriber<T>): () => void {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },

    watch<R>(selector: StateSelector<T, R>, callback: (value: R, prev: R) => void): () => void {
      if (!watchers.has(selector as StateSelector<T, unknown>)) {
        watchers.set(selector as StateSelector<T, unknown>, new Set());
      }
      const callbacks = watchers.get(selector as StateSelector<T, unknown>);
      if (!callbacks) return () => {};
      callbacks.add(callback as (value: unknown, prev: unknown) => void);

      return () => {
        callbacks.delete(callback as (value: unknown, prev: unknown) => void);
        if (callbacks.size === 0) {
          watchers.delete(selector as StateSelector<T, unknown>);
        }
      };
    },

    reset(): void {
      const prev = state;
      state = initialState;
      if (enableHistory) {
        stateHistory.length = 0;
        stateHistory.push(state);
        historyIndex = 0;
        undoneStates.length = 0;
      }
      persistState();
      notify(prev);
    },

    history(): T[] {
      return [...stateHistory];
    },

    undo(): boolean {
      if (!enableHistory || historyIndex <= 0) {
        return false;
      }

      const prev = state;
      undoneStates.push(state);
      historyIndex--;
      state = stateHistory[historyIndex];
      persistState();
      notify(prev);
      return true;
    },

    redo(): boolean {
      if (!enableHistory || undoneStates.length === 0) {
        return false;
      }

      const prev = state;
      const redoState = undoneStates.pop();
      if (!redoState) return false;
      historyIndex++;
      state = redoState;
      stateHistory[historyIndex] = state;
      persistState();
      notify(prev);
      return true;
    },

    destroy(): void {
      subscribers.clear();
      watchers.clear();
      stateHistory.length = 0;
      undoneStates.length = 0;
    },
  };

  return store;
}

// ============================================================================
// Utility: Shallow Equal
// ============================================================================

/** Shallow equality comparison */
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

// ============================================================================
// Utility: Derived Store
// ============================================================================

/**
 * Create a derived store that computes values from another store
 *
 * @example
 * ```typescript
 * const userStore = createStore({ firstName: 'John', lastName: 'Doe' });
 * const fullNameStore = derivedStore(
 *   userStore,
 *   state => ({ fullName: `${state.firstName} ${state.lastName}` })
 * );
 *
 * fullNameStore.get().fullName; // 'John Doe'
 * ```
 */
export function derivedStore<T extends Record<string, unknown>, R extends Record<string, unknown>>(
  source: StateStore<T>,
  derive: (state: T) => R
): Omit<StateStore<R>, 'set' | 'update' | 'reset' | 'undo' | 'redo'> {
  let derivedState = derive(source.get());
  const subscribers = new Set<StateSubscriber<R>>();

  const unsubscribe = source.subscribe((state, _prev) => {
    const prevDerived = derivedState;
    derivedState = derive(state);

    for (const subscriber of subscribers) {
      subscriber(derivedState, prevDerived);
    }
  });

  return {
    get(): R {
      return derivedState;
    },

    select<S>(selector: StateSelector<R, S>): S {
      return selector(derivedState);
    },

    subscribe(subscriber: StateSubscriber<R>): () => void {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },

    watch<S>(selector: StateSelector<R, S>, callback: (value: S, prev: S) => void): () => void {
      let prevValue = selector(derivedState);
      return this.subscribe((state, _prev) => {
        const newValue = selector(state);
        if (newValue !== prevValue) {
          callback(newValue, prevValue);
          prevValue = newValue;
        }
      });
    },

    history(): R[] {
      return [];
    },

    destroy(): void {
      unsubscribe();
      subscribers.clear();
    },
  };
}

// ============================================================================
// Utility: Combine Stores
// ============================================================================

/**
 * Combine multiple stores into one
 *
 * @example
 * ```typescript
 * const userStore = createStore({ name: 'John' });
 * const settingsStore = createStore({ theme: 'dark' });
 *
 * const combined = combineStores({
 *   user: userStore,
 *   settings: settingsStore
 * });
 *
 * combined.get(); // { user: { name: 'John' }, settings: { theme: 'dark' } }
 * ```
 */
export function combineStores<T extends Record<string, StateStore<Record<string, unknown>>>>(
  stores: T
): Omit<
  StateStore<{ [K in keyof T]: ReturnType<T[K]['get']> }>,
  'set' | 'update' | 'reset' | 'undo' | 'redo'
> {
  type CombinedState = { [K in keyof T]: ReturnType<T[K]['get']> };

  function getCombined(): CombinedState {
    const result = {} as CombinedState;
    for (const key in stores) {
      result[key] = stores[key].get() as ReturnType<T[typeof key]['get']>;
    }
    return result;
  }

  const subscribers = new Set<StateSubscriber<CombinedState>>();
  const unsubscribes: Array<() => void> = [];

  // Subscribe to all stores
  for (const key in stores) {
    const unsub = stores[key].subscribe(() => {
      const state = getCombined();
      for (const subscriber of subscribers) {
        subscriber(state, state); // Note: prev might not be accurate
      }
    });
    unsubscribes.push(unsub);
  }

  return {
    get: getCombined,

    select<R>(selector: StateSelector<CombinedState, R>): R {
      return selector(getCombined());
    },

    subscribe(subscriber: StateSubscriber<CombinedState>): () => void {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },

    watch<R>(
      selector: StateSelector<CombinedState, R>,
      callback: (value: R, prev: R) => void
    ): () => void {
      let prevValue = selector(getCombined());
      return this.subscribe((state) => {
        const newValue = selector(state);
        if (newValue !== prevValue) {
          callback(newValue, prevValue);
          prevValue = newValue;
        }
      });
    },

    history(): CombinedState[] {
      return [];
    },

    destroy(): void {
      unsubscribes.forEach((unsub) => unsub());
      subscribers.clear();
    },
  };
}

// ============================================================================
// Middleware: Logger
// ============================================================================

/**
 * Logging middleware for state changes
 *
 * @example
 * ```typescript
 * const store = createStore({ count: 0 }, {
 *   middleware: [loggerMiddleware('Counter')]
 * });
 * ```
 */
export function loggerMiddleware<T>(name: string): StateMiddleware<T> {
  return (prev, next) => {
    console.group(`[Atlas State] ${name}`);
    console.log('Previous:', prev);
    console.log('Next:', next);
    console.groupEnd();
    return next;
  };
}

// ============================================================================
// Middleware: Validator
// ============================================================================

/**
 * Validation middleware
 *
 * @example
 * ```typescript
 * const store = createStore({ count: 0 }, {
 *   middleware: [
 *     validatorMiddleware({
 *       count: (value) => value >= 0 || 'Count must be non-negative'
 *     })
 *   ]
 * });
 * ```
 */
export function validatorMiddleware<T extends Record<string, unknown>>(
  validators: {
    [K in keyof T]?: (value: T[K]) => true | string;
  }
): StateMiddleware<T> {
  return (_prev, next) => {
    for (const key in validators) {
      const validator = validators[key];
      if (validator && key in next) {
        const result = validator(next[key] as T[typeof key]);
        if (result !== true) {
          console.warn(`[Atlas State] Validation failed for "${key}": ${result}`);
          return undefined; // Reject the update
        }
      }
    }
    return next;
  };
}
