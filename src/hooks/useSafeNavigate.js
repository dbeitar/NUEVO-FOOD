export default function useSafeNavigate() {
  return (to) => {
    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }
    if (to && typeof to === 'string') {
      window.location.assign(to);
    }
  };
}
