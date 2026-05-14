import { useInRouterContext, BrowserRouter } from 'react-router-dom';

export default function RouterBoundary({ children }) {
  const inContext = useInRouterContext();
  if (inContext) return children;
  return <BrowserRouter>{children}</BrowserRouter>;
}

