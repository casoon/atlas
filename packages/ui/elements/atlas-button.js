/**
 * Atlas Button - Web Component
 *
 * Light DOM Web Component for buttons.
 * Styling comes from CSS (atlas-button.css).
 * JS only handles behavior: keyboard, ARIA, optional enhancements.
 *
 * @example
 * <atlas-button variant="primary">Click me</atlas-button>
 * <atlas-button variant="outline" size="lg" loading>Loading...</atlas-button>
 * <atlas-button variant="danger" disabled>Disabled</atlas-button>
 *
 * @fires atlas-button:click - When button is clicked
 * @fires atlas-button:loading - When loading state changes
 */

class AtlasButton extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'loading', 'type'];
  }

  constructor() {
    super();

    // Bind methods
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  connectedCallback() {
    // Set up accessibility
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'button');
    }

    if (!this.hasAttribute('tabindex') && !this.hasAttribute('disabled')) {
      this.setAttribute('tabindex', '0');
    }

    // Event listeners
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);

    // Initialize ripple if attribute present
    if (this.hasAttribute('ripple')) {
      this.initRipple();
    }
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeydown);
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === 'disabled') {
      if (newValue !== null) {
        this.setAttribute('aria-disabled', 'true');
        this.removeAttribute('tabindex');
      } else {
        this.removeAttribute('aria-disabled');
        this.setAttribute('tabindex', '0');
      }
    }

    if (name === 'loading') {
      this.setAttribute('aria-busy', newValue !== null ? 'true' : 'false');

      this.dispatchEvent(
        new CustomEvent('atlas-button:loading', {
          bubbles: true,
          detail: { loading: newValue !== null },
        })
      );
    }
  }

  handleClick(event) {
    // Prevent action if disabled or loading
    if (this.hasAttribute('disabled') || this.hasAttribute('loading')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Handle form submission
    const type = this.getAttribute('type');
    if (type === 'submit') {
      const form = this.closest('form');
      if (form) {
        form.requestSubmit();
      }
    } else if (type === 'reset') {
      const form = this.closest('form');
      if (form) {
        form.reset();
      }
    }

    // Dispatch custom event
    this.dispatchEvent(
      new CustomEvent('atlas-button:click', {
        bubbles: true,
        detail: { originalEvent: event },
      })
    );
  }

  handleKeydown(event) {
    // Activate on Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.click();
    }
  }

  // Ripple initialization (optional enhancement)
  initRipple() {
    this.addEventListener('pointerdown', (event) => {
      if (this.hasAttribute('disabled') || this.hasAttribute('loading')) return;

      const rect = this.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const ripple = document.createElement('span');
      ripple.className = 'atlas-ripple';
      ripple.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x - size / 2}px;
        top: ${y - size / 2}px;
      `;

      this.appendChild(ripple);

      // Remove after animation
      ripple.addEventListener('animationend', () => {
        ripple.remove();
      });
    });
  }

  // Public API

  /** Set loading state */
  setLoading(loading) {
    if (loading) {
      this.setAttribute('loading', '');
    } else {
      this.removeAttribute('loading');
    }
  }

  /** Set disabled state */
  setDisabled(disabled) {
    if (disabled) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /** Trigger click programmatically */
  trigger() {
    if (!this.hasAttribute('disabled') && !this.hasAttribute('loading')) {
      this.click();
    }
  }

  // Getters
  get loading() {
    return this.hasAttribute('loading');
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }
}

// Register component
if (typeof customElements !== 'undefined' && !customElements.get('atlas-button')) {
  customElements.define('atlas-button', AtlasButton);
}

export { AtlasButton };
export default AtlasButton;
