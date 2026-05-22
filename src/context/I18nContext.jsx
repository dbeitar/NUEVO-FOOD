import { useCallback, useEffect, useMemo, useState } from 'react';
import es from '../i18n/es';
import en from '../i18n/en';
import { I18nContext } from './i18nCtx';

function applyVars(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? '')),
    str,
  );
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('lang') || 'es';
    } catch {
      return 'es';
    }
  });
  const dict = useMemo(() => ({ es, en }), []);

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
      document.documentElement.lang = lang;
    } catch { /* noop */ }
  }, [lang]);

  useEffect(() => {
    const migrated = localStorage.getItem('lang_migrated_20260225');
    if (!migrated) {
      setLang('es');
      localStorage.setItem('lang_migrated_20260225', '1');
    }
  }, []);

  const t = useCallback((key, fallback, vars) => {
    const table = dict[lang] || dict.es || {};
    const raw = table[key] ?? fallback ?? key;
    return applyVars(raw, vars);
  }, [lang, dict]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
