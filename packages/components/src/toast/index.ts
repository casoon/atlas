export interface ToastOptions {
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface ToastItem {
  id: string;
  message: string;
  type: string;
  dismiss: () => void;
}

export function createToastManager() {
  const toasts = new Map<string, ToastItem>();
  
  const show = (message: string, options: ToastOptions = {}) => {
    const { duration = 3000, type = 'info' } = options;
    const id = Math.random().toString(36);
    
    const dismiss = () => toasts.delete(id);
    const toast: ToastItem = { id, message, type, dismiss };
    
    toasts.set(id, toast);
    if (duration > 0) setTimeout(dismiss, duration);
    
    return toast;
  };

  return { toasts, show };
}