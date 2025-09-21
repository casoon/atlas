export interface TabsOptions {
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export interface TabsState {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isActive: (tabId: string) => boolean;
  getTabProps: (tabId: string) => { 'aria-selected': boolean; tabIndex: number; role: string };
  getPanelProps: (tabId: string) => { hidden: boolean; 'aria-labelledby': string; role: string };
}

export function createTabs(tabIds: string[], options: TabsOptions = {}): TabsState {
  const { defaultTab = tabIds[0], onChange, orientation = 'horizontal' } = options;
  let activeTab = defaultTab;

  const setActiveTab = (tabId: string) => {
    if (tabIds.includes(tabId) && tabId !== activeTab) {
      activeTab = tabId;
      onChange?.(tabId);
    }
  };

  const isActive = (tabId: string) => tabId === activeTab;

  const getTabProps = (tabId: string) => ({
    'aria-selected': isActive(tabId),
    tabIndex: isActive(tabId) ? 0 : -1,
    role: 'tab'
  });

  const getPanelProps = (tabId: string) => ({
    hidden: !isActive(tabId),
    'aria-labelledby': tabId,
    role: 'tabpanel'
  });

  return {
    get activeTab() { return activeTab; },
    setActiveTab,
    isActive,
    getTabProps,
    getPanelProps
  };
}