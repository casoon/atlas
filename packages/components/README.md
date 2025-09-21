# @casoon/atlas-components

**Framework-agnostic headless UI components**

A collection of 10+ headless UI components designed for maximum flexibility and accessibility. Works with any framework or vanilla JavaScript.

## Features

- ✅ **Headless Architecture** - Logic only, bring your own styling
- ✅ **Framework Agnostic** - Works with React, Vue, Svelte, Astro, vanilla JS
- ✅ **Accessibility First** - ARIA compliant with keyboard navigation
- ✅ **TypeScript Native** - Full type safety and IntelliSense
- ✅ **Tree Shakeable** - Import only what you need
- ✅ **SSR Compatible** - Safe for server-side rendering
- ✅ **Zero Dependencies** - Lightweight and self-contained

## Installation

```bash
npm install @casoon/atlas-components
```

## Quick Start

```typescript
import { createModal, createTabs, createToastManager } from '@casoon/atlas-components';

// Create a modal
const modal = createModal({ 
  closeOnBackdrop: true, 
  trapFocus: true 
});

// Create tabs
const tabs = createTabs(['home', 'about', 'contact']);

// Create toast notifications
const toasts = createToastManager();
toasts.show('Hello World!', { type: 'success' });
```

## Available Components

### Layout & Navigation

#### Modal
Accessible modal dialogs with focus management
```typescript
import { createModal } from '@casoon/atlas-components/modal';

const modal = createModal({
  backdrop: true,          // Show backdrop
  closeOnBackdrop: true,   // Close on backdrop click
  closeOnEscape: true,     // Close on Escape key
  trapFocus: true,         // Trap focus within modal
  autoFocus: true,         // Auto-focus first element
  onOpen: () => console.log('Modal opened'),
  onClose: () => console.log('Modal closed')
});

// Usage
modal.open();    // Open modal
modal.close();   // Close modal
modal.toggle();  // Toggle modal
console.log(modal.isOpen); // Check state
```

#### Dropdown
Flexible dropdown menus with positioning
```typescript
import { createDropdown } from '@casoon/atlas-components/dropdown';

const trigger = document.querySelector('#dropdown-trigger');
const dropdown = createDropdown(trigger, {
  placement: 'bottom',        // 'top', 'bottom', 'left', 'right'
  closeOnSelect: true,        // Close when item selected
  closeOnClickOutside: true   // Close on outside click
});

// Usage
dropdown.open();
dropdown.close();
dropdown.toggle();
```

#### Tabs
Accessible tab interfaces with ARIA support
```typescript
import { createTabs } from '@casoon/atlas-components/tabs';

const tabs = createTabs(['home', 'about', 'contact'], {
  defaultTab: 'home',         // Initial active tab
  orientation: 'horizontal',   // 'horizontal' or 'vertical'
  onChange: (tabId) => console.log('Tab changed:', tabId)
});

// Usage
tabs.setActiveTab('about');
console.log(tabs.activeTab);        // Get active tab
console.log(tabs.isActive('home')); // Check if tab is active

// Get props for elements
const tabProps = tabs.getTabProps('home');
const panelProps = tabs.getPanelProps('home');
```

#### Drawer
Slide-in panels and sidebars
```typescript
import { createDrawer } from '@casoon/atlas-components/drawer';

const drawer = createDrawer({
  side: 'right',            // 'left', 'right', 'top', 'bottom'
  backdrop: true,           // Show backdrop
  closeOnBackdrop: true,    // Close on backdrop click
  closeOnEscape: true       // Close on Escape key
});

// Usage
drawer.open();
drawer.close();
drawer.toggle();
```

### Content & Data

#### Accordion
Collapsible content sections
```typescript
import { createAccordion } from '@casoon/atlas-components/accordion';

const accordion = createAccordion(['panel1', 'panel2', 'panel3'], {
  collapsible: true,        // Allow all panels to be closed
  multiple: false,          // Allow multiple panels open
  defaultOpen: ['panel1']   // Initially open panels
});

// Usage
accordion.toggle('panel1');
accordion.open('panel2');
accordion.close('panel3');
console.log(accordion.isOpen('panel1'));

// Get props for elements
const buttonProps = accordion.getButtonProps('panel1');
const panelProps = accordion.getPanelProps('panel1');
```

#### Card
Flexible card components with variants
```typescript
import { createCard } from '@casoon/atlas-components/card';

const card = createCard({
  variant: 'elevated',      // 'default', 'elevated', 'outlined', 'glass'
  interactive: true,        // Enable hover/focus states
  padding: '1.5rem'         // Custom padding
});

// Get props for elements
const cardProps = card.getCardProps();
const headerProps = card.getHeaderProps();
const contentProps = card.getContentProps();
const footerProps = card.getFooterProps();
```

### Feedback & Overlays

