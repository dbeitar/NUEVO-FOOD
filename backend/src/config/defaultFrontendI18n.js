/** Textos EN por defecto para tarjetas y copy del front (fusionados en normalize). */
const EN_OVERLAY = {
  brand: {
    name_en: 'D28D GYM VIRTUAL',
    tagline_en: 'Train live with the best professionals.',
  },
  auth: {
    line_white_en: 'TRAIN LIVE',
    line_yellow_1_en: 'WITH THE BEST',
    line_yellow_2_en: 'PROFESSIONALS',
    subtitle_en:
      'Real gym energy from home. Join the D28D community and transform your life today.',
    cta_label_en: 'VIEW CLASSES',
  },
  services: {
    d28d: {
      title_en: 'D28D',
      desc_en: 'Vital, Pancitas and Virtual D28D programs + your gym.',
      desc_admin_en: 'Programs, white-label gyms, live classes and gallery.',
    },
    'food-plan': {
      title_en: 'Nutrition Plan',
      desc_en: 'Your nutrition guided by your team.',
      desc_admin_en: 'Calculator, foods, equivalents, recipes and logging.',
    },
    training: {
      title_en: 'Trainers',
      desc_en: 'Your daily routine and coach follow-up.',
      desc_admin_en: 'Routines, gallery and assigned users.',
    },
    gym: {
      title_en: 'Gym',
      desc_en: 'Your brand, users and subscriptions.',
      desc_admin_en: 'White label, users and gym operations.',
    },
    'live-classes': {
      title_en: 'Live Classes',
      desc_en: 'Live class schedule and meeting links.',
      desc_admin_en: 'Class templates, Zoom links and attendance.',
    },
  },
  masters: {
    d28d: {
      title_en: 'D28D',
      desc_en: 'Programs, live classes, gallery and white-label gyms.',
    },
    'food-plan': {
      title_en: 'Nutrition Plan',
      desc_en: 'Calculator, food catalog, recipes, equivalents and meal plans.',
    },
    training: {
      title_en: 'Trainers',
      desc_en: 'Trainers, routines, video gallery and user assignment.',
    },
  },
  programs: {
    vital: { name_en: 'Vital D28D', desc_en: 'Integral wellness and women’s health.' },
    pancitas: { name_en: 'Pancitas Fit', desc_en: 'Specialized pregnancy training.' },
    virtual_d28d: { name_en: 'Virtual D28D', desc_en: 'Classic 28-day transformation program.' },
  },
  panels: {
    'food-plan': {
      hero: {
        title_en: 'Nutrition Plan',
        subtitle_en: 'Plans, foods and nutrition tools.',
      },
      cards: {
        adminusers: { title_en: 'Users', desc_en: 'People with an assigned nutrition plan.' },
        admin: { title_en: 'Configure plans', desc_en: 'Define or adjust each user’s plan.' },
        progress: { title_en: 'Tracking', desc_en: 'Nutrition compliance and progress.' },
        calculator: { title_en: 'Nutrition calculator', desc_en: 'Initial reference for the user.' },
        foodsmanager: { title_en: 'Food catalog', desc_en: 'Food list, macros and portions.' },
        foodlog: { title_en: 'Food log', desc_en: 'Users’ nutrition diary.' },
        equivalentes: { title_en: 'Group equivalents', desc_en: 'Swaps keeping macros.' },
        recipes: { title_en: 'Recipes', desc_en: 'Healthy recipe library.' },
        modulevigencias: { title_en: 'Subscriptions', desc_en: 'Payment confirmation and license extensions.' },
      },
    },
    training: {
      hero: { title_en: 'Trainers', subtitle_en: 'Routines, assignments and tracking.' },
      cards: {
        training: { title_en: 'My training', desc_en: 'Today’s routine with substitutions.' },
        admintraining: { title_en: 'Routines', desc_en: 'Templates, assignments and log.' },
        admintrainers: { title_en: 'Trainers', desc_en: 'Coach accounts, capacity and linked users.' },
        coachai: { title_en: 'AI Assistant', desc_en: 'Build routines and plans from your gallery.' },
        admingallery: { title_en: 'Video gallery', desc_en: 'Exercise reference videos.' },
        adminusers: { title_en: 'Assigned users', desc_en: 'People and assigned routines.' },
        progress: { title_en: 'Tracking', desc_en: 'User adherence and progress.' },
      },
    },
    gym: {
      hero: {
        title_en: 'Gym',
        subtitle_en: 'White label, users and subscriptions. D28D classes stay in the D28D module.',
      },
      cards: {
        admingyms: { title_en: 'My brand', desc_en: 'Logo, colors, message and support WhatsApp.' },
        adminusers: { title_en: 'Users', desc_en: 'Sign-ups, roles and licenses.' },
        adminplans: { title_en: 'Subscriptions', desc_en: 'Accounts and expiry dates.' },
        liveclasses: { title_en: 'Live classes', desc_en: 'D28D classes enabled for your gym.' },
      },
    },
    d28d: {
      hero: {
        title_en: 'D28D · Programs',
        subtitle_en: 'Programs, live classes and video gallery.',
      },
      cards: {
        liveclasses: { title_en: 'Live classes & meetings', desc_en: 'Templates and Zoom calendar.' },
        programs: { title_en: 'D28D programs', desc_en: 'Cycles and 3 main programs settings.' },
        'd28d-routines': { title_en: 'D28D routines', desc_en: 'Routine templates for live classes and training.' },
        'd28d-challenges-admin': { title_en: 'D28D challenges', desc_en: 'Create challenges, evidence and winner podium.' },
        admingallery: { title_en: 'Video gallery', desc_en: 'Exercise videos for routines.' },
        adminliveclasses: { title_en: 'Live classes (gym)', desc_en: 'Schedule and attendance for your gym.' },
        admingyms: { title_en: 'Gyms', desc_en: 'Branding and white-label setup.' },
        adminusers: { title_en: 'Gym users', desc_en: 'Affiliated people management.' },
        admincompanies: { title_en: 'Companies & agreements', desc_en: 'Corporate agreements.' },
      },
    },
    'live-classes': {
      hero: {
        title_en: 'Live Classes',
        subtitle_en: 'Schedule, templates and meeting links.',
      },
      cards: {},
    },
  },
};

