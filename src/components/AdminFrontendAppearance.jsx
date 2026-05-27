import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useFrontendConfig } from '../context/FrontendConfigContext';
import { useI18n } from '../context/useI18n';
import ImageSourceField from './admin/ImageSourceField';
import { BilingualTextField } from './admin/BilingualFields';
import { resolveMediaUrl } from '../utils/mediaUrl';

const SERVICE_IDS = [
  { id: 'd28d', label: 'D28D' },
  { id: 'food-plan', label: 'FOOD_PLAN' },
  { id: 'training', label: 'Entrenadores' },
  { id: 'gym', label: 'Gimnasio' },
  { id: 'live-classes', label: 'Clases en Vivo' },
];

const MASTER_IDS = [
  { id: 'd28d', label: 'Maestro D28D' },
  { id: 'food-plan', label: 'Maestro FOOD_PLAN' },
  { id: 'training', label: 'Maestro Entrenadores' },
];

const PROGRAM_IDS = [
  { id: 'vital', label: 'Vital D28D' },
  { id: 'pancitas', label: 'Pancitas Fit' },
  { id: 'virtual_d28d', label: 'Virtual D28D' },
];

const PANEL_IDS = [
  { id: 'food-plan', label: 'Panel FOOD_PLAN' },
  { id: 'training', label: 'Panel Entrenadores' },
  { id: 'gym', label: 'Panel Gimnasio' },
  { id: 'd28d', label: 'Panel D28D' },
  { id: 'live-classes', label: 'Panel Clases en vivo' },
];

const TAB_KEYS = [
  { id: 'theme', key: 'appearance.tab.theme' },
  { id: 'brand', key: 'appearance.tab.brand' },
  { id: 'auth', key: 'appearance.tab.auth' },
  { id: 'services', key: 'appearance.tab.services' },
  { id: 'masters', key: 'appearance.tab.masters' },
  { id: 'programs', key: 'appearance.tab.programs' },
  { id: 'panels', key: 'appearance.tab.panels' },
];

function emptyConfig() {
  return {
    theme_mode: 'dark',
    brand: { name: '', tagline: '', accent_color: '#ffd700', logo_url: '', logo_alt: '' },
    auth: { line_white: '', line_yellow_1: '', line_yellow_2: '', subtitle: '', cta_label: '' },
    services: {},
    masters: {},
    programs: {},
    panels: {},
  };
}

function ServiceEditor({ row, id, label, onPatch, t }) {
  const titleField = 'title';
  return (
    <div className="card admin-service-editor">
      <h3 className="d28d-section-title">{label}</h3>
      <div className="admin-service-editor-grid">
        <ImageSourceField
          label={t('appearance.img_card', 'Imagen de tarjeta')}
          alt={row.alt || label}
          value={row.img || ''}
          onChange={(v) => onPatch(id, 'img', v)}
        />
        <div className="space-y-3">
          <label className="block">
            <span className="d28d-label">{t('appearance.alt', 'Texto alternativo')}</span>
            <input className="input w-full mt-1" value={row.alt || ''} onChange={(e) => onPatch(id, 'alt', e.target.value)} />
          </label>
          <BilingualTextField
            label={t('appearance.card_title', 'Título')}
            valueEs={row[titleField] || ''}
            valueEn={row[`${titleField}_en`] || ''}
            onChangeEs={(v) => onPatch(id, titleField, v)}
            onChangeEn={(v) => onPatch(id, `${titleField}_en`, v)}
          />
          <BilingualTextField
            label={t('appearance.desc_user', 'Descripción (usuario)')}
            multiline
            valueEs={row.desc || ''}
            valueEn={row.desc_en || ''}
            onChangeEs={(v) => onPatch(id, 'desc', v)}
            onChangeEn={(v) => onPatch(id, 'desc_en', v)}
          />
          <BilingualTextField
            label={t('appearance.desc_admin', 'Descripción (admin)')}
            multiline
            valueEs={row.desc_admin || ''}
            valueEn={row.desc_admin_en || ''}
            onChangeEs={(v) => onPatch(id, 'desc_admin', v)}
            onChangeEn={(v) => onPatch(id, 'desc_admin_en', v)}
          />
        </div>
      </div>
    </div>
  );
}

