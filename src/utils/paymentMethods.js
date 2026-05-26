import api from '../services/api';

const FALLBACK = [
  { id: 'wompi_online', label: 'Pago en línea (Wompi)', url: 'https://checkout.wompi.co/l/test_VPOS_Y0ivU1' },
  { id: 'pago_sede', label: 'Pago en sede', url: null },
];

export async function fetchPaymentMethods(moduleCode = 'd28d') {
  try {
    const r = await api.get(`/payment-links/public?module=${encodeURIComponent(moduleCode)}`);
    const methods = r.data?.data?.methods;
    if (Array.isArray(methods) && methods.length) return methods;
  } catch { /* fallback */ }
  return FALLBACK;
}

export function openWompiCheckout(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
