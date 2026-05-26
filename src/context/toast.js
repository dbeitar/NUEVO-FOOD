import { useContext } from 'react';
import { ToastContext } from './toastCtx';

export const useToast = () => useContext(ToastContext);

export const emitToast = (payload) => {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: payload }));
};
