# Atlas UI - Architektur-Konzept

## Ausgangssituation

### Aktueller Stand (TS-Heavy)

Die bestehenden Komponenten sind in TypeScript geschrieben und:

- Generieren DOM-Elemente zur Laufzeit
- Wenden Inline-Styles dynamisch an
- Verwalten State, Event-Listener, Cleanup
- Bieten SSR-Guards (`isBrowser()`)

### Funktionen die erhalten bleiben müssen

| Funktion                    | Warum wichtig      | CSS-only möglich?                 |
| --------------------------- | ------------------ | --------------------------------- |
| Ripple-Effekt               | Click-Position     | Nein (braucht JS für Koordinaten) |
| Focus Trap                  | Accessibility      | Nein (erfordert DOM-Traversal)    |
| Keyboard Navigation         | Accessibility      | Teilweise (`:focus-visible`)      |
| State Management            | Open/Close/Loading | Nein (Logik)                      |
| Scroll Lock                 | Modal/Drawer UX    | Nein (body manipulation)          |
| Screen Reader Announcements | Accessibility      | Nein (ARIA live regions)          |
| Haptic Feedback             | Mobile UX          | Nein (Navigator API)              |
| Intersection Observer       | Scroll-triggered   | Nein (Observer API)               |

### Funktionen die CSS übernehmen kann

| Funktion            | CSS-Lösung                       |
| ------------------- | -------------------------------- |
| Hover States        | `:hover`, `transition`           |
| Focus States        | `:focus-visible`, `outline`      |
| Press/Active States | `:active`, `transform`           |
| Transitions         | `transition`, `animation`        |
| Loading Animations  | `@keyframes`, `:has()`           |
| Color Schemes       | CSS Custom Properties            |
| Responsive          | Media Queries, Container Queries |
| Dark Mode           | `prefers-color-scheme`           |
| Reduced Motion      | `prefers-reduced-motion`         |

---

## Warum wurde TS überhaupt so angefangen?

### Gründe für den TS-Ansatz

1. **Framework-Agnostisch**: Funktioniert mit React, Vue, Svelte, Vanilla
2. **Volle Kontrolle**: DOM-Manipulation für komplexe Interaktionen
3. **Type Safety**: Autocomplete, Fehler zur Compile-Zeit
4. **Encapsulation**: Komponente = isolierte Einheit

### Probleme mit dem TS-Ansatz

1. **Bundle Size**: Viel JS für einfache Hover-Effekte
2. **Hydration Mismatch**: Server rendert anders als Client
3. **Performance**: JS blockiert, CSS nicht
4. **Wartbarkeit**: Styles verteilt in TS und CSS
5. **Learning Curve**: TS + Custom API lernen

---

## SSR-Kompatibilität

### Das Problem

```typescript
// Funktioniert NICHT bei SSR
document.createElement('div')  // document undefined
element.style.transform = '...' // element undefined
window.matchMedia(...)          // window undefined
```

### Aktuelle Lösung (SSR-Guards)

```typescript
if (!isBrowser()) {
  return createNoopState(); // Leere Funktionen
}
```

**Problem**: Komponente existiert auf Server nicht, erst nach Hydration.

### Moderne SSR-Stacks

| Stack         | Beschreibung                            | CSS-Handling              |
| ------------- | --------------------------------------- | ------------------------- |
| **Astro**     | Islands Architecture, partial hydration | CSS first, JS opt-in      |
| **HTMX**      | HTML-over-the-wire, minimal JS          | CSS-Animationen bevorzugt |
| **Alpine.js** | Leichtgewichtiges JS direkt in HTML     | Gut mit CSS kombinierbar  |
| **Qwik**      | Resumability, lazy JS loading           | CSS bevorzugt             |

### Was diese Stacks gemeinsam haben

- **Progressive Enhancement**: Funktioniert ohne JS
- **CSS-First**: Styling komplett in CSS
- **JS für Verhalten**: Nur wenn nötig
- **Minimal Hydration**: Weniger Client-JS

---

## CSS-First Architektur: Das Konzept

### Schichtmodell

