# Flexbox Text Overflow Guide

A comprehensive guide to preventing text overflow issues in flexbox layouts using Atlas Styles utilities.

---

## The Flexbox Shrinking Bug

### The Problem

Flex items have an implicit **`min-width: auto`** (or `min-height: auto` for column layouts), which prevents them from shrinking below their content's intrinsic size. This causes text to overflow instead of wrapping or truncating.

### Visual Example

```
Without min-width: 0:
┌─────────────────────────────────────┐
│ Flex Container                      │
├─────────────────────────────────────┤
│ ┌──────────────────────────────┐   │
│ │ This is a very long title tha│t o│verflows!
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
      ↑ Text breaks out of container

With min-width: 0:
┌─────────────────────────────────────┐
│ Flex Container                      │
├─────────────────────────────────────┤
│ ┌──────────────────────────────┐   │
│ │ This is a very long title... │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
      ↑ Text truncates properly
```

---

## Atlas Styles Solutions

### 1. Single-Line Truncation: `cs-truncate`

Truncates text to a single line with ellipsis.

**CSS:**
```css
@utility cs-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0; /* Required for flex items */
}
```

**Usage:**
```html
<div class="flex gap-4">
  <img src="avatar.jpg" class="w-12 h-12" />
  <div class="flex-1">
    <h3 class="cs-truncate">This is a very long title that will be truncated</h3>
    <p class="text-sm">Subtitle</p>
  </div>
</div>
```

**Result:**
```
┌────────────────────────────────────┐
│ [IMG] This is a very long title... │
│       Subtitle                      │
└────────────────────────────────────┘
```

---

### 2. Multi-Line Clamping: `cs-line-clamp-{n}`

Limits text to a specific number of lines with ellipsis.

**Available Utilities:**
- `cs-line-clamp-1` - Single line (same as cs-truncate but with line-clamp)
- `cs-line-clamp-2` - Two lines
- `cs-line-clamp-3` - Three lines
- `cs-line-clamp-4` - Four lines

**CSS:**
```css
@utility cs-line-clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  min-width: 0; /* Required for flex items */
}
```

**Usage:**
```html
<div class="flex gap-4">
  <img src="thumbnail.jpg" class="w-32 h-32" />
  <div class="flex-1">
    <h3 class="font-bold">Product Title</h3>
    <p class="cs-line-clamp-3">
      This is a long product description that might span multiple lines.
      It will be clamped to exactly 3 lines with an ellipsis at the end
      if the content is longer than that.
    </p>
  </div>
</div>
```

**Result:**
```
┌────────────────────────────────────┐
│ [    ]  Product Title              │
│ [IMG ]  This is a long product     │
│ [    ]  description that might span│
│         multiple lines. It will... │
└────────────────────────────────────┘
```

---

### 3. Explicit Flex Fix: `cs-flex-shrink`

For cases where you need text wrapping (not truncation) but still want the flex item to shrink.

**CSS:**
```css
@utility cs-flex-shrink {
  min-width: 0;
  flex-shrink: 1;
}
```

**Usage:**
```html
<div class="flex gap-4">
  <div class="flex-shrink-0">
    <img src="icon.svg" class="w-6 h-6" />
  </div>
  <div class="cs-flex-shrink">
    <p>This text will wrap normally instead of overflowing.</p>
  </div>
</div>
```

---

## Common Patterns

### Pattern 1: Card with Truncated Title

```html
<div class="cs-card flex flex-col">
  <img src="cover.jpg" class="cs-aspect-video" />
  <div class="flex-1 p-4">
    <h3 class="cs-truncate font-bold">
      Very Long Article Title That Needs Truncation
    </h3>
    <p class="cs-line-clamp-2 text-sm mt-2">
      Article description that can span up to two lines
      before being clamped with an ellipsis.
    </p>
  </div>
</div>
```

### Pattern 2: Chat Message

```html
<div class="flex gap-3">
  <img src="avatar.jpg" class="w-10 h-10 rounded-full flex-shrink-0" />
  <div class="cs-flex-shrink">
    <div class="font-semibold cs-truncate">John Doe</div>
    <p class="text-sm">This is the message content that will wrap properly.</p>
  </div>
  <span class="flex-shrink-0 text-xs">2:30 PM</span>
</div>
```

### Pattern 3: Table Cell with Overflow

