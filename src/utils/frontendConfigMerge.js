import { pickLocalized } from './localizedField';

/** Fusiona definiciones estáticas con la config guardada en el maestro de apariencia. */
export function mergeServiceDef(base, config, serviceId, adminMode, lang = 'es') {
  const o = config?.services?.[serviceId];
  if (!o) {
    return {
      ...base,
      title: pickLocalized(base, 'title', lang, base.title),
      desc: adminMode
        ? pickLocalized(base, 'descAdmin', lang, base.descAdmin || base.desc)
        : pickLocalized(base, 'desc', lang, base.desc),
      img: base.img,
      alt: pickLocalized(base, 'alt', lang, base.alt),
    };
  }
  const title = pickLocalized(o, 'title', lang, base.title);
  const desc = adminMode
    ? pickLocalized(o, 'desc_admin', lang, pickLocalized(o, 'desc', lang, base.descAdmin || base.desc))
    : pickLocalized(o, 'desc', lang, base.desc);
  return {
    ...base,
    title,
    desc,
    img: o.img || base.img,
    alt: pickLocalized(o, 'alt', lang, base.alt),
  };
}

export function getMastersFromConfig(config, defaults, lang = 'es') {
  return defaults.map((m) => {
    const o = config?.masters?.[m.id] || {};
    return {
      ...m,
      title: pickLocalized(o, 'title', lang, m.title),
      desc: pickLocalized(o, 'desc', lang, m.desc),
      img: o.img || m.img,
      alt: pickLocalized(o, 'alt', lang, m.alt),
    };
  });
}

export function getProgramsFromConfig(config, defaults, lang = 'es') {
  return defaults.map((p) => {
    const o = config?.programs?.[p.id] || {};
    return {
      ...p,
      name: pickLocalized(o, 'name', lang, p.name),
      desc: pickLocalized(o, 'desc', lang, p.desc),
      img: o.img || p.img,
      accent: o.accent || '#ffd700',
    };
  });
}

export function getPublicBrandName(config, fallback, lang = 'es') {
  const name = pickLocalized(config?.brand || {}, 'name', lang, '');
  return name || fallback;
}

export function getPublicBrandLogo(config) {
  return (config?.brand?.logo_url || '').trim();
}

const PANEL_FALLBACK = {
  hero: { title: '', subtitle: '', img: '' },
  cards: {},
};

export function getPanelView(config, panelId, lang = 'es') {
  const p = config?.panels?.[panelId];
  if (!p) return { ...PANEL_FALLBACK, cards: {} };
  return {
    hero: {
      title: pickLocalized(p.hero || {}, 'title', lang, ''),
      subtitle: pickLocalized(p.hero || {}, 'subtitle', lang, ''),
      img: p.hero?.img || '',
    },
    cards: p.cards && typeof p.cards === 'object' ? p.cards : {},
  };
}

export function getPanelCardText(config, panelId, cardId, field, lang, t, fallbackKey) {
  const c = config?.panels?.[panelId]?.cards?.[cardId] || {};
  const fromConfig = pickLocalized(c, field, lang, '');
  if (fromConfig) return fromConfig;
  if (t && fallbackKey) return t(fallbackKey, '');
  return '';
}
