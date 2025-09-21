// Import all CASOON Atlas packages
import '@casoon/atlas-styles';

// Import effects
import { 
  ripple, 
  glassEffects,
  scrollReveal,
  particles,
  tilt,
  glow,
  magnetic,
  typewriter
} from '@casoon/atlas-effects';

// Import components
import { 
  createModal,
  createDropdown,
  createTabs,
  createAccordion,
  createToastManager
} from '@casoon/atlas-components';

// Demo sections
const sections = {
  effects: () => createEffectsDemo(),
  components: () => createComponentsDemo(),
  styles: () => createStylesDemo()
};

let currentCleanup: (() => void)[] = [];

function cleanup() {
  currentCleanup.forEach(fn => fn());
  currentCleanup = [];
}

function createEffectsDemo() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="demo-grid">
      <div class="demo-card">
        <h3>Ripple Effect</h3>
        <div id="ripple-demo" class="demo-target cs-glass">Click me!</div>
      </div>
      
      <div class="demo-card">
        <h3>Glass Effects</h3>
        <div id="glass-demo" class="demo-target">Hover for interactive glass</div>
      </div>
      
      <div class="demo-card">
        <h3>Tilt Effect</h3>
        <div id="tilt-demo" class="demo-target cs-glass">Hover to tilt</div>
      </div>
      
      <div class="demo-card">
        <h3>Glow Effect</h3>
        <div id="glow-demo" class="demo-target">Animated glow</div>
      </div>
      
      <div class="demo-card">
        <h3>Magnetic Effect</h3>
        <div id="magnetic-demo" class="demo-target cs-glass">Magnetic attraction</div>
      </div>
      
      <div class="demo-card">
        <h3>Typewriter</h3>
        <div id="typewriter-demo" class="demo-target"></div>
      </div>
      
      <div class="demo-card">
        <h3>Particles</h3>
        <div id="particles-demo" class="demo-target" style="height: 200px; position: relative;">
          Particle system
        </div>
      </div>
      
      <div class="demo-card">
        <h3>Scroll Reveal</h3>
        <div id="scroll-demo" class="demo-target">Scroll to reveal</div>
      </div>
    </div>
  `;

  // Initialize effects
  setTimeout(() => {
    currentCleanup.push(
      ripple('#ripple-demo', { strength: 0.8 }),
      glassEffects('#glass-demo', { interactiveBlur: true }),
      tilt('#tilt-demo', { intensity: 15 }),
      glow('#glow-demo', { color: '#3b82f6', animated: true }),
      magnetic('#magnetic-demo', { strength: 0.4 }),
      typewriter('#typewriter-demo', { 
        texts: ['Hello World!', 'CASOON Atlas', 'Modern UI Effects'], 
        speed: 100 
      }),
      particles('#particles-demo', { 
        count: 20, 
        interactive: true,
        connectLines: true 
      }),
      scrollReveal('#scroll-demo', { origin: 'bottom', distance: '30px' })
    );
  }, 100);

  return container;
}

function createComponentsDemo() {
  const container = document.createElement('div');
  const modal = createModal();
  const toastManager = createToastManager();
  const tabs = createTabs(['tab1', 'tab2', 'tab3']);
  const accordion = createAccordion(['panel1', 'panel2', 'panel3']);

  container.innerHTML = `
    <div class="demo-grid">
      <div class="demo-card">
        <h3>Modal</h3>
        <button id="open-modal" class="demo-button">Open Modal</button>
        <div id="modal-content" style="display: none;">
          <div class="modal-overlay">
            <div class="modal-dialog cs-glass">
              <h4>Demo Modal</h4>
              <p>This is a headless modal component!</p>
              <button id="close-modal" class="demo-button">Close</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="demo-card">
        <h3>Tabs</h3>
        <div class="tabs">
          <div class="tab-list">
            <button id="tab1" class="tab-button">Tab 1</button>
            <button id="tab2" class="tab-button">Tab 2</button>
            <button id="tab3" class="tab-button">Tab 3</button>
          </div>
          <div id="panel1" class="tab-panel">Content 1</div>
          <div id="panel2" class="tab-panel">Content 2</div>
          <div id="panel3" class="tab-panel">Content 3</div>
        </div>
      </div>
      
      <div class="demo-card">
        <h3>Toast Notifications</h3>
        <button id="show-toast" class="demo-button">Show Toast</button>
        <div id="toast-container"></div>
      </div>
      
      <div class="demo-card">
        <h3>Accordion</h3>
        <div class="accordion">
          <div class="accordion-item">
            <button id="acc-btn-1" class="accordion-button">Panel 1</button>
            <div id="panel1-content" class="accordion-content">Content 1</div>
          </div>
          <div class="accordion-item">
            <button id="acc-btn-2" class="accordion-button">Panel 2</button>
            <div id="panel2-content" class="accordion-content">Content 2</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize components
  setTimeout(() => {
    const openModalBtn = container.querySelector('#open-modal') as HTMLButtonElement;
    const closeModalBtn = container.querySelector('#close-modal') as HTMLButtonElement;
    const modalContent = container.querySelector('#modal-content') as HTMLElement;
    
    openModalBtn.addEventListener('click', () => {
      modalContent.style.display = 'block';
      modal.open();
    });
    
    closeModalBtn.addEventListener('click', modal.close);

    // Tabs
    ['tab1', 'tab2', 'tab3'].forEach(tabId => {
      const btn = container.querySelector(`#${tabId}`) as HTMLButtonElement;
      const panel = container.querySelector(`#panel${tabId.slice(-1)}`) as HTMLElement;
      
      btn.addEventListener('click', () => tabs.setActiveTab(tabId));
      
      // Update UI based on tabs state
      const updateTab = () => {
        const props = tabs.getTabProps(tabId);
        const panelProps = tabs.getPanelProps(tabId);
        
        btn.setAttribute('aria-selected', props['aria-selected'].toString());
        btn.className = `tab-button ${props['aria-selected'] ? 'active' : ''}`;
        panel.hidden = panelProps.hidden;
      };
      
      updateTab();
      btn.addEventListener('click', updateTab);
    });

    // Toast
    const showToastBtn = container.querySelector('#show-toast') as HTMLButtonElement;
    showToastBtn.addEventListener('click', () => {
      toastManager.show('Hello from CASOON Atlas! 🎉', { type: 'success' });
    });

    // Accordion
    const accBtn1 = container.querySelector('#acc-btn-1') as HTMLButtonElement;
    const accBtn2 = container.querySelector('#acc-btn-2') as HTMLButtonElement;
    
    accBtn1.addEventListener('click', () => {
      accordion.toggle('panel1');
      updateAccordion();
    });
    
    accBtn2.addEventListener('click', () => {
      accordion.toggle('panel2'); 
      updateAccordion();
    });
    
    const updateAccordion = () => {
      const content1 = container.querySelector('#panel1-content') as HTMLElement;
      const content2 = container.querySelector('#panel2-content') as HTMLElement;
      
      content1.hidden = !accordion.isOpen('panel1');
      content2.hidden = !accordion.isOpen('panel2');
      
      accBtn1.setAttribute('aria-expanded', accordion.isOpen('panel1').toString());
      accBtn2.setAttribute('aria-expanded', accordion.isOpen('panel2').toString());
    };
    
    updateAccordion();
  }, 100);

  return container;
}