```
┌─────────────────────────────────────────────────┐
│  Layer 3: JS Enhancers (optional)               │
│  - Ripple, Focus Trap, Complex State            │
│  - Nur wenn wirklich nötig                      │
├─────────────────────────────────────────────────┤
│  Layer 2: CSS Components                        │
│  - .atlas-btn, .atlas-card, .atlas-modal        │
│  - Hover, Focus, Transitions eingebaut          │
├─────────────────────────────────────────────────┤
│  Layer 1: CSS Utilities & Tokens                │
│  - Custom Properties (--atlas-*)                │
│  - Animation Keyframes                          │
│  - Utility Classes                              │
└─────────────────────────────────────────────────┘
```

### Beispiel: Button

**Aktuell (TS-Heavy):**

```typescript
const button = createButton(element, {
  ripple: true,
  hover: 'breathing',
  haptic: true,
});
```

**Neu (CSS-First):**

```html
<!-- Basis-Funktionalität: Nur CSS -->
<button class="atlas-btn atlas-btn--primary">Click me</button>

<!-- Mit Ripple: JS-Enhancement opt-in -->
<button class="atlas-btn atlas-btn--primary" data-atlas-ripple>Click me</button>
```

```css
/* Alles in CSS */
.atlas-btn {
  /* Base */
  padding: 0.75rem 1.5rem;
  border-radius: var(--atlas-radius-md);
  font-weight: 500;

  /* Micro-Interactions (CSS-only) */
  transition:
    transform 150ms var(--atlas-ease-bounce),
    box-shadow 150ms var(--atlas-ease-standard),
    filter 150ms var(--atlas-ease-standard);
}

.atlas-btn:hover {
  filter: brightness(1.05);
  box-shadow: var(--atlas-shadow-md);
}

.atlas-btn:active {
  transform: scale(0.97);
  filter: brightness(0.95);
}

.atlas-btn:focus-visible {
  outline: 2px solid var(--atlas-primary);
  outline-offset: 2px;
}

/* Loading State via Attribut */
.atlas-btn[aria-busy='true'] {
  pointer-events: none;
  opacity: 0.7;
}

.atlas-btn[aria-busy='true']::after {
  content: '';
  /* Spinner CSS */
}
```

```javascript
// Minimal JS nur für Ripple (optional)
document.querySelectorAll('[data-atlas-ripple]').forEach((el) => {
  el.addEventListener('click', createRipple);
});
```

---

## Vergleich: Alt vs. Neu

### Bundle Size

| Komponente | Alt (TS) | Neu (CSS-First)                 |
| ---------- | -------- | ------------------------------- |
| Button     | ~3.5kb   | 0.5kb CSS + 0.3kb JS (optional) |
| Modal      | ~6kb     | 1kb CSS + 1kb JS (focus trap)   |
| Toast      | ~4kb     | 0.8kb CSS + 0.5kb JS (timer)    |
| Card       | ~3kb     | 0.4kb CSS only                  |
| **Gesamt** | ~16kb+   | ~3kb CSS + ~2kb JS              |

### SSR-Kompatibilität

| Aspekt          | Alt          | Neu         |
| --------------- | ------------ | ----------- |
| Server-Render   | Noop-Returns | Vollständig |
| Hydration       | Erforderlich | Optional    |
| FOUC            | Möglich      | Vermieden   |
| Core Web Vitals | JS-Blocking  | CSS-First   |

### Developer Experience

| Aspekt              | Alt                   | Neu                   |
| ------------------- | --------------------- | --------------------- |
| Einstieg            | TS API lernen         | Klassen kopieren      |
| Anpassung           | Optionen-Objekte      | CSS Variables         |
| Debugging           | Browser DevTools + TS | Browser DevTools only |
| Tailwind-Kompatibel | Konfliktpotential     | Native Integration    |

---

## Vorgeschlagene Architektur

### 1. CSS Foundation (`@casoon/atlas-css`)

```
atlas-css/
├── tokens/
│   ├── colors.css      # --atlas-primary, --atlas-gray-*
│   ├── spacing.css     # --atlas-space-*
│   ├── typography.css  # --atlas-font-*, --atlas-text-*
│   ├── shadows.css     # --atlas-shadow-*
│   ├── radii.css       # --atlas-radius-*
│   └── animations.css  # --atlas-ease-*, --atlas-duration-*
├── components/
│   ├── button.css
│   ├── card.css
│   ├── modal.css
│   ├── drawer.css
│   ├── dropdown.css
│   ├── toast.css
│   ├── progress.css
│   ├── skeleton.css
│   └── form.css
├── utilities/
│   ├── animations.css  # .atlas-fade-in, .atlas-slide-up
│   ├── hover.css       # .atlas-hover-lift, .atlas-hover-glow
│   └── focus.css       # .atlas-focus-ring
└── index.css           # Alles zusammen
```

