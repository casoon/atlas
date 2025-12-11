export interface TabsOptions {
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export interface TabProps {
  'aria-selected': boolean;
  'aria-controls': string;
  'aria-orientation'?: 'horizontal' | 'vertical';
  tabIndex: number;
  role: string;
  id: string;
}

export interface PanelProps {
  hidden: boolean;
  'aria-labelledby': string;
  role: string;
  id: string;
}

export interface TabsState {
  activeTab: string;
  orientation: 'horizontal' | 'vertical';
  setActiveTab: (tabId: string) => void;
  isActive: (tabId: string) => boolean;
  getTabProps: (tabId: string) => TabProps;
  getPanelProps: (tabId: string) => PanelProps;
  getTabListProps: () => {
    role: string;
    'aria-orientation': 'horizontal' | 'vertical';
  };
  subscribe: (callback: (activeTab: string) => void) => () => void;
  destroy: () => void;
}

/**
 * Creates a headless tabs component with accessible keyboard navigation.
 *
 * @param tabIds - Array of tab identifiers
 * @param options - Configuration options for the tabs
 * @returns A tabs state object with methods to manage tab state
 *
 * @example
 * ```typescript
 * const tabs = createTabs(['tab1', 'tab2', 'tab3'], {
 *   defaultTab: 'tab1',
 *   onChange: (tabId) => console.log('Active tab:', tabId)
 * });
 *
 * // Subscribe to state changes (useful for React, Vue, etc.)
 * const unsubscribe = tabs.subscribe((activeTab) => {
 *   console.log('Tab changed to:', activeTab);
 * });
 *
 * // Get props for tab buttons
 * const tab1Props = tabs.getTabProps('tab1');
 *
 * // Get props for tab panels
 * const panel1Props = tabs.getPanelProps('tab1');
 *
 * // Clean up when done
 * tabs.destroy();
 * ```
 */
export function createTabs(tabIds: string[], options: TabsOptions = {}): TabsState {
  if (!tabIds || tabIds.length === 0) {
    throw new Error('[Atlas Tabs] tabIds must be a non-empty array');
  }

  const { defaultTab = tabIds[0], onChange, orientation = 'horizontal' } = options;

  if (!tabIds.includes(defaultTab)) {
    throw new Error(`[Atlas Tabs] defaultTab "${defaultTab}" is not in tabIds`);
  }

  let activeTab = defaultTab;
  const subscribers = new Set<(activeTab: string) => void>();

  const notifySubscribers = () => {
    subscribers.forEach((callback) => callback(activeTab));
  };

  const setActiveTab = (tabId: string) => {
    if (!tabIds.includes(tabId)) {
      console.warn(`[Atlas Tabs] Invalid tab ID: "${tabId}"`);
      return;
    }

    if (tabId !== activeTab) {
      activeTab = tabId;
      onChange?.(tabId);
      notifySubscribers();
    }
  };

  const isActive = (tabId: string) => tabId === activeTab;

  const getTabProps = (tabId: string): TabProps => ({
    'aria-selected': isActive(tabId),
    'aria-controls': `panel-${tabId}`,
    tabIndex: isActive(tabId) ? 0 : -1,
    role: 'tab',
    id: `tab-${tabId}`,
  });

  const getPanelProps = (tabId: string): PanelProps => ({
    hidden: !isActive(tabId),
    'aria-labelledby': `tab-${tabId}`,
    role: 'tabpanel',
    id: `panel-${tabId}`,
  });

  const getTabListProps = () => ({
    role: 'tablist',
    'aria-orientation': orientation,
  });

  const subscribe = (callback: (activeTab: string) => void) => {
    subscribers.add(callback);
    // Call immediately with current state
    callback(activeTab);
    // Return unsubscribe function
    return () => {
      subscribers.delete(callback);
    };
  };

  const destroy = () => {
    subscribers.clear();
  };

  return {
    get activeTab() {
      return activeTab;
    },
    get orientation() {
      return orientation;
    },
    setActiveTab,
    isActive,
    getTabProps,
    getPanelProps,
    getTabListProps,
    subscribe,
    destroy,
  };
}