function createStylesDemo() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="demo-grid">
      <div class="demo-card cs-glass">
        <h3>Glass Morphism</h3>
        <p>Backdrop filter effects with various opacities and blur amounts.</p>
      </div>
      
      <div class="demo-card cs-glass-dark">
        <h3>Dark Glass</h3>
        <p>Dark variant of glass morphism effect.</p>
      </div>
      
      <div class="demo-card" style="background: var(--cs-gradient-ocean);">
        <h3>Ocean Gradient</h3>
        <p>Beautiful gradient backgrounds from the gradient system.</p>
      </div>
      
      <div class="demo-card cs-card-feature">
        <h3>Feature Card</h3>
        <p>Pre-styled feature card component with hover effects.</p>
      </div>
    </div>
  `;
  return container;
}

// Navigation
function initNavigation() {
  const nav = document.getElementById('nav')!;
  const main = document.getElementById('main')!;

  nav.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    const section = target.dataset.section;
    
    if (section && sections[section as keyof typeof sections]) {
      cleanup();
      main.innerHTML = '';
      
      // Update active state
      nav.querySelectorAll('button').forEach(btn => 
        btn.classList.toggle('active', btn === target)
      );
      
      // Load section
      const content = sections[section as keyof typeof sections]();
      main.appendChild(content);
    }
  });

  // Load default section
  (nav.querySelector('[data-section="effects"]') as HTMLButtonElement).click();
}

// Styles
function initStyles() {
  const styles = document.createElement('style');
  styles.textContent = `
    #app { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { text-align: center; margin-bottom: 2rem; }
    header h1 { margin: 0; font-size: 2.5rem; }
    header p { margin: 0.5rem 0 0; opacity: 0.8; }
    
    #nav { display: flex; gap: 1rem; justify-content: center; margin-bottom: 3rem; }
    #nav button { 
      padding: 0.75rem 1.5rem; 
      border: none; 
      border-radius: 0.5rem;
      background: rgba(255,255,255,0.1); 
      color: #e2e8f0; 
      cursor: pointer;
      transition: all 0.2s;
    }
    #nav button:hover, #nav button.active { 
      background: rgba(79,124,255,0.2); 
      transform: translateY(-2px);
    }
    
    .demo-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
      gap: 2rem; 
    }
    
    .demo-card { 
      padding: 1.5rem; 
      border-radius: 1rem; 
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.2s;
    }
    .demo-card:hover { transform: translateY(-4px); }
    .demo-card h3 { margin: 0 0 1rem; }
    
    .demo-target { 
      padding: 1rem; 
      margin: 1rem 0;
      border-radius: 0.5rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      text-align: center; 
      cursor: pointer;
      user-select: none;
    }
    
    .demo-button { 
      padding: 0.5rem 1rem; 
      border: none; 
      border-radius: 0.5rem;
      background: #3b82f6; 
      color: white; 
      cursor: pointer;
      transition: background 0.2s;
    }
    .demo-button:hover { background: #2563eb; }
    
    .modal-overlay { 
      position: fixed; 
      inset: 0; 
      background: rgba(0,0,0,0.5); 
      display: flex;
      align-items: center; 
      justify-content: center;
      z-index: 1000;
    }
    .modal-dialog { 
      padding: 2rem; 
      border-radius: 1rem; 
      max-width: 400px; 
      width: 90%; 
    }
    
    .tab-button { 
      padding: 0.5rem 1rem; 
      border: none;
      background: rgba(255,255,255,0.1); 
      color: #e2e8f0;
      cursor: pointer;
      border-radius: 0.25rem;
    }
    .tab-button.active { background: #3b82f6; }
    .tab-panel { padding: 1rem; margin-top: 1rem; }
    
    .accordion-button { 
      width: 100%; 
      padding: 1rem; 
      border: none;
      background: rgba(255,255,255,0.1); 
      color: #e2e8f0;
      text-align: left; 
      cursor: pointer;
      border-radius: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .accordion-content { 
      padding: 1rem; 
      background: rgba(255,255,255,0.05);
      border-radius: 0.25rem;
      margin-bottom: 1rem;
    }
  `;
  document.head.appendChild(styles);
}

// Initialize app
initStyles();
initNavigation();

console.log('🌟 CASOON Atlas Demo loaded!');