### 2. JS Enhancers (`@casoon/atlas-js`)

```
atlas-js/
├── enhancers/
│   ├── ripple.ts       # data-atlas-ripple
│   ├── focus-trap.ts   # data-atlas-trap
│   ├── scroll-lock.ts  # data-atlas-lock-scroll
│   ├── announce.ts     # Screen reader announcements
│   └── stagger.ts      # Scroll-triggered animations
├── components/
│   ├── modal.ts        # Open/Close Logik, Focus Trap
│   ├── drawer.ts       # Open/Close, Swipe gestures
│   ├── dropdown.ts     # Keyboard nav, outside click
│   ├── toast.ts        # Timer, queue management
│   └── tabs.ts         # ARIA, keyboard nav
├── auto-init.ts        # Automatische Initialisierung
└── index.ts
```

### 3. Nutzung

**Minimal (CSS-only):**

```html
<link rel="stylesheet" href="@casoon/atlas-css" />

<button class="atlas-btn atlas-btn--primary">Works without JS</button>
```

**Mit Enhancements:**

```html
<link rel="stylesheet" href="@casoon/atlas-css" />
<script src="@casoon/atlas-js" defer></script>

<button class="atlas-btn atlas-btn--primary" data-atlas-ripple>Has ripple effect</button>

<div class="atlas-modal" data-atlas-modal="my-modal">
  <!-- Focus trap automatisch -->
</div>
```

**Tailwind Integration:**

```javascript
// tailwind.config.js
import atlasPreset from '@casoon/atlas-css/tailwind-preset';

export default {
  presets: [atlasPreset],
  // Atlas tokens als Tailwind utilities verfügbar
};
```

---

## Entscheidungsmatrix

### Wann CSS-only?

- Hover/Focus/Active States
- Einfache Transitions
- Skeleton/Loading Animationen
- Color Schemes
- Responsive Layouts

### Wann JS-Enhanced?

- Ripple (braucht Click-Koordinaten)
- Modal/Drawer (Focus Trap, Escape-Key)
- Dropdown (Outside-Click, Keyboard Nav)
- Toast (Timer, Queue)
- Scroll-triggered Animations

### Wann Full TS Component?

- Komplexe State-Logik (Multi-Step Forms)
- Drag & Drop
- Virtual Scrolling
- Rich Text Editor

---

## Migration Plan

### Phase 1: CSS Foundation

1. Design Tokens als CSS Custom Properties
2. Keyframe Animations
3. Component CSS Klassen
4. Utility Klassen für Hover/Focus/Animation

### Phase 2: JS Enhancers

1. Auto-Init System (`data-atlas-*` Attribute)
2. Minimale Enhancer (Ripple, Focus Trap)
3. Component Controllers (Modal, Dropdown, Toast)

### Phase 3: Integration

1. Tailwind Preset
2. Astro Integration
3. HTMX Compatibility
4. Documentation & Examples

---

## Entscheidungen

### 1. Tailwind-Integration: Preset/Plugin

**Was bedeutet das?**

| Aspekt            | Standalone CSS            | Tailwind Preset                      |
| ----------------- | ------------------------- | ------------------------------------ |
| **Nutzung**       | `@import '@casoon/atlas'` | `presets: [atlasPreset]`             |
| **Tokens**        | `var(--atlas-primary)`    | `bg-atlas-primary` oder `bg-primary` |
| **Komponenten**   | Separate CSS-Datei        | In Tailwind integriert               |
| **Customization** | CSS Override              | `tailwind.config.js`                 |
| **Build**         | Eigener Build-Step        | Tailwind CLI/PostCSS                 |
| **Bundle**        | Immer vollständig         | Tree-Shaking via Tailwind            |

**Empfehlung: Beides anbieten**

```javascript
// Option A: Tailwind Preset (empfohlen für neue Projekte)
// tailwind.config.js
import atlasPreset from '@casoon/atlas/tailwind-preset';

export default {
  presets: [atlasPreset],
  theme: {
    extend: {
      colors: {
        // Überschreibt Atlas-Farben
        primary: '#your-brand-color',
      },
    },
  },
};
```

