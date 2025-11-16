# Contributing to CASOON Atlas

Thank you for your interest in contributing to CASOON Atlas! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and considerate in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/atlas.git
   cd atlas
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/casoon/atlas.git
   ```

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the demo
pnpm --filter demo dev
```

### Available Scripts

- `pnpm build` - Build all packages
- `pnpm dev` - Start development mode with watch
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests (when available)
- `pnpm typecheck` - Run TypeScript type checking

## Project Structure

```
atlas/
├── packages/
│   ├── styles/          # Pure CSS styles (glass, animations, core utilities)
│   ├── effects/         # JavaScript visual effects
│   ├── components/      # Headless UI components
│   └── all/             # Meta-package re-exporting everything
├── demo/                # Demo application
└── documentation/       # Project documentation
```

### Package Dependencies

- `@casoon/atlas-styles` - No dependencies (pure CSS)
- `@casoon/atlas-effects` - Framework-agnostic JavaScript effects
- `@casoon/atlas-components` - Headless components for any framework
- `@casoon/atlas` - Combines all packages

## Development Workflow

### Creating a New Effect

1. Create a new directory in `packages/effects/src/`
2. Implement the effect in `index.ts`
3. Use shared utilities from `packages/effects/src/utils/`
4. Export from `packages/effects/src/index.ts`
5. Add documentation and examples
6. Write tests

### Creating a New Component

1. Create a new directory in `packages/components/src/`
2. Implement the component as a headless state manager
3. Include subscription mechanism for reactivity
4. Add proper TypeScript types
5. Export from `packages/components/src/index.ts`
6. Add documentation and examples
7. Write tests

### Adding New Styles

1. Add styles to appropriate file in `packages/styles/src/`
2. Follow Tailwind v4 utility pattern
3. Use `@utility` directive for reusable utilities
4. Ensure responsive and accessibility support
5. Document usage in comments

## Coding Standards

### TypeScript

- **Use TypeScript** for all JavaScript code
- **Enable strict mode** - no `any` types without good reason
- **Export all public interfaces** and types
- **Use generics** where appropriate for type safety
- **Document with JSDoc** comments

### Code Style

```typescript
// ✅ Good - Typed, documented, uses shared utilities
import { resolveElement } from '../utils/element';
import { shouldReduceMotion } from '../utils/accessibility';

/**
 * Creates a visual effect on an element.
 *
 * @param target - CSS selector or HTMLElement
 * @param options - Configuration options
 * @returns Cleanup function
 */
export function myEffect(
  target: string | HTMLElement,
  options: MyEffectOptions = {}
): () => void {
  const element = resolveElement(target);
  if (!element) {
    console.warn('[Atlas MyEffect] Element not found:', target);
    return () => {};
  }

  if (shouldReduceMotion()) {
    return () => {};
  }

  // Implementation...

  return () => {
    // Cleanup...
  };
}

// ❌ Bad - No types, no error handling, direct DOM manipulation
export function myEffect(target, options) {
  const el = document.querySelector(target);
  el.style.color = 'red'; // Will throw if el is null
}
```

### Shared Utilities

Always use shared utilities from `packages/effects/src/utils/`:

- **Element selection**: `resolveElement()`, `isValidElement()`
- **Animation**: `createAnimationLoop()`, `createSimpleAnimationLoop()`
- **Styles**: `createStyleManager()`, `ensurePositioned()`
- **Performance**: `throttle()`, `debounce()`, `rafThrottle()`
- **Accessibility**: `shouldReduceMotion()`, `announceToScreenReader()`

### Accessibility Requirements

- **Check `prefers-reduced-motion`** for all animations
- **Use proper ARIA attributes** in components
- **Ensure keyboard navigation** works
- **Support screen readers** where applicable
- **Maintain focus management**

### Error Handling

- **Validate inputs** at function entry
- **Use console.warn** for non-critical issues
- **Throw errors** for critical failures
- **Always return cleanup functions** (even if no-op)

### Memory Management

- **Cancel all timers** and animation frames in cleanup
- **Remove all event listeners** in cleanup
- **Clear all subscriptions** in cleanup
- **Remove DOM elements** created by effects

## Testing Guidelines

### Writing Tests

Tests should cover:

1. **Happy path** - normal usage
2. **Edge cases** - null/undefined inputs, empty arrays, etc.
3. **Error cases** - invalid inputs, missing elements
4. **Cleanup** - verify cleanup functions work correctly
5. **Accessibility** - reduced motion, ARIA attributes
6. **Memory leaks** - verify timers and listeners are cleaned up

Example test structure:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { myEffect } from './index';

describe('myEffect', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('should apply effect to element', () => {
    const cleanup = myEffect(element);
    expect(element.style.someProperty).toBe('expectedValue');
    cleanup();
  });

  it('should handle null element gracefully', () => {
    const cleanup = myEffect(null as any);
    expect(cleanup).toBeInstanceOf(Function);
  });

  it('should respect prefers-reduced-motion', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia');
    matchMedia.mockReturnValue({ matches: true } as any);

    const cleanup = myEffect(element);
    // Verify animation is not applied

    cleanup();
  });
});
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```bash
feat(effects): add magnetic cursor effect
fix(components): resolve tabs state management issue
docs(readme): update installation instructions
refactor(effects): extract shared utilities
test(components): add accordion tests
```

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   pnpm build
   pnpm test
   pnpm typecheck
   ```

4. **Commit your changes** using conventional commits

5. **Push to your fork**:
   ```bash
   git push origin feat/my-new-feature
   ```

6. **Open a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to related issues (if any)
   - Screenshots/demos for visual changes
   - Test coverage summary

### PR Checklist

- [ ] Code follows project coding standards
- [ ] All tests pass
- [ ] New code has tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] No breaking changes (or clearly documented)
- [ ] Accessibility requirements met
- [ ] TypeScript types are correct
- [ ] Memory leaks are prevented

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Description** of the issue
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Environment** (browser, Node version, etc.)
- **Code sample** (if applicable)
- **Screenshots** (if applicable)

### Feature Requests

When requesting features, please include:

- **Use case** - why is this needed?
- **Proposed solution** - how should it work?
- **Alternatives considered**
- **Examples** from other libraries (if applicable)

## Questions?

If you have questions:

- Check the [documentation](./README.md)
- Search [existing issues](https://github.com/casoon/atlas/issues)
- Open a [new issue](https://github.com/casoon/atlas/issues/new)

Thank you for contributing to CASOON Atlas! 🎉
