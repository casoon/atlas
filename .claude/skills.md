# Atlas Skills

## Projekt-Kontext

CASOON Atlas ist ein modernes, framework-agnostisches UI-Library mit drei Säulen:

1. **@casoon/atlas-styles** - Pure CSS Design System (Tailwind v4 kompatibel)
2. **@casoon/atlas-effects** - 13+ interaktive JS-Effekte (SSR-safe)
3. **@casoon/atlas-components** - Headless UI-Komponenten

## Design-Philosophie

**Atlas ist KEIN Mega-Framework.** Es ist die Essenz einer 10% Erweiterung:

- Nur Mehrwert schaffen, wo Tailwind alleine nicht reicht
- Keine Kapselung von einfachen Tailwind-Funktionen
- Glassmorphism, Orbs, Micro-Interactions = Mehrwert
- `bg-white/10` nachbauen = kein Mehrwert

### Was Atlas SEIN soll:

- Komplexe visuelle Effekte (Glass, Orbs, Particles)
- Interaktive Micro-Animations (Ripple, Tilt, Magnetic)
- Headless Komponenten mit A11y (Modal, Dropdown, Tabs)
- Design Tokens für konsistentes Theming

### Was Atlas NICHT sein soll:

- Wrapper für `flex`, `grid`, `p-4`, `text-white`
- Alternative zu Tailwind-Basis-Utilities
- Überladenes Component-Framework

## Verfügbare CSS-Klassen (Mehrwert)

### Glass System (`glass.css`)

```css
cs-glass              /* Basis Glassmorphism */
cs-glass-sm/md/lg/xl  /* Intensitätsstufen */
cs-glass-dark         /* Dunkle Variante */
cs-glass-card         /* Card mit Hover-Effekt */
cs-glass-button       /* Button mit States */
cs-glass-nav          /* Navigation */
cs-glass-blue/purple/green/pink/amber  /* Farbvarianten */
```

### Components (`components.css`)

```css
atlas-button          /* Button mit Micro-Interactions */
atlas-card            /* Card mit Shine-Effekt */
atlas-modal           /* Modal Animationen */
atlas-drawer          /* Drawer Slide-Ins */
atlas-dropdown        /* Dropdown Scale */
atlas-toast           /* Toast Slide + Progress */
atlas-skeleton        /* Shimmer/Pulse/Wave */
atlas-progress        /* Progress mit Shimmer */
atlas-hover-lift/glow/scale  /* Hover-Effekte */
atlas-stagger-*       /* Stagger-Animationen */
```

### Orbs (`orbs.css`)

- Animierte Orb-Partikel für Hintergründe
- Ambient Glow Effekte

## Verfügbare JS-Effekte

```typescript
import { ripple } from '@casoon/atlas-effects/ripple';
import { tilt } from '@casoon/atlas-effects/tilt';
import { particles } from '@casoon/atlas-effects/particles';
import { orbs } from '@casoon/atlas-effects/orbs';
import { parallax } from '@casoon/atlas-effects/parallax';
import { scrollReveal } from '@casoon/atlas-effects/scrollReveal';
import { magnetic } from '@casoon/atlas-effects/magnetic';
import { typewriter } from '@casoon/atlas-effects/typewriter';
import { glassEffects } from '@casoon/atlas-effects/glassEffects';
// ... weitere
```

Jeder Effekt gibt eine Cleanup-Funktion zurück.

## Headless Components

```typescript
import { createModal } from '@casoon/atlas-components';
import { createTabs } from '@casoon/atlas-components';
import { createDropdown } from '@casoon/atlas-components';
import { createAccordion } from '@casoon/atlas-components';
import { createTooltip } from '@casoon/atlas-components';
import { createToast } from '@casoon/atlas-components';
```

## Build Commands

```bash
pnpm install      # Dependencies installieren
pnpm build        # Alle Packages bauen
pnpm dev          # Watch-Mode
pnpm demo         # Demo auf localhost:3000
pnpm test         # Tests
pnpm changeset    # Version bump vorbereiten
```

## Code-Standards

- TypeScript strict mode, kein `any`
- Immer Cleanup-Funktionen zurückgeben
- `prefers-reduced-motion` respektieren
- SSR-safe (kein DOM-Zugriff auf Modul-Level)
- Tree-shakeable exports

## Entscheidungshilfe: Atlas oder Tailwind?

| Anwendungsfall               | Lösung                                     |
| ---------------------------- | ------------------------------------------ |
| Einfacher Button-Style       | Tailwind (`bg-blue-500 hover:bg-blue-600`) |
| Button mit Ripple-Effekt     | Atlas (`atlas-button` + `ripple()`)        |
| Card mit Shadow              | Tailwind (`shadow-lg rounded-xl`)          |
| Card mit Glassmorphism       | Atlas (`cs-glass-card`)                    |
| Flexbox Layout               | Tailwind (`flex gap-4`)                    |
| Stagger-Animation            | Atlas (`atlas-stagger-fade-up`)            |
| Text-Farbe                   | Tailwind (`text-white/80`)                 |
| Floating Orbs im Hintergrund | Atlas (`orbs.css` / `orbs()`)              |
