import { useRef, useState } from 'react';
import api from '../../services/api';
import { useI18n } from '../../context/useI18n';
import { resolveMediaUrl } from '../../utils/mediaUrl';

/**
 * Editor de imagen: URL manual o subida de archivo (ambas opciones).
 * @param {string} value - URL o ruta /uploads/...
 * @param {(url: string) => void} onChange
 * @param {string} [label]
 * @param {string} [alt] - texto alternativo preview
 */
export default function ImageSourceField({ value, onChange, label, alt = '' }) {
  const { t } = useI18n();
  const labelText = label || t('appearance.img', 'Imagen');
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const preview = resolveMediaUrl(value);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await api.post('/frontend-config/admin/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = r.data?.data?.url || r.data?.data?.path || '';
      if (url) onChange(url);
      else setUploadError(t('image.upload_no_url', 'No se recibió URL del servidor'));
    } catch (err) {
      setUploadError(err?.response?.data?.error || t('image.upload_error', 'Error al subir la imagen'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="image-source-field space-y-2">
      <span className="d28d-label">{labelText}</span>
      <div className="image-source-preview-row">
        {preview ? (
          <img src={preview} alt={alt || label} className="admin-preview-img" />
        ) : (
          <div className="admin-preview-placeholder">{t('image.no_image', 'Sin imagen')}</div>
        )}
      </div>
      <label className="block">
        <span className="d28d-label" style={{ fontSize: '0.65rem' }}>{t('image.url_label', 'URL (externa o subida)')}</span>
        <input
          className="input w-full mt-1"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... o /uploads/frontend/..."
        />
      </label>
      <div className="image-source-upload-row">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="image-source-file-input"
          onChange={onPickFile}
          disabled={uploading}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t('image.uploading', 'Subiendo…') : t('image.upload', 'Subir archivo')}
        </button>
        {value ? (
          <button type="button" className="btn-secondary" onClick={() => onChange('')}>
            {t('image.remove', 'Quitar')}
          </button>
        ) : null}
      </div>
      <p className="d28d-text-muted" style={{ fontSize: '0.7rem', margin: 0 }}>
        {t('image.hint', 'JPG, PNG, WebP o GIF · máximo 5 MB.')}
      </p>
      {uploadError ? <p className="d28d-text-danger" style={{ fontSize: '0.75rem' }}>{uploadError}</p> : null}
    </div>
  );
}
