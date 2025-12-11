/**
 * Atlas UI - Tailwind CSS Preset
 *
 * Use this preset in your tailwind.config.js to get Atlas design tokens
 * as Tailwind utilities.
 *
 * @example
 * // tailwind.config.js
 * import atlasPreset from '@casoon/atlas/tailwind-preset';
 *
 * export default {
 *   presets: [atlasPreset],
 *   // Your customizations...
 * }
 */

/** @type {import('tailwindcss').Config} */
const atlasPreset = {
  theme: {
    extend: {
      // Colors mapped from Atlas tokens
      colors: {
        atlas: {
          primary: {
            DEFAULT: 'var(--atlas-primary)',
            hover: 'var(--atlas-primary-hover)',
            active: 'var(--atlas-primary-active)',
          },
          secondary: {
            DEFAULT: 'var(--atlas-secondary)',
            hover: 'var(--atlas-secondary-hover)',
            active: 'var(--atlas-secondary-active)',
          },
          success: {
            DEFAULT: 'var(--atlas-success)',
            hover: 'var(--atlas-success-hover)',
          },
          warning: {
            DEFAULT: 'var(--atlas-warning)',
            hover: 'var(--atlas-warning-hover)',
          },
          error: {
            DEFAULT: 'var(--atlas-error)',
            hover: 'var(--atlas-error-hover)',
          },
          info: {
            DEFAULT: 'var(--atlas-info)',
            hover: 'var(--atlas-info-hover)',
          },
          gray: {
            50: 'var(--atlas-gray-50)',
            100: 'var(--atlas-gray-100)',
            200: 'var(--atlas-gray-200)',
            300: 'var(--atlas-gray-300)',
            400: 'var(--atlas-gray-400)',
            500: 'var(--atlas-gray-500)',
            600: 'var(--atlas-gray-600)',
            700: 'var(--atlas-gray-700)',
            800: 'var(--atlas-gray-800)',
            900: 'var(--atlas-gray-900)',
            950: 'var(--atlas-gray-950)',
          },
          surface: {
            DEFAULT: 'var(--atlas-surface)',
            hover: 'var(--atlas-surface-hover)',
            active: 'var(--atlas-surface-active)',
          },
          text: {
            DEFAULT: 'var(--atlas-text)',
            muted: 'var(--atlas-text-muted)',
            inverse: 'var(--atlas-text-inverse)',
          },
          border: {
            DEFAULT: 'var(--atlas-border)',
            hover: 'var(--atlas-border-hover)',
            focus: 'var(--atlas-border-focus)',
          },
        },
      },

      // Border radius
      borderRadius: {
        atlas: {
          none: 'var(--atlas-radius-none)',
          sm: 'var(--atlas-radius-sm)',
          md: 'var(--atlas-radius-md)',
          lg: 'var(--atlas-radius-lg)',
          xl: 'var(--atlas-radius-xl)',
          '2xl': 'var(--atlas-radius-2xl)',
          '3xl': 'var(--atlas-radius-3xl)',
          full: 'var(--atlas-radius-full)',
        },
      },

      // Box shadows
      boxShadow: {
        atlas: {
          sm: 'var(--atlas-shadow-sm)',
          md: 'var(--atlas-shadow-md)',
          lg: 'var(--atlas-shadow-lg)',
          xl: 'var(--atlas-shadow-xl)',
          '2xl': 'var(--atlas-shadow-2xl)',
          inner: 'var(--atlas-shadow-inner)',
        },
      },

      // Z-index
      zIndex: {
        dropdown: 'var(--atlas-z-dropdown)',
        sticky: 'var(--atlas-z-sticky)',
        fixed: 'var(--atlas-z-fixed)',
        drawer: 'var(--atlas-z-drawer)',
        modal: 'var(--atlas-z-modal)',
        popover: 'var(--atlas-z-popover)',
        tooltip: 'var(--atlas-z-tooltip)',
        toast: 'var(--atlas-z-toast)',
      },

      // Font family
      fontFamily: {
        atlas: {
          sans: 'var(--atlas-font-sans)',
          serif: 'var(--atlas-font-serif)',
          mono: 'var(--atlas-font-mono)',
        },
      },

      // Transition timing functions
      transitionTimingFunction: {
        'atlas-bounce': 'var(--atlas-ease-bounce)',
        'atlas-spring': 'var(--atlas-ease-spring)',
      },

      // Transition durations
      transitionDuration: {
        'atlas-fast': 'var(--atlas-duration-fast)',
        'atlas-normal': 'var(--atlas-duration-normal)',
        'atlas-slow': 'var(--atlas-duration-slow)',
      },

      // Keyframe animations
      keyframes: {
        'atlas-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'atlas-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'atlas-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'atlas-scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'atlas-slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'atlas-slide-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'atlas-ripple': {
          from: { transform: 'scale(0)', opacity: '0.4' },
          to: { transform: 'scale(4)', opacity: '0' },
        },
      },

      // Animation utilities
      animation: {
        'atlas-spin': 'atlas-spin 1s linear infinite',
        'atlas-pulse': 'atlas-pulse 2s ease-in-out infinite',
        'atlas-fade-in': 'atlas-fade-in var(--atlas-duration-normal) var(--atlas-ease-out)',
        'atlas-scale-in': 'atlas-scale-in var(--atlas-duration-normal) var(--atlas-ease-spring)',
        'atlas-slide-up': 'atlas-slide-up var(--atlas-duration-normal) var(--atlas-ease-spring)',
        'atlas-slide-down':
          'atlas-slide-down var(--atlas-duration-normal) var(--atlas-ease-spring)',
      },
    },
  },

  plugins: [
    // Plugin for micro-interaction utilities
    ({ addUtilities }) => {
      addUtilities({
        // Hover lift effect
        '.atlas-hover-lift': {
          transition:
            'transform var(--atlas-duration-fast) var(--atlas-ease-out), box-shadow var(--atlas-duration-fast) var(--atlas-ease-out)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--atlas-shadow-md)',
          },
        },

        // Hover glow effect
        '.atlas-hover-glow': {
          transition: 'box-shadow var(--atlas-duration-normal) var(--atlas-ease-out)',
          '&:hover': {
            boxShadow: '0 0 20px rgba(var(--atlas-primary-rgb), 0.3)',
          },
        },

        // Hover scale effect
        '.atlas-hover-scale': {
          transition: 'transform var(--atlas-duration-fast) var(--atlas-ease-spring)',
          '&:hover': {
            transform: 'scale(1.02)',
          },
        },

        // Press/active effect
        '.atlas-press': {
          transition: 'transform var(--atlas-duration-fast) var(--atlas-ease-out)',
          '&:active': {
            transform: 'scale(0.97)',
          },
        },

        // Focus ring
        '.atlas-focus-ring': {
          '&:focus-visible': {
            outline: '2px solid var(--atlas-primary)',
            outlineOffset: '2px',
          },
        },
      });
    },
  ],
};

export default atlasPreset;
module.exports = atlasPreset;
