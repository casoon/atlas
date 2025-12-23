/**
 * Plugin System
 *
 * Extensibility for Atlas components and effects:
 * - Lifecycle hooks (create, update, destroy)
 * - Global state modifications
 * - Telemetry and analytics
 * - Custom behaviors
 *
 * @module
 */

import type { ComponentInstance } from './base';

// ============================================================================
// Types
// ============================================================================

/** Plugin lifecycle hooks */
export interface PluginHooks {
  /** Called when any component is created */
  onComponentCreate?: (instance: ComponentInstance<unknown>, options: unknown) => void;
  /** Called when component state changes */
  onStateChange?: (instance: ComponentInstance<unknown>, state: unknown, prev: unknown) => void;
  /** Called before component is destroyed */
  onComponentDestroy?: (instance: ComponentInstance<unknown>) => void;
  /** Called when an effect is applied */
  onEffectApply?: (element: HTMLElement, effectName: string) => void;
  /** Called when an effect is cleaned up */
  onEffectCleanup?: (element: HTMLElement, effectName: string) => void;
  /** Called on any error */
  onError?: (error: Error, context: ErrorContext) => void;
}

/** Error context */
export interface ErrorContext {
  component?: string;
  effect?: string;
  phase: 'create' | 'update' | 'destroy' | 'effect';
  element?: HTMLElement;
}

/** Plugin definition */
export interface Plugin extends PluginHooks {
  /** Unique plugin name */
  name: string;
  /** Plugin version */
  version?: string;
  /** Plugin dependencies */
  dependencies?: string[];
  /** Called when plugin is registered */
  install?: (atlas: AtlasContext) => void | Promise<void>;
  /** Called when plugin is unregistered */
  uninstall?: () => void;
}

/** Atlas context passed to plugins */
export interface AtlasContext {
  /** Register a global component */
  registerComponent: (name: string, factory: unknown) => void;
  /** Register a global effect */
  registerEffect: (name: string, effect: unknown) => void;
  /** Get configuration */
  getConfig: () => AtlasConfig;
  /** Set configuration */
  setConfig: (config: Partial<AtlasConfig>) => void;
  /** Emit a custom event */
  emit: (event: string, data: unknown) => void;
  /** Listen for custom events */
  on: (event: string, handler: (data: unknown) => void) => () => void;
}

/** Atlas global configuration */
export interface AtlasConfig {
  /** Enable debug mode */
  debug: boolean;
  /** Default animation duration */
  animationDuration: number;
  /** Default easing */
  easing: string;
  /** Respect reduced motion */
  respectReducedMotion: boolean;
  /** Custom CSS prefix */
  cssPrefix: string;
}

// ============================================================================
// Plugin Registry
// ============================================================================

/** Registered plugins */
const plugins = new Map<string, Plugin>();

/** Event listeners */
const listeners = new Map<string, Set<(data: unknown) => void>>();

/** Global config */
let config: AtlasConfig = {
  debug: false,
  animationDuration: 200,
  easing: 'ease',
  respectReducedMotion: true,
  cssPrefix: 'atlas',
};

/** Custom components registry */
const customComponents = new Map<string, unknown>();

/** Custom effects registry */
const customEffects = new Map<string, unknown>();

