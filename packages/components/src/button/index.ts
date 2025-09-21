export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

export interface ButtonState {
  variant: string;
  size: string;
  disabled: boolean;
  loading: boolean;
  getButtonProps: () => object;
  setLoading: (loading: boolean) => void;
  setDisabled: (disabled: boolean) => void;
}

export function createButton(options: ButtonOptions = {}): ButtonState {
  let { variant = 'primary', size = 'md', disabled = false, loading = false } = options;

  const getButtonProps = () => ({
    'data-variant': variant,
    'data-size': size,
    disabled: disabled || loading,
    'aria-busy': loading,
    type: 'button'
  });

  const setLoading = (newLoading: boolean) => { loading = newLoading; };
  const setDisabled = (newDisabled: boolean) => { disabled = newDisabled; };

  return {
    get variant() { return variant; },
    get size() { return size; },
    get disabled() { return disabled; },
    get loading() { return loading; },
    getButtonProps,
    setLoading,
    setDisabled
  };
}