```css
/* Option B: Standalone CSS (für Nicht-Tailwind Projekte) */
@import '@casoon/atlas/css';

:root {
  --atlas-primary: #your-brand-color;
}
```

---

### 2. Web Components mit CSS-Erweiterbarkeit

**Architektur: Light DOM Web Components**

```html
<!-- Web Component mit erweitertem CSS -->
<atlas-button variant="primary" class="my-custom-class"> Click me </atlas-button>

<style>
  /* Einfach erweiterbar - kein Shadow DOM! */
  atlas-button.my-custom-class {
    --atlas-btn-padding: 1rem 2rem;
    border-radius: 9999px;
  }
</style>
```

**Warum Light DOM statt Shadow DOM?**

| Aspekt       | Shadow DOM                   | Light DOM              |
| ------------ | ---------------------------- | ---------------------- |
| CSS Override | Schwierig (::part, CSS vars) | Native CSS-Selektoren  |
| Tailwind     | Funktioniert nicht           | Volle Kompatibilität   |
| SSR          | Kompliziert                  | Einfach (DSD optional) |
| DevTools     | Verschachtelt                | Flach, übersichtlich   |
| Bundle Size  | Größer                       | Kleiner                |

**Implementierungsmuster:**

```javascript
// atlas-button.js
class AtlasButton extends HTMLElement {
  connectedCallback() {
    // Keine Shadow DOM - Styles kommen von außen
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    // Nur Verhalten, kein Styling
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);

    // Optional: Ripple Enhancement
    if (this.hasAttribute('ripple')) {
      this.initRipple();
    }
  }

  // Styles komplett in CSS
}

customElements.define('atlas-button', AtlasButton);
```

```css
/* atlas-button.css */
atlas-button {
  /* Base Styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--atlas-btn-padding, 0.75rem 1.5rem);

  /* Micro-Interactions */
  transition: transform 150ms var(--atlas-ease-bounce);

  /* Variants via Attribut */
  &[variant='primary'] {
    background: var(--atlas-primary);
    color: white;
  }

  &[variant='secondary'] {
    background: var(--atlas-gray-100);
    color: var(--atlas-gray-900);
  }

  /* States */
  &:hover {
    filter: brightness(1.05);
  }
  &:active {
    transform: scale(0.97);
  }
  &[disabled] {
    opacity: 0.5;
    pointer-events: none;
  }
  &[loading] {
    /* spinner */
  }
}
```

---

### 3. Cleanup-Strategie

**Was wird entfernt:**

| Feature                                   | Grund für Entfernung |
| ----------------------------------------- | -------------------- |
| Inline-Style Manipulation                 | CSS übernimmt        |
| `createElement()` für Styling             | Light DOM            |
| Komplexe State-Objekte für einfache Hover | CSS `:hover`         |
| SSR-Guards für Styling                    | CSS ist SSR-safe     |
| Breathing Animation in JS                 | CSS `@keyframes`     |

**Was bleibt (sinnvoll):**

| Feature                | Grund für Beibehaltung |
| ---------------------- | ---------------------- |
| Focus Trap             | Nicht in CSS möglich   |
| Keyboard Navigation    | Accessibility          |
| Ripple (Koordinaten)   | Braucht Mausposition   |
| Screen Reader Announce | ARIA live regions      |
| Scroll Lock            | Body manipulation      |
| Outside Click          | Event delegation       |
| Escape Key Handler     | Konsistente UX         |
| Toast Queue/Timer      | Logik                  |
| Intersection Observer  | Scroll-triggered       |

---

### 4. AHA Stack Kompatibilität

**AHA = Astro + HTMX + Alpine.js**

#### Astro Integration

```astro
---
// Button.astro - Server Component
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  ripple?: boolean;
  class?: string;
}

const { variant = 'primary', size = 'md', ripple = false, class: className } = Astro.props;
---

<atlas-button
  variant={variant}
  size={size}
  ripple={ripple ? '' : undefined}
  class:list={[className]}
>
  <slot />
</atlas-button>

<!-- JS nur wenn ripple aktiv - partial hydration -->
{ripple && (
  <script>
    import '@casoon/atlas/enhancers/ripple';
  </script>
)}
```