function SimpleAssetEditor({ row, id, label, onPatch, titleKey = 'title', t }) {
  const titleEnKey = `${titleKey}_en`;
  const titleLabel = titleKey === 'name' ? t('appearance.name', 'Nombre') : t('appearance.card_title', 'Título');
  return (
    <div className="card admin-service-editor">
      <h3 className="d28d-section-title">{label}</h3>
      <div className="admin-service-editor-grid">
        <ImageSourceField
          label={t('appearance.img', 'Imagen')}
          value={row.img || ''}
          onChange={(v) => onPatch(id, 'img', v)}
        />
        <div className="space-y-3">
          <BilingualTextField
            label={titleLabel}
            valueEs={row[titleKey] || ''}
            valueEn={row[titleEnKey] || ''}
            onChangeEs={(v) => onPatch(id, titleKey, v)}
            onChangeEn={(v) => onPatch(id, titleEnKey, v)}
          />
          <BilingualTextField
            label={t('appearance.desc', 'Descripción')}
            multiline
            valueEs={row.desc || ''}
            valueEn={row.desc_en || ''}
            onChangeEs={(v) => onPatch(id, 'desc', v)}
            onChangeEn={(v) => onPatch(id, 'desc_en', v)}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminFrontendAppearance() {
  const { t } = useI18n();
  const { reload: reloadPublic } = useFrontendConfig();
  const [tab, setTab] = useState('services');
  const [panelId, setPanelId] = useState('food-plan');
  const [config, setConfig] = useState(emptyConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/frontend-config/admin');
      setConfig(r.data?.data || emptyConfig());
    } catch {
      setError(t('appearance.load_error', 'No se pudo cargar la configuración'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (path, value) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        const k = keys[i];
        if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
        cur = cur[k];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const patchNested = (section, id, field, value) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[section]) next[section] = {};
      if (!next[section][id]) next[section][id] = {};
      next[section][id][field] = value;
      return next;
    });
  };

  const patchPanelHero = (field, value) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.panels) next.panels = {};
      if (!next.panels[panelId]) next.panels[panelId] = { hero: {}, cards: {} };
      if (!next.panels[panelId].hero) next.panels[panelId].hero = {};
      next.panels[panelId].hero[field] = value;
      return next;
    });
  };

  const patchPanelCard = (cardId, field, value) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.panels) next.panels = {};
      if (!next.panels[panelId]) next.panels[panelId] = { hero: {}, cards: {} };
      if (!next.panels[panelId].cards) next.panels[panelId].cards = {};
      if (!next.panels[panelId].cards[cardId]) next.panels[panelId].cards[cardId] = {};
      next.panels[panelId].cards[cardId][field] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setOk('');
    try {
      await api.put('/frontend-config/admin', { config });
      await load();
      await reloadPublic();
      setOk(t('appearance.save_ok', 'Configuración guardada.'));
    } catch {
      setError(t('appearance.save_error', 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm(t('appearance.reset_confirm', '¿Restaurar valores por defecto D28D?'))) return;
    setSaving(true);
    try {
      await api.post('/frontend-config/admin/reset');
      await load();
      await reloadPublic();
      setOk(t('appearance.reset_ok', 'Valores por defecto restaurados.'));
    } catch {
      setError(t('appearance.reset_error', 'No se pudo restaurar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="d28d-text-muted">{t('appearance.loading', 'Cargando maestro de apariencia…')}</p>;

  const panel = config.panels?.[panelId] || { hero: {}, cards: {} };
  const cardIds = Object.keys(panel.cards || {});

  return (
    <div className="admin-appearance space-y-6">
      <header>
        <h2 className="d28d-page-title">{t('appearance.title', 'Maestro de apariencia')}</h2>
        <p className="d28d-text-muted">{t('appearance.subtitle', '')}</p>
      </header>

      {error && <p className="d28d-text-danger">{error}</p>}
      {ok && <p className="d28d-text-accent">{ok}</p>}

      <div className="admin-appearance-tabs">
        {TAB_KEYS.map((tabItem) => (
          <button key={tabItem.id} type="button" className={tab === tabItem.id ? 'admin-tab active' : 'admin-tab'} onClick={() => setTab(tabItem.id)}>
            {t(tabItem.key, tabItem.id)}
          </button>
        ))}
      </div>

      {tab === 'theme' && (
        <div className="card space-y-4">
          <h3 className="d28d-section-title">{t('appearance.theme_title', 'Tema visual')}</h3>
          <p className="d28d-text-muted" style={{ fontSize: '0.85rem' }}>{t('appearance.theme_hint', '')}</p>
          <div className="admin-theme-picker">
            <label className={`admin-theme-option ${config.theme_mode === 'dark' ? 'selected' : ''}`}>
              <input type="radio" name="theme_mode" value="dark" checked={config.theme_mode === 'dark'} onChange={() => patch('theme_mode', 'dark')} />
              <span>{t('appearance.theme_dark', 'Oscuro')}</span>
            </label>
            <label className={`admin-theme-option ${config.theme_mode === 'light' ? 'selected' : ''}`}>
              <input type="radio" name="theme_mode" value="light" checked={config.theme_mode === 'light'} onChange={() => patch('theme_mode', 'light')} />
              <span>{t('appearance.theme_light', 'Claro')}</span>
            </label>
          </div>
          <label className="block">
            <span className="d28d-label">{t('appearance.accent', 'Color acento')}</span>
            <div className="flex gap-3 items-center mt-1">
              <input type="color" value={config.brand?.accent_color || '#ffd700'} onChange={(e) => patch('brand.accent_color', e.target.value)} />
              <input className="input flex-1" value={config.brand?.accent_color || '#ffd700'} onChange={(e) => patch('brand.accent_color', e.target.value)} />
            </div>
          </label>
        </div>
      )}

      {tab === 'brand' && (
        <div className="card space-y-4">
          <h3 className="d28d-section-title">{t('appearance.brand_title', 'Marca pública')}</h3>
          <BilingualTextField
            label={t('appearance.brand_name', 'Nombre')}
            valueEs={config.brand?.name || ''}
            valueEn={config.brand?.name_en || ''}
            onChangeEs={(v) => patch('brand.name', v)}
            onChangeEn={(v) => patch('brand.name_en', v)}
          />
          <BilingualTextField
            label={t('appearance.brand_tagline', 'Eslogan')}
            valueEs={config.brand?.tagline || ''}
            valueEn={config.brand?.tagline_en || ''}
            onChangeEs={(v) => patch('brand.tagline', v)}
            onChangeEn={(v) => patch('brand.tagline_en', v)}
          />
          <ImageSourceField
            label={t('appearance.logo', 'Logo navbar (URL o archivo)')}
            value={config.brand?.logo_url || ''}
            onChange={(v) => patch('brand.logo_url', v)}
          />
          {config.brand?.logo_url ? (
            <img src={resolveMediaUrl(config.brand.logo_url)} alt="" className="admin-preview-img" style={{ maxHeight: 48 }} />
          ) : null}
        </div>
      )}

      {tab === 'auth' && (
        <div className="card space-y-4">
          <h3 className="d28d-section-title">{t('appearance.auth_title', 'Login / registro')}</h3>
          {[
            ['line_white', 'appearance.auth_line_white'],
            ['line_yellow_1', 'appearance.auth_line_y1'],
            ['line_yellow_2', 'appearance.auth_line_y2'],
            ['subtitle', 'appearance.auth_subtitle'],
            ['cta_label', 'appearance.auth_cta'],
          ].map(([key, labelKey]) => (
            <BilingualTextField
              key={key}
              label={t(labelKey, key)}
              valueEs={config.auth?.[key] || ''}
              valueEn={config.auth?.[`${key}_en`] || ''}
              onChangeEs={(v) => patch(`auth.${key}`, v)}
              onChangeEn={(v) => patch(`auth.${key}_en`, v)}
            />
          ))}
        </div>
      )}

      {tab === 'services' && (
        <div className="space-y-4">
          {SERVICE_IDS.map((s) => (
            <ServiceEditor
              key={s.id}
              id={s.id}
              label={s.label}
              row={config.services?.[s.id] || {}}
              onPatch={patchNested.bind(null, 'services')}
              t={t}
            />
          ))}
        </div>
      )}

      {tab === 'masters' && (
        <div className="space-y-4">
          {MASTER_IDS.map((s) => (
            <SimpleAssetEditor
              key={s.id}
              id={s.id}
              label={s.label}
              row={config.masters?.[s.id] || {}}
              onPatch={patchNested.bind(null, 'masters')}
              t={t}
            />
          ))}
        </div>
      )}

      {tab === 'programs' && (
        <div className="space-y-4">
          {PROGRAM_IDS.map((s) => (
            <SimpleAssetEditor
              key={s.id}
              id={s.id}
              label={s.label}
              row={config.programs?.[s.id] || {}}
              onPatch={patchNested.bind(null, 'programs')}
              titleKey="name"
              t={t}
            />
          ))}
        </div>
      )}

      {tab === 'panels' && (
        <div className="space-y-4">
          <div className="card">
            <label className="block">
              <span className="d28d-label">{t('appearance.panel_select', 'Panel a editar')}</span>
              <select
                className="input w-full mt-1"
                value={panelId}
                onChange={(e) => setPanelId(e.target.value)}
              >
                {PANEL_IDS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="card space-y-4">
            <h3 className="d28d-section-title">{t('appearance.panel_hero', 'Cabecera del panel')}</h3>
            <ImageSourceField
              label={t('appearance.panel_hero_img', 'Imagen cabecera (opcional)')}
              value={panel.hero?.img || ''}
              onChange={(v) => patchPanelHero('img', v)}
            />
            <BilingualTextField
              label={t('appearance.panel_hero_title', 'Título cabecera')}
              valueEs={panel.hero?.title || ''}
              valueEn={panel.hero?.title_en || ''}
              onChangeEs={(v) => patchPanelHero('title', v)}
              onChangeEn={(v) => patchPanelHero('title_en', v)}
            />
            <BilingualTextField
              label={t('appearance.panel_hero_sub', 'Subtítulo cabecera')}
              multiline
              valueEs={panel.hero?.subtitle || ''}
              valueEn={panel.hero?.subtitle_en || ''}
              onChangeEs={(v) => patchPanelHero('subtitle', v)}
              onChangeEn={(v) => patchPanelHero('subtitle_en', v)}
            />
          </div>

          {cardIds.length === 0 ? (
            <p className="d28d-text-muted">{t('appearance.panel_no_cards', '')}</p>
          ) : (
            cardIds.map((cardId) => {
              const row = panel.cards[cardId] || {};
              return (
                <div key={cardId} className="card admin-service-editor">
                  <h3 className="d28d-section-title">{t('appearance.card_label', 'Tarjeta: {id}', { id: cardId })}</h3>
                  <div className="admin-service-editor-grid">
                    <ImageSourceField
                      label={t('appearance.img_card', 'Imagen tarjeta')}
                      value={row.img || ''}
                      onChange={(v) => patchPanelCard(cardId, 'img', v)}
                    />
                    <div className="space-y-3">
                      <BilingualTextField
                        label={t('appearance.card_title', 'Título')}
                        valueEs={row.title || ''}
                        valueEn={row.title_en || ''}
                        onChangeEs={(v) => patchPanelCard(cardId, 'title', v)}
                        onChangeEn={(v) => patchPanelCard(cardId, 'title_en', v)}
                      />
                      <BilingualTextField
                        label={t('appearance.desc', 'Descripción')}
                        multiline
                        valueEs={row.desc || ''}
                        valueEn={row.desc_en || ''}
                        onChangeEs={(v) => patchPanelCard(cardId, 'desc', v)}
                        onChangeEn={(v) => patchPanelCard(cardId, 'desc_en', v)}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? t('appearance.saving', 'Guardando…') : t('appearance.save', 'Guardar cambios')}
        </button>
        <button type="button" className="btn-secondary" disabled={saving} onClick={resetDefaults}>
          {t('appearance.reset', 'Restaurar por defecto')}
        </button>
      </div>
    </div>
  );
}
