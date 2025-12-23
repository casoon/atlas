# @casoon/atlas-styles

## 0.1.0

### Minor Changes

- feat: add comprehensive CSS styles for new components
  - Add recipes.css with component recipes
  - Add tokens.css with design tokens
  - Expand components.css with styles for 40+ components
  - Add CSS custom properties for inline style usage

## 0.0.6

### Patch Changes

- Add 8 new interactive effects and improve project configuration
  - Add spotlight effect with customizable size and blur
  - Add text-scramble effect with character randomization
  - Add glitch effect with RGB channel splitting
  - Add shimmer effect with animated highlights
  - Add noise effect with canvas-based grain
  - Add confetti effect with physics-based particles
  - Add skeleton loading effect with shimmer animation
  - Add progress-ring effect with circular progress indicator
  - Configure Volta to pin Node.js 24.11.0 and pnpm 9.15.4
  - Consolidate documentation from WARP.md to .claude file
  - Add comprehensive build commands and package details

## 0.0.4

### Patch Changes

- Add deep path exports for maximum build system compatibility
  - Added explicit deep path exports with /dist/ prefix for all CSS files
  - Users can now import using both short and deep path syntax
  - Explicit index.css deep path export added
  - Enhanced compatibility with various build systems and bundlers
  - Maintains full backward compatibility with existing imports

## 0.0.3

### Patch Changes

- Generate flat combined CSS and improve Tailwind compatibility
  - Generate flat index.css with all CSS content combined (no @import statements)
  - Add .css extension to all subpath exports for better Tailwind compatibility
  - Individual CSS files remain available for granular imports
  - Automated build process ensures consistency
  - Better compatibility across all build systems and CDNs

## 0.0.2

### Patch Changes

- Fix CSS imports for better build compatibility
  - Replace relative imports (./core.css) with package-based imports (@casoon/atlas-styles/core)
  - Improves compatibility with Cloudflare Pages and other build environments
  - Uses npm package resolution instead of file system paths for more reliable import resolution