```html
<table>
  <tr>
    <td class="cs-truncate max-w-xs">
      Very long data that needs to be truncated in the table cell
    </td>
    <td class="cs-line-clamp-2 max-w-sm">
      Description that can span two lines before being clamped
    </td>
  </tr>
</table>
```

### Pattern 4: Breadcrumbs

```html
<nav class="flex items-center gap-2">
  <a href="/" class="flex-shrink-0">Home</a>
  <span class="flex-shrink-0">/</span>
  <a href="/category" class="cs-truncate max-w-xs">Very Long Category Name</a>
  <span class="flex-shrink-0">/</span>
  <span class="cs-truncate">Current Page with Long Title</span>
</nav>
```

---

## When to Use Each Utility

| Scenario | Utility | Why |
|----------|---------|-----|
| Single-line titles | `cs-truncate` | Clean, simple ellipsis |
| Product descriptions | `cs-line-clamp-2` or `cs-line-clamp-3` | Show more context before truncating |
| Comments/reviews | `cs-line-clamp-3` or `cs-line-clamp-4` | Balance between preview and space |
| Body text that should wrap | `cs-flex-shrink` | Allow natural wrapping, prevent overflow |
| Table cells | `cs-truncate` + `max-w-*` | Prevent table from expanding |
| Breadcrumbs | `cs-truncate` + `max-w-*` | Keep navigation compact |

---

## Browser Support

### `text-overflow: ellipsis`
✅ **All modern browsers** (IE 6+, Chrome, Firefox, Safari)

### `-webkit-line-clamp`
✅ **95%+ of browsers**
- Chrome: All versions
- Safari: All versions
- Firefox: 68+
- Edge: All versions

**Fallback:** Text will show all lines without clamping in very old Firefox (<68).

### `min-width: 0`
✅ **All browsers with flexbox support** (IE 11+, all modern browsers)

---

## Advanced Techniques

### Dynamic Line Clamping with CSS Variables

```html
<div style="--lines: 3;">
  <p class="cs-line-clamp" style="-webkit-line-clamp: var(--lines);">
    Dynamic number of lines based on container or context.
  </p>
</div>
```

### Combining with Tailwind Utilities

```html
<!-- Truncate on mobile, show full on desktop -->
<h1 class="cs-truncate md:whitespace-normal">
  Responsive Title Truncation
</h1>

<!-- Line clamp with custom max-width -->
<p class="cs-line-clamp-3 max-w-prose">
  Limited to 3 lines and prose width for readability.
</p>
```

### JavaScript Toggle for "Read More"

```html
<div x-data="{ expanded: false }">
  <p :class="expanded ? '' : 'cs-line-clamp-3'">
    Long content that can be expanded...
  </p>
  <button @click="expanded = !expanded" class="text-blue-500">
    <span x-show="!expanded">Read more</span>
    <span x-show="expanded">Show less</span>
  </button>
</div>
```

---

## Debugging Overflow Issues

### Step 1: Check if Element is in a Flex Container

```css
/* Add temporary border to debug */
.flex > * {
  border: 1px solid red;
}
```

### Step 2: Verify min-width

```css
/* Check computed value in DevTools */
.your-element {
  min-width: 0 !important; /* Force and test */
}
```

### Step 3: Check Parent Constraints

```css
/* Ensure parent allows shrinking */
.flex-container {
  min-width: 0; /* Parent also needs this sometimes */
}
```

---

## Performance Considerations

### Line Clamping Performance

`-webkit-line-clamp` is **very performant** because it's handled by the browser's layout engine. No performance concerns even with hundreds of clamped elements.

### Avoid JavaScript Solutions

```html
<!-- ❌ Don't do this (slow, causes layout shifts) -->
<script>
  element.textContent = truncate(text, 100) + '...';
</script>

<!-- ✅ Do this (fast, no layout shifts) -->
<p class="cs-line-clamp-3">{{ fullText }}</p>
```

---

## Common Mistakes

### ❌ Mistake 1: Forgetting min-width on Flex Items

```html
<!-- Won't work - text overflows -->
<div class="flex">
  <p class="truncate">Long text...</p>
</div>

<!-- ✅ Correct - use cs-truncate which includes min-width: 0 -->
<div class="flex">
  <p class="cs-truncate">Long text...</p>
</div>
```

### ❌ Mistake 2: Using on Non-Flex Elements

