import { useEffect } from 'react';
import { useToast } from '../ui/Toast';

export default function GlobalAiErrorAlerts() {
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {};
      const message = String(detail.message || 'AI request failed');
      const status = detail.status != null ? `(${detail.status}) ` : '';
      showToast({
        title: 'AI Error',
        description: `${status}${message}`,
        variant: 'error',
        duration: 7000,
      });
    };
    window.addEventListener('salespal:ai-error', handler);
    return () => window.removeEventListener('salespal:ai-error', handler);
  }, [showToast]);

  return null;
}
