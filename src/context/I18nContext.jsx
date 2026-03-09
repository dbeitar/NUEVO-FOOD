import { useEffect, useMemo, useState } from 'react';
import es from '../i18n/es';
import en from '../i18n/en';
import { I18nContext } from './i18nCtx';

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'es');
  const dict = useMemo(() => ({ es, en }), []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    const migrated = localStorage.getItem('lang_migrated_20260225');
    if (!migrated) {
      setLang('es');
      localStorage.setItem('lang_migrated_20260225', '1');
    }
  }, []);

  const t = (key, fallback) => {
    const table = dict[lang] || {};
    return table[key] ?? fallback ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