```html
<!-- Unnecessary - min-width: 0 only needed in flex contexts -->
<div class="block">
  <p class="cs-truncate">Text</p>
</div>

<!-- ✅ Better - use standard overflow utilities -->
<div class="block">
  <p class="overflow-hidden text-ellipsis whitespace-nowrap">Text</p>
</div>
```

### ❌ Mistake 3: Missing max-width

```html
<!-- Line clamp needs a width constraint to work -->
<p class="cs-line-clamp-3">Text</p>

<!-- ✅ Correct - add max-width or use in flex container -->
<p class="cs-line-clamp-3 max-w-prose">Text</p>

<!-- ✅ Or use in flex layout -->
<div class="flex">
  <p class="cs-line-clamp-3 flex-1">Text</p>
</div>
```

---

## Real-World Examples

### E-commerce Product Card

```html
<div class="cs-card max-w-sm">
  <div class="cs-aspect-square cs-aspect-container">
    <img src="product.jpg" alt="Product" />
  </div>
  <div class="p-4 flex flex-col gap-2">
    <h3 class="cs-line-clamp-2 font-bold text-lg">
      Premium Wireless Headphones with Active Noise Cancellation
    </h3>
    <p class="cs-line-clamp-3 text-sm text-gray-600">
      Experience studio-quality sound with our latest headphones featuring
      advanced noise cancellation technology and 30-hour battery life.
    </p>
    <div class="flex items-center justify-between mt-auto">
      <span class="text-2xl font-bold">$299</span>
      <button class="cs-btn">Add to Cart</button>
    </div>
  </div>
</div>
```

### Blog Post Preview

```html
<article class="flex gap-6">
  <div class="flex-shrink-0">
    <div class="cs-aspect-video cs-aspect-container w-64">
      <img src="featured.jpg" alt="Featured" />
    </div>
  </div>
  <div class="cs-flex-shrink">
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <span>Technology</span>
      <span>·</span>
      <time>May 15, 2025</time>
    </div>
    <h2 class="cs-line-clamp-2 text-2xl font-bold mt-2">
      The Future of Web Development: Trends to Watch in 2025
    </h2>
    <p class="cs-line-clamp-3 mt-2 text-gray-600">
      Discover the emerging technologies and methodologies that are shaping
      the future of web development, from AI-powered tools to new CSS features.
    </p>
    <a href="/article" class="inline-flex items-center gap-2 mt-4 text-blue-600">
      Read more →
    </a>
  </div>
</article>
```

### User Profile Header

```html
<div class="flex items-center gap-4">
  <img
    src="avatar.jpg"
    alt="User"
    class="w-16 h-16 rounded-full flex-shrink-0"
  />
  <div class="cs-flex-shrink">
    <h1 class="cs-truncate text-xl font-bold">
      Jane Smith - Senior Product Designer
    </h1>
    <p class="cs-line-clamp-2 text-sm text-gray-600">
      Passionate about creating delightful user experiences.
      Currently working at TechCorp on mobile app redesign.
    </p>
  </div>
  <button class="flex-shrink-0 cs-btn">Follow</button>
</div>
```

---

## Summary

### Key Takeaways

1. **Always use `min-width: 0`** on flex items that contain text you want to truncate
2. **Use `cs-truncate`** for single-line ellipsis
3. **Use `cs-line-clamp-{n}`** for multi-line clamping
4. **Use `cs-flex-shrink`** when you want wrapping instead of truncation
5. **Combine with `max-width`** for table cells and fixed-width contexts

### Quick Reference

| Need | Use | Example |
|------|-----|---------|
| Single-line ellipsis | `cs-truncate` | `<h3 class="cs-truncate">...</h3>` |
| 2-line preview | `cs-line-clamp-2` | `<p class="cs-line-clamp-2">...</p>` |
| 3-line preview | `cs-line-clamp-3` | `<p class="cs-line-clamp-3">...</p>` |
| Wrapping text in flex | `cs-flex-shrink` | `<div class="cs-flex-shrink">...</div>` |
| Table cell truncation | `cs-truncate max-w-*` | `<td class="cs-truncate max-w-xs">...</td>` |

---

**See Also:**
- [Layout Analysis](./LAYOUT_ANALYSIS.md) - Full layout performance audit
- [Performance Guide](./PERFORMANCE.md) - Performance optimization documentation
- [Theme Toggle](./THEME_TOGGLE.md) - Theme switching implementation
