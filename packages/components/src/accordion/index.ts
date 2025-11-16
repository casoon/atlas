export interface AccordionOptions {
  collapsible?: boolean;
  multiple?: boolean;
  defaultOpen?: string[];
  onChange?: (openPanels: Set<string>) => void;
}

export interface AccordionState {
  getOpenPanels: () => ReadonlySet<string>;
  toggle: (panelId: string) => void;
  open: (panelId: string) => void;
  close: (panelId: string) => void;
  isOpen: (panelId: string) => boolean;
  getButtonProps: (panelId: string) => object;
  getPanelProps: (panelId: string) => object;
  subscribe: (callback: (openPanels: Set<string>) => void) => () => void;
  destroy: () => void;
}

/**
 * Creates a headless accordion component with accessible ARIA attributes.
 *
 * @param panelIds - Array of panel identifiers
 * @param options - Configuration options for the accordion
 * @returns An accordion state object with methods to manage panel state
 *
 * @example
 * ```typescript
 * const accordion = createAccordion(['panel1', 'panel2', 'panel3'], {
 *   collapsible: true,
 *   multiple: false,
 *   defaultOpen: ['panel1'],
 *   onChange: (openPanels) => console.log('Open panels:', [...openPanels])
 * });
 *
 * // Subscribe to state changes (useful for React, Vue, etc.)
 * const unsubscribe = accordion.subscribe((openPanels) => {
 *   console.log('Panels changed:', [...openPanels]);
 * });
 *
 * // Toggle a panel
 * accordion.toggle('panel1');
 *
 * // Get props for accordion buttons
 * const button1Props = accordion.getButtonProps('panel1');
 *
 * // Get props for accordion panels
 * const panel1Props = accordion.getPanelProps('panel1');
 *
 * // Clean up when done
 * accordion.destroy();
 * ```
 */
export function createAccordion(panelIds: string[], options: AccordionOptions = {}): AccordionState {
  if (!panelIds || panelIds.length === 0) {
    throw new Error('[Atlas Accordion] panelIds must be a non-empty array');
  }

  const { collapsible = true, multiple = false, defaultOpen = [], onChange } = options;

  // Validate defaultOpen
  const invalidPanels = defaultOpen.filter((id) => !panelIds.includes(id));
  if (invalidPanels.length > 0) {
    throw new Error(
      `[Atlas Accordion] defaultOpen contains invalid panel IDs: ${invalidPanels.join(', ')}`
    );
  }

  let openPanels = new Set(defaultOpen);
  const subscribers = new Set<(openPanels: Set<string>) => void>();

  const notifySubscribers = () => {
    onChange?.(new Set(openPanels));
    subscribers.forEach((callback) => callback(new Set(openPanels)));
  };

  const toggle = (panelId: string) => {
    if (!panelIds.includes(panelId)) {
      console.warn(`[Atlas Accordion] Invalid panel ID: "${panelId}"`);
      return;
    }

    const wasOpen = openPanels.has(panelId);

    if (wasOpen) {
      if (collapsible || openPanels.size > 1) {
        openPanels.delete(panelId);
        notifySubscribers();
      }
    } else {
      if (!multiple) {
        openPanels.clear();
      }
      openPanels.add(panelId);
      notifySubscribers();
    }
  };

  const open = (panelId: string) => {
    if (!panelIds.includes(panelId)) {
      console.warn(`[Atlas Accordion] Invalid panel ID: "${panelId}"`);
      return;
    }

    const wasAlreadyOpen = openPanels.has(panelId);

    if (!multiple) {
      openPanels.clear();
    }
    openPanels.add(panelId);

    if (!wasAlreadyOpen || !multiple) {
      notifySubscribers();
    }
  };

  const close = (panelId: string) => {
    if (!panelIds.includes(panelId)) {
      console.warn(`[Atlas Accordion] Invalid panel ID: "${panelId}"`);
      return;
    }

    if (openPanels.has(panelId) && (collapsible || openPanels.size > 1)) {
      openPanels.delete(panelId);
      notifySubscribers();
    }
  };

  const isOpen = (panelId: string) => openPanels.has(panelId);

  const getButtonProps = (panelId: string) => ({
    'aria-expanded': isOpen(panelId),
    'aria-controls': `panel-${panelId}`,
    id: `button-${panelId}`,
    role: 'button',
    tabIndex: 0
  });

  const getPanelProps = (panelId: string) => ({
    id: `panel-${panelId}`,
    'aria-labelledby': `button-${panelId}`,
    role: 'region',
    hidden: !isOpen(panelId)
  });

  const subscribe = (callback: (openPanels: Set<string>) => void) => {
    subscribers.add(callback);
    // Call immediately with current state
    callback(new Set(openPanels));
    // Return unsubscribe function
    return () => {
      subscribers.delete(callback);
    };
  };

  const getOpenPanels = (): ReadonlySet<string> => new Set(openPanels);

  const destroy = () => {
    subscribers.clear();
    openPanels.clear();
  };

  return {
    getOpenPanels,
    toggle,
    open,
    close,
    isOpen,
    getButtonProps,
    getPanelProps,
    subscribe,
    destroy
  };
}