```astro
<!-- Nutzung in Astro -->
---
import Button from '@components/Button.astro';
---

<Button variant="primary" ripple>
  Click me
</Button>

<!-- Oder direkt -->
<atlas-button variant="primary">
  No JS needed
</atlas-button>
```

#### HTMX Integration

```html
<!-- HTMX-powered Button mit Atlas Styling -->
<atlas-button variant="primary" hx-post="/api/submit" hx-target="#result" hx-indicator="#spinner">
  Submit
  <span id="spinner" class="htmx-indicator">
    <atlas-spinner size="sm" />
  </span>
</atlas-button>

<!-- Modal via HTMX -->
<atlas-button hx-get="/modal/confirm" hx-target="body" hx-swap="beforeend">
  Open Modal
</atlas-button>

<!-- Server liefert: -->
<atlas-modal open id="confirm-modal">
  <h2 slot="header">Confirm</h2>
  <p>Are you sure?</p>
  <atlas-button
    slot="footer"
    hx-delete="/item/123"
    hx-on::after-request="document.getElementById('confirm-modal').close()"
  >
    Delete
  </atlas-button>
</atlas-modal>
```

#### Alpine.js Integration

```html
<!-- Alpine.js für komplexere Client-Logik -->
<div x-data="{ count: 0 }">
  <atlas-button variant="primary" @click="count++" x-bind:disabled="count >= 10">
    Clicked: <span x-text="count"></span>
  </atlas-button>
</div>

<!-- Dropdown mit Alpine -->
<div x-data="{ open: false }">
  <atlas-button @click="open = !open"> Toggle Menu </atlas-button>

  <atlas-dropdown x-show="open" @click.outside="open = false">
    <atlas-dropdown-item>Option 1</atlas-dropdown-item>
    <atlas-dropdown-item>Option 2</atlas-dropdown-item>
  </atlas-dropdown>
</div>
```

#### Kombiniert: Astro + HTMX + Alpine

```astro
---
// ProductCard.astro
interface Props {
  product: { id: string; name: string; price: number };
}

const { product } = Astro.props;
---

<atlas-card
  hover="lift"
  x-data="{ quantity: 1 }"
  class="product-card"
>
  <img src={`/products/${product.id}.jpg`} alt={product.name} />

  <h3>{product.name}</h3>
  <p class="price">${product.price}</p>

  <div class="quantity">
    <atlas-button size="sm" @click="quantity = Math.max(1, quantity - 1)">-</atlas-button>
    <span x-text="quantity"></span>
    <atlas-button size="sm" @click="quantity++">+</atlas-button>
  </div>

  <atlas-button
    variant="primary"
    hx-post="/cart/add"
    hx-vals="js:{productId: '{product.id}', quantity: quantity}"
    hx-swap="none"
    hx-on::after-request="$dispatch('cart-updated')"
  >
    Add to Cart
  </atlas-button>
</atlas-card>
```

---

## Finale Architektur

```
@casoon/atlas/
├── css/
│   ├── tokens.css           # Design Tokens (CSS Custom Properties)
│   ├── components/          # Component CSS
│   │   ├── button.css
│   │   ├── card.css
│   │   ├── modal.css
│   │   └── ...
│   ├── utilities.css        # Utility Classes
│   └── index.css            # Bundle
│
├── elements/                 # Web Components (Light DOM)
│   ├── atlas-button.js
│   ├── atlas-card.js
│   ├── atlas-modal.js
│   ├── atlas-drawer.js
│   ├── atlas-dropdown.js
│   ├── atlas-toast.js
│   └── index.js             # Auto-register all
│
├── enhancers/               # Optional JS Enhancers
│   ├── ripple.js
│   ├── focus-trap.js
│   ├── scroll-lock.js
│   └── stagger.js
│
├── tailwind-preset.js       # Tailwind Integration
│
├── astro/                   # Astro Components
│   ├── Button.astro
│   ├── Card.astro
│   └── ...
│
└── alpine/                  # Alpine.js Plugins (optional)
    └── atlas.js
```

---

## Nächste Schritte

1. [ ] **Proof of Concept**: `<atlas-button>` als Web Component
2. [ ] **CSS Foundation**: Tokens + Button CSS
3. [ ] **Astro Integration**: Button.astro Wrapper
4. [ ] **HTMX Test**: Loading States, Indicators
5. [ ] **Tailwind Preset**: Tokens als Utilities
6. [ ] **Migration**: Bestehende Komponenten portieren
