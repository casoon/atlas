# @casoon/atlas-styles

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
