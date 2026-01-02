import { memo, useEffect } from 'react';

/**
 * Toast - Notificación temporal para feedback al usuario
 * Se auto-cierra después de 3 segundos
 * Memoizado para evitar re-renders cuando las props no cambian
 *
 * @param {Object} props
 * @param {string} props.message - Mensaje a mostrar
 * @param {'success'|'error'|'info'} props.type - Tipo de toast (afecta el color)
 * @param {Function} props.onClose - Callback cuando el toast se cierra
 */
const Toast = memo(function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColorClass = {
    success: 'bg-emerald-50 border-emerald-400 text-emerald-900',
    error: 'bg-red-50 border-red-400 text-red-900',
    info: 'bg-accent2/30 border-accent text-ink'
  }[type];

  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-24 right-6 z-50 ${bgColorClass} border px-4 py-3 rounded-lg shadow-lift animate-fade-up max-w-sm`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg" aria-hidden="true">{iconMap[type]}</span>
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 text-muted hover:text-ink transition"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>
    </div>
  );
});

export default Toast;