function mergeSection(target, overlay) {
  if (!overlay || typeof overlay !== 'object') return target;
  const out = { ...target };
  for (const key of Object.keys(overlay)) {
    const ov = overlay[key];
    const tv = out[key];
    if (ov && typeof ov === 'object' && !Array.isArray(ov) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      out[key] = mergeSection(tv, ov);
    } else if (ov !== undefined) {
      out[key] = ov;
    }
  }
  return out;
}

function applyEnglishOverlay(config) {
  const c = { ...config };
  if (EN_OVERLAY.brand) c.brand = mergeSection(c.brand || {}, EN_OVERLAY.brand);
  if (EN_OVERLAY.auth) c.auth = mergeSection(c.auth || {}, EN_OVERLAY.auth);
  if (EN_OVERLAY.services) {
    c.services = { ...c.services };
    for (const [id, en] of Object.entries(EN_OVERLAY.services)) {
      c.services[id] = mergeSection(c.services[id] || {}, en);
    }
  }
  if (EN_OVERLAY.masters) {
    c.masters = { ...c.masters };
    for (const [id, en] of Object.entries(EN_OVERLAY.masters)) {
      c.masters[id] = mergeSection(c.masters[id] || {}, en);
    }
  }
  if (EN_OVERLAY.programs) {
    c.programs = { ...c.programs };
    for (const [id, en] of Object.entries(EN_OVERLAY.programs)) {
      c.programs[id] = mergeSection(c.programs[id] || {}, en);
    }
  }
  if (EN_OVERLAY.panels) {
    c.panels = { ...c.panels };
    for (const [id, en] of Object.entries(EN_OVERLAY.panels)) {
      const panel = c.panels[id] || {};
      c.panels[id] = {
        ...panel,
        hero: mergeSection(panel.hero || {}, en.hero || {}),
        cards: { ...panel.cards },
      };
      if (en.cards) {
        for (const [cid, cen] of Object.entries(en.cards)) {
          c.panels[id].cards[cid] = mergeSection(c.panels[id].cards[cid] || {}, cen);
        }
      }
    }
  }
  return c;
}

module.exports = { applyEnglishOverlay };
