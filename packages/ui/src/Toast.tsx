import { Alert } from './Alert.tsx';

type ToastProps = { message?: string; tone?: 'success' | 'warning' | 'error'; onClose?: () => void };
export const Toast = ({ message, tone = 'success', onClose }: ToastProps) => {
  if (!message) return null;
  return (
    <div aria-live="polite" className="fixed right-4 bottom-4 z-50 max-w-sm">
      <Alert tone={tone} className="flex items-center justify-between gap-4 shadow-pulsio">
        <span>{message}</span>
        {onClose && (
          <button type="button" aria-label="Dismiss notification" onClick={onClose}>
            ×
          </button>
        )}
      </Alert>
    </div>
  );
};