#### Tooltip
Contextual tooltips with smart positioning
```typescript
import { createTooltip } from '@casoon/atlas-components/tooltip';

const trigger = document.querySelector('#tooltip-trigger');
const tooltip = createTooltip(trigger, {
  delay: 500,               // Show delay in ms
  placement: 'top',         // 'top', 'bottom', 'left', 'right'
  trigger: 'hover'          // 'hover', 'focus', 'click'
});

// Usage
tooltip.show();
tooltip.hide();
tooltip.toggle();
console.log(tooltip.isVisible);
```

#### Toast
Non-blocking notification system
```typescript
import { createToastManager } from '@casoon/atlas-components/toast';

const toastManager = createToastManager();

// Show notifications
const toast1 = toastManager.show('Success message!', {
  duration: 3000,           // Auto-dismiss after 3s
  type: 'success',          // 'info', 'success', 'warning', 'error'
  position: 'top-right'     // Position on screen
});

const toast2 = toastManager.show('Persistent message', {
  duration: 0               // 0 = manual dismiss only
});

// Dismiss manually
toast1.dismiss();
```

### Forms & Inputs

#### Form
Form state management with validation
```typescript
import { createForm } from '@casoon/atlas-components/form';

const form = createForm({
  initialValues: {
    email: '',
    password: ''
  },
  validate: (values) => {
    const errors = {};
    if (!values.email) errors.email = 'Email required';
    if (values.password.length < 6) errors.password = 'Password too short';
    return errors;
  },
  onSubmit: (values) => {
    console.log('Form submitted:', values);
  }
});

// Usage
form.setValue('email', 'user@example.com');
form.setTouched('email');
const field = form.getField('email');
const values = form.getValues();
form.validateForm();
form.handleSubmit();
```

#### Button
Interactive button states and variants
```typescript
import { createButton } from '@casoon/atlas-components/button';

const button = createButton({
  variant: 'primary',       // 'primary', 'secondary', 'danger', 'ghost'
  size: 'md',               // 'sm', 'md', 'lg'
  disabled: false,
  loading: false
});

// Usage
button.setLoading(true);
button.setDisabled(false);
const props = button.getButtonProps();
```

## Framework Integration

### React Integration

```typescript
// hooks/useModal.ts
import { useCallback, useState } from 'react';
import { createModal, ModalOptions } from '@casoon/atlas-components';

export function useModal(options?: ModalOptions) {
  const [modal] = useState(() => createModal(options));
  
  return modal;
}

// Component usage
function MyComponent() {
  const modal = useModal();
  
  return (
    <>
      <button onClick={modal.open}>Open Modal</button>
      {modal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Modal Title</h2>
            <button onClick={modal.close}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
```

### Vue 3 Integration

```vue
<!-- composables/useModal.ts -->
<script setup lang="ts">
import { createModal, type ModalOptions } from '@casoon/atlas-components';
import { reactive } from 'vue';

export function useModal(options?: ModalOptions) {
  const modal = createModal(options);
  return reactive(modal);
}
</script>

<!-- Component usage -->
<template>
  <div>
    <button @click="modal.open">Open Modal</button>
    <div v-if="modal.isOpen" class="modal-backdrop">
      <div class="modal-content">
        <h2>Modal Title</h2>
        <button @click="modal.close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useModal } from '@/composables/useModal';

const modal = useModal();
</script>
```

### Svelte Integration

```svelte
<!-- lib/modal.js -->
<script>
  import { createModal } from '@casoon/atlas-components';
  import { writable } from 'svelte/store';

  export function createModalStore(options) {
    const modal = createModal(options);
    const isOpen = writable(modal.isOpen);
    
    return {
      open: modal.open,
      close: modal.close,
      toggle: modal.toggle,
      isOpen
    };
  }
</script>

<!-- Component usage -->
<script>
  import { createModalStore } from '$lib/modal.js';
  
  const modal = createModalStore();
</script>

<button on:click={modal.open}>Open Modal</button>

{#if $modal.isOpen}
  <div class="modal-backdrop">
    <div class="modal-content">
      <h2>Modal Title</h2>
      <button on:click={modal.close}>Close</button>
    </div>
  </div>
{/if}
```

### Astro Integration

```astro
---
// components/Modal.astro
import { createModal } from '@casoon/atlas-components';
---

<button id="open-modal">Open Modal</button>
<div id="modal-container" style="display: none;">
  <div class="modal-backdrop">
    <div class="modal-content">
      <h2>Modal Title</h2>
      <button id="close-modal">Close</button>
    </div>
  </div>
</div>

<script>
  import { createModal } from '@casoon/atlas-components';
  
  const modal = createModal({
    onOpen: () => {
      document.getElementById('modal-container').style.display = 'block';
    },
    onClose: () => {
      document.getElementById('modal-container').style.display = 'none';
    }
  });
  
  document.getElementById('open-modal').addEventListener('click', modal.open);
  document.getElementById('close-modal').addEventListener('click', modal.close);
</script>
```

## Advanced Patterns

### Compound Components