/** Atlas context for plugins */
const atlasContext: AtlasContext = {
  registerComponent(name: string, factory: unknown): void {
    customComponents.set(name, factory);
  },

  registerEffect(name: string, effect: unknown): void {
    customEffects.set(name, effect);
  },

  getConfig(): AtlasConfig {
    return { ...config };
  },

  setConfig(newConfig: Partial<AtlasConfig>): void {
    config = { ...config, ...newConfig };
  },

  emit(event: string, data: unknown): void {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      for (const handler of eventListeners) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[Atlas Plugin] Error in event handler for "${event}":`, error);
        }
      }
    }
  },

  on(event: string, handler: (data: unknown) => void): () => void {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)?.add(handler);
    return () => {
      listeners.get(event)?.delete(handler);
    };
  },
};

// ============================================================================
// Plugin API
// ============================================================================

/**
 * Register a plugin
 *
 * @example
 * ```typescript
 * // Analytics plugin
 * const analyticsPlugin: Plugin = {
 *   name: 'analytics',
 *   version: '1.0.0',
 *
 *   install(atlas) {
 *     console.log('Analytics plugin installed');
 *   },
 *
 *   onComponentCreate(instance, options) {
 *     trackEvent('component_created', {
 *       component: instance.constructor.name,
 *       options
 *     });
 *   },
 *
 *   onStateChange(instance, state, prev) {
 *     trackEvent('state_changed', { state, prev });
 *   },
 *
 *   onError(error, context) {
 *     trackError(error, context);
 *   }
 * };
 *
 * use(analyticsPlugin);
 * ```
 */
export async function use(plugin: Plugin): Promise<void> {
  // Check if already registered
  if (plugins.has(plugin.name)) {
    console.warn(`[Atlas Plugin] Plugin "${plugin.name}" is already registered`);
    return;
  }

  // Check dependencies
  if (plugin.dependencies) {
    for (const dep of plugin.dependencies) {
      if (!plugins.has(dep)) {
        console.error(
          `[Atlas Plugin] Plugin "${plugin.name}" requires "${dep}" which is not installed`
        );
        return;
      }
    }
  }

  // Register plugin
  plugins.set(plugin.name, plugin);

  // Call install hook
  if (plugin.install) {
    try {
      await plugin.install(atlasContext);
      if (config.debug) {
        console.log(
          `[Atlas Plugin] Installed "${plugin.name}"${plugin.version ? ` v${plugin.version}` : ''}`
        );
      }
    } catch (error) {
      console.error(`[Atlas Plugin] Error installing "${plugin.name}":`, error);
      plugins.delete(plugin.name);
    }
  }
}

/**
 * Unregister a plugin
 */
export function unuse(pluginName: string): void {
  const plugin = plugins.get(pluginName);
  if (!plugin) {
    console.warn(`[Atlas Plugin] Plugin "${pluginName}" is not registered`);
    return;
  }

  // Check if other plugins depend on this one
  for (const [name, p] of plugins) {
    if (p.dependencies?.includes(pluginName)) {
      console.warn(`[Atlas Plugin] Cannot uninstall "${pluginName}", required by "${name}"`);
      return;
    }
  }

  // Call uninstall hook
  if (plugin.uninstall) {
    try {
      plugin.uninstall();
    } catch (error) {
      console.error(`[Atlas Plugin] Error uninstalling "${pluginName}":`, error);
    }
  }

  plugins.delete(pluginName);

  if (config.debug) {
    console.log(`[Atlas Plugin] Uninstalled "${pluginName}"`);
  }
}

/**
 * Get a registered plugin
 */
export function getPlugin(name: string): Plugin | undefined {
  return plugins.get(name);
}

/**
 * Get all registered plugins
 */
export function getPlugins(): Plugin[] {
  return Array.from(plugins.values());
}

/**
 * Check if a plugin is registered
 */
export function hasPlugin(name: string): boolean {
  return plugins.has(name);
}

// ============================================================================
// Hook Triggers (called internally by components/effects)
// ============================================================================

/** Trigger onComponentCreate hook */
export function triggerComponentCreate(
  instance: ComponentInstance<unknown>,
  options: unknown
): void {
  for (const plugin of plugins.values()) {
    if (plugin.onComponentCreate) {
      try {
        plugin.onComponentCreate(instance, options);
      } catch (error) {
        handlePluginError(error as Error, plugin, 'create');
      }
    }
  }
}

/** Trigger onStateChange hook */
export function triggerStateChange(
  instance: ComponentInstance<unknown>,
  state: unknown,
  prev: unknown
): void {
  for (const plugin of plugins.values()) {
    if (plugin.onStateChange) {
      try {
        plugin.onStateChange(instance, state, prev);
      } catch (error) {
        handlePluginError(error as Error, plugin, 'update');
      }
    }
  }
}

/** Trigger onComponentDestroy hook */
export function triggerComponentDestroy(instance: ComponentInstance<unknown>): void {
  for (const plugin of plugins.values()) {
    if (plugin.onComponentDestroy) {
      try {
        plugin.onComponentDestroy(instance);
      } catch (error) {
        handlePluginError(error as Error, plugin, 'destroy');
      }
    }
  }
}

/** Trigger onEffectApply hook */
export function triggerEffectApply(element: HTMLElement, effectName: string): void {
  for (const plugin of plugins.values()) {
    if (plugin.onEffectApply) {
      try {
        plugin.onEffectApply(element, effectName);
      } catch (error) {
        handlePluginError(error as Error, plugin, 'effect');
      }
    }
  }
}

/** Trigger onEffectCleanup hook */
export function triggerEffectCleanup(element: HTMLElement, effectName: string): void {
  for (const plugin of plugins.values()) {
    if (plugin.onEffectCleanup) {
      try {
        plugin.onEffectCleanup(element, effectName);
      } catch (error) {
        handlePluginError(error as Error, plugin, 'effect');
      }
    }
  }
}

/** Handle plugin errors */
function handlePluginError(error: Error, plugin: Plugin, phase: ErrorContext['phase']): void {
  console.error(`[Atlas Plugin] Error in "${plugin.name}" during ${phase}:`, error);

  // Trigger onError hooks in other plugins
  for (const p of plugins.values()) {
    if (p !== plugin && p.onError) {
      try {
        p.onError(error, { phase });
      } catch {
        // Ignore errors in error handlers
      }
    }
  }
}

// ============================================================================
// Built-in Plugins
// ============================================================================

/**
 * Debug plugin - logs all lifecycle events
 *
 * @example
 * ```typescript
 * import { use, debugPlugin } from '@casoon/atlas';
 * use(debugPlugin);
 * ```
 */
export const debugPlugin: Plugin = {
  name: 'debug',
  version: '1.0.0',

  install(atlas) {
    atlas.setConfig({ debug: true });
    console.log('[Atlas Debug] Debug mode enabled');
  },

  onComponentCreate(instance, options) {
    console.log('[Atlas Debug] Component created:', {
      element: instance.element,
      options,
      state: instance.state,
    });
  },

  onStateChange(instance, state, prev) {
    console.log('[Atlas Debug] State changed:', {
      element: instance.element,
      prev,
      next: state,
    });
  },

  onComponentDestroy(instance) {
    console.log('[Atlas Debug] Component destroyed:', instance.element);
  },

  onEffectApply(element, effectName) {
    console.log('[Atlas Debug] Effect applied:', { element, effect: effectName });
  },

  onEffectCleanup(element, effectName) {
    console.log('[Atlas Debug] Effect cleanup:', { element, effect: effectName });
  },

  onError(error, context) {
    console.error('[Atlas Debug] Error:', error, context);
  },
};

/**
 * Performance plugin - tracks performance metrics
 *
 * @example
 * ```typescript
 * import { use, performancePlugin } from '@casoon/atlas';
 * use(performancePlugin);
 *
 * // Get metrics
 * const metrics = performancePlugin.getMetrics();
 * ```
 */
export const performancePlugin: Plugin & {
  getMetrics: () => PerformanceMetrics;
  resetMetrics: () => void;
} = {
  name: 'performance',
  version: '1.0.0',

  install() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      metrics.startTime = performance.now();
    }
  },

  onComponentCreate() {
    metrics.componentsCreated++;
  },

  onComponentDestroy() {
    metrics.componentsDestroyed++;
  },

  onStateChange() {
    metrics.stateChanges++;
  },

  onEffectApply() {
    metrics.effectsApplied++;
  },

  onEffectCleanup() {
    metrics.effectsCleaned++;
  },

  getMetrics() {
    return {
      ...metrics,
      activeComponents: metrics.componentsCreated - metrics.componentsDestroyed,
      activeEffects: metrics.effectsApplied - metrics.effectsCleaned,
      uptime: typeof performance !== 'undefined' ? performance.now() - metrics.startTime : 0,
    };
  },

  resetMetrics() {
    metrics.componentsCreated = 0;
    metrics.componentsDestroyed = 0;
    metrics.stateChanges = 0;
    metrics.effectsApplied = 0;
    metrics.effectsCleaned = 0;
    metrics.startTime = typeof performance !== 'undefined' ? performance.now() : 0;
  },
};

interface PerformanceMetrics {
  componentsCreated: number;
  componentsDestroyed: number;
  stateChanges: number;
  effectsApplied: number;
  effectsCleaned: number;
  startTime: number;
  activeComponents?: number;
  activeEffects?: number;
  uptime?: number;
}

const metrics: PerformanceMetrics = {
  componentsCreated: 0,
  componentsDestroyed: 0,
  stateChanges: 0,
  effectsApplied: 0,
  effectsCleaned: 0,
  startTime: 0,
};

/**
 * Accessibility plugin - adds additional a11y features
 *
 * @example
 * ```typescript
 * import { use, a11yPlugin } from '@casoon/atlas';
 * use(a11yPlugin);
 * ```
 */
export const a11yPlugin: Plugin = {
  name: 'a11y',
  version: '1.0.0',

  install(atlas) {
    // Respect reduced motion by default
    atlas.setConfig({ respectReducedMotion: true });

    // Check for reduced motion preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        atlas.setConfig({ animationDuration: 0 });
      }

      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        atlas.setConfig({
          animationDuration: e.matches ? 0 : 200,
        });
      });
    }
  },

  onComponentCreate(instance) {
    const element = instance.element;
    if (!element) return;

    // Ensure focusable elements have proper attributes
    if (element.getAttribute('role') === 'button' && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  },

  onError(error, context) {
    // Log a11y-related errors
    if (context.phase === 'create' && config.debug) {
      console.warn('[Atlas A11y] Potential accessibility issue:', error.message);
    }
  },
};

// ============================================================================
// Configuration API
// ============================================================================

/**
 * Configure Atlas globally
 *
 * @example
 * ```typescript
 * import { configure } from '@casoon/atlas';
 *
 * configure({
 *   debug: true,
 *   animationDuration: 300,
 *   cssPrefix: 'my-app'
 * });
 * ```
 */
export function configure(options: Partial<AtlasConfig>): void {
  atlasContext.setConfig(options);
}

/**
 * Get current configuration
 */
export function getConfig(): AtlasConfig {
  return atlasContext.getConfig();
}

// ============================================================================
// Custom Components/Effects Registry
// ============================================================================

/**
 * Get a custom registered component
 */
export function getCustomComponent(name: string): unknown {
  return customComponents.get(name);
}

/**
 * Get a custom registered effect
 */
export function getCustomEffect(name: string): unknown {
  return customEffects.get(name);
}
