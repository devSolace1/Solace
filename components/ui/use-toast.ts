export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    if (typeof window === 'undefined') return;

    // Minimal fallback for environments without a toast system.
    const message = options.description ? `${options.title}: ${options.description}` : options.title;
    // eslint-disable-next-line no-console
    console.log('[toast]', options.variant ?? 'default', message);

    // Provide a basic user-visible fallback
    if (options.variant === 'destructive') {
      window.alert(`⚠️ ${message}`);
    } else {
      window.alert(message);
    }
  };

  return { toast };
}
