import { useCallback, useState } from 'react';

/**
 * useToast - Hook para gestionar notificaciones toast
 *
 * @returns {Object} - { toast, showToast, hideToast }
 * @example
 * const { toast, showToast, hideToast } = useToast();
 *
 * // Mostrar toast de éxito
 * showToast('¡Operación exitosa!', 'success');
 *
 * // Mostrar toast de error
 * showToast('Algo salió mal', 'error');
 *
 * // En el render
 * {toast && <Toast {...toast} onClose={hideToast} />}
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
