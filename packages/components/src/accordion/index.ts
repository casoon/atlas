export interface AccordionOptions {
  collapsible?: boolean;
  multiple?: boolean;
  defaultOpen?: string[];
}

export interface AccordionState {
  openPanels: Set<string>;
  toggle: (panelId: string) => void;
  open: (panelId: string) => void;
  close: (panelId: string) => void;
  isOpen: (panelId: string) => boolean;
  getButtonProps: (panelId: string) => object;
  getPanelProps: (panelId: string) => object;
}

export function createAccordion(panelIds: string[], options: AccordionOptions = {}): AccordionState {
  const { collapsible = true, multiple = false, defaultOpen = [] } = options;
  const openPanels = new Set(defaultOpen);

  const toggle = (panelId: string) => {
    if (openPanels.has(panelId)) {
      if (collapsible || openPanels.size > 1) openPanels.delete(panelId);
    } else {
      if (!multiple) openPanels.clear();
      openPanels.add(panelId);
    }
  };

  const open = (panelId: string) => {
    if (!multiple) openPanels.clear();
    openPanels.add(panelId);
  };

  const close = (panelId: string) => {
    if (collapsible || openPanels.size > 1) openPanels.delete(panelId);
  };

  const isOpen = (panelId: string) => openPanels.has(panelId);

  const getButtonProps = (panelId: string) => ({
    'aria-expanded': isOpen(panelId),
    'aria-controls': `panel-${panelId}`
  });

  const getPanelProps = (panelId: string) => ({
    id: `panel-${panelId}`,
    'aria-labelledby': `button-${panelId}`,
    hidden: !isOpen(panelId)
  });

  return { openPanels, toggle, open, close, isOpen, getButtonProps, getPanelProps };
}