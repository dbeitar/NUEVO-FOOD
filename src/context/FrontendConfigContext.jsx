import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { PUBLIC_BRAND_NAME } from '../utils/branding';
import { useI18n } from './useI18n';
import { getPublicBrandName } from '../utils/frontendConfigMerge';

const FrontendConfigContext = createContext({
  config: null,
  loading: true,
  reload: async () => {},
  brandName: PUBLIC_BRAND_NAME,
});

function applyThemeToDocument(config) {
  const root = document.documentElement;
  const mode = config?.theme_mode === 'light' ? 'light' : 'dark';
  root.setAttribute('data-theme', mode);
  const accent = (config?.brand?.accent_color || '#ffd700').trim();
  if (accent) {
    root.style.setProperty('--d28d-yellow', accent);
    root.style.setProperty('--d28d-yellow-hover', accent);
  }
}

export function FrontendConfigProvider({ children }) {
  const { lang } = useI18n();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/frontend-config/public');
      const data = r.data?.data || null;
      setConfig(data);
      if (data) applyThemeToDocument(data);
    } catch {
      setConfig(null);
      applyThemeToDocument({ theme_mode: 'dark', brand: { accent_color: '#ffd700' } });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const brandName = useMemo(
    () => getPublicBrandName(config, PUBLIC_BRAND_NAME, lang),
    [config, lang],
  );

  const value = useMemo(
    () => ({ config, loading, reload: load, brandName, lang }),
    [config, loading, load, brandName, lang],
  );

  return (
    <FrontendConfigContext.Provider value={value}>
      {children}
    </FrontendConfigContext.Provider>
  );
}

export function useFrontendConfig() {
  return useContext(FrontendConfigContext);
}
