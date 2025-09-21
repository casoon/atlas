export interface CardOptions {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  interactive?: boolean;
  padding?: string;
}

export interface CardState {
  variant: string;
  getCardProps: () => object;
  getHeaderProps: () => object;
  getContentProps: () => object;
  getFooterProps: () => object;
}

export function createCard(options: CardOptions = {}): CardState {
  const { variant = 'default', interactive = false, padding = '1rem' } = options;

  const getCardProps = () => ({
    'data-card': true,
    'data-variant': variant,
    'data-interactive': interactive,
    style: { padding }
  });

  const getHeaderProps = () => ({ 'data-card-header': true });
  const getContentProps = () => ({ 'data-card-content': true });
  const getFooterProps = () => ({ 'data-card-footer': true });

  return { variant, getCardProps, getHeaderProps, getContentProps, getFooterProps };
}