```typescript
// Create a reusable modal system
class ModalSystem {
  private modals = new Map();
  
  create(id: string, options?: ModalOptions) {
    const modal = createModal(options);
    this.modals.set(id, modal);
    return modal;
  }
  
  get(id: string) {
    return this.modals.get(id);
  }
  
  closeAll() {
    this.modals.forEach(modal => modal.close());
  }
}

const modalSystem = new ModalSystem();
const confirmModal = modalSystem.create('confirm');
const settingsModal = modalSystem.create('settings');
```

### State Management Integration

```typescript
// Redux/Zustand integration example
import { createTabs } from '@casoon/atlas-components';

const useTabsStore = create((set, get) => ({
  tabs: createTabs(['home', 'about', 'contact'], {
    onChange: (tabId) => {
      // Sync with store state
      set({ activeTab: tabId });
    }
  }),
  activeTab: 'home',
  setActiveTab: (tabId) => {
    get().tabs.setActiveTab(tabId);
  }
}));
```

### Custom Hooks/Composables

```typescript
// useAccordion.ts - Reusable accordion logic
import { createAccordion } from '@casoon/atlas-components';
import { useCallback, useState } from 'react';

export function useAccordion(panels: string[], options = {}) {
  const [accordion] = useState(() => createAccordion(panels, options));
  
  const togglePanel = useCallback((panelId: string) => {
    accordion.toggle(panelId);
    // Trigger re-render if needed
  }, [accordion]);
  
  return {
    accordion,
    togglePanel,
    isOpen: accordion.isOpen.bind(accordion),
    getButtonProps: accordion.getButtonProps.bind(accordion),
    getPanelProps: accordion.getPanelProps.bind(accordion)
  };
}
```

## Styling Integration

### Tailwind CSS

```typescript
// Tailwind-compatible component styling
const getModalClasses = (isOpen: boolean) => ({
  backdrop: `fixed inset-0 bg-black/50 transition-opacity ${
    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
  }`,
  dialog: `fixed inset-0 flex items-center justify-center p-4 transition-transform ${
    isOpen ? 'scale-100' : 'scale-95'
  }`,
  content: 'bg-white rounded-lg shadow-xl max-w-md w-full'
});
```

### CSS Modules

```css
/* Modal.module.css */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 28rem;
  width: 100%;
}
```

### Styled Components

```typescript
import styled from 'styled-components';

const ModalBackdrop = styled.div<{ isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.isOpen ? 1 : 0};
  transition: opacity 0.2s ease;
`;
```

## Testing

### Unit Testing

```typescript
import { createModal } from '@casoon/components';

describe('Modal', () => {
  it('should open and close correctly', () => {
    const modal = createModal();
    
    expect(modal.isOpen).toBe(false);
    
    modal.open();
    expect(modal.isOpen).toBe(true);
    
    modal.close();
    expect(modal.isOpen).toBe(false);
  });
  
  it('should call onOpen callback', () => {
    const onOpen = jest.fn();
    const modal = createModal({ onOpen });
    
    modal.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

```typescript
// Testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { useModal } from './useModal';

function TestComponent() {
  const modal = useModal();
  
  return (
    <>
      <button onClick={modal.open}>Open</button>
      {modal.isOpen && <div data-testid="modal">Modal Content</div>}
    </>
  );
}

test('modal opens and closes', () => {
  render(<TestComponent />);
  
  const openButton = screen.getByText('Open');
  fireEvent.click(openButton);
  
  expect(screen.getByTestId('modal')).toBeInTheDocument();
});
```

## Performance Optimization

### Lazy Loading

```typescript
// Lazy load components only when needed
const createModalLazy = () => 
  import('@casoon/components/modal').then(m => m.createModal());

// Usage
const modal = await createModalLazy();
```

### Memory Management

```typescript
// Proper cleanup in React
useEffect(() => {
  const modal = createModal();
  
  return () => {
    // Components handle their own cleanup
    // No manual cleanup needed for @casoon/components
  };
}, []);
```

## Accessibility

All components follow WAI-ARIA guidelines:

- **Focus Management**: Automatic focus trapping and restoration
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and live regions
- **High Contrast**: Compatible with high contrast modes

### ARIA Attributes

Components automatically manage ARIA attributes:

```typescript
const tabs = createTabs(['tab1', 'tab2']);

// Automatically provides:
// - aria-selected
// - aria-controls
// - aria-labelledby
// - role="tab"
// - role="tabpanel"
```

## Migration Guide

### From Other Headless Libraries

```typescript
// From Headless UI
// Before
import { Dialog } from '@headlessui/react';

// After
import { createModal } from '@casoon/components';
const modal = createModal();
```

### Version Updates

Components maintain backward compatibility within major versions. Check [CHANGELOG.md](./CHANGELOG.md) for breaking changes.

## Contributing

See the main [CASOON Atlas README](../../README.md) for contribution guidelines.

## License

MIT