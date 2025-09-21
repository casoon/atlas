# @casoon/atlas-styles

## 0.0.2

### Patch Changes

- Fix CSS imports for better build compatibility

  - Replace relative imports (./core.css) with package-based imports (@casoon/atlas-styles/core)
  - Improves compatibility with Cloudflare Pages and other build environments
  - Uses npm package resolution instead of file system paths for more reliable import resolution
