# CASOON Atlas Changelog

## 0.0.1 (2024-09-21)

### Initial Release

- **@casoon/atlas-styles@0.0.1**: Pure CSS design system with glass effects, gradients, and utilities
- **@casoon/atlas-effects@0.0.1**: 13+ interactive JavaScript effects (SSR-safe, tree-shakeable)
- **@casoon/atlas-components@0.0.1**: Headless UI components (framework-agnostic)
- **@casoon/atlas@0.0.1**: Meta-package that re-exports all TypeScript modules

#### Features

- ✨ Complete monorepo structure with pnpm workspace
- ✨ Tailwind v4 compatible CSS design system  
- ✨ SSR-safe effects with cleanup functions
- ✨ Framework-agnostic headless components
- ✨ Tree-shaking optimized with subpath exports
- ✨ Interactive demo application
- ✨ Comprehensive TypeScript support
- ✨ Build system with tsup
- ✨ Development tooling (ESLint, Prettier, EditorConfig)
- ✨ Changesets for release management

#### Package Details

##### @casoon/atlas-styles
- Glass effects with backdrop-filter support
- Orb animations and utilities  
- Core CSS utilities and animations
- Tailwind v4 `@theme` and `@utility` directives
- CSS custom properties for theming

##### @casoon/atlas-effects
- `ripple` - Interactive click/touch ripple animations
- `tilt` - 3D tilt effect with realistic physics and glare
- `particles` - Configurable particle systems with connections
- `orbs` - Floating animated orb particles with physics
- `parallax` - Scroll-based parallax movement effects
- `glassEffects` - Interactive glassmorphism with dynamic blur
- `scrollReveal` - Elements animate in as they enter viewport
- `cursorFollow` - Elements that follow mouse movement
- `magnetic` - Elements attracted to cursor with magnetic fields
- `glow` - Dynamic glow and lighting effects
- `morphing` - Shape and border-radius morphing animations
- `wave` - Sine wave movement animations
- `typewriter` - Animated text typing with cursor

##### @casoon/atlas-components
- Modal, Dropdown, Tabs, Accordion
- Tooltip, Toast, Drawer, Card
- Form, Button components
- Accessibility-focused with ARIA support
- Focus management and keyboard navigation