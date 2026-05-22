import { getPanelCardText } from './frontendConfigMerge';

/** Texto de tarjeta de panel: config bilingüe + claves i18n de respaldo. */
export function panelCardText(t, config, panelId, cardId, field, lang) {
  const key = `panel.${panelId}.cards.${cardId}.${field}`;
  const i18nFallback = t(key, '');
  return getPanelCardText(config, panelId, cardId, field, lang, t, key) || i18nFallback;
}
