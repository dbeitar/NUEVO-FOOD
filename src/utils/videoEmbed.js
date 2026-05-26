/** Convierte URLs de YouTube, Vimeo u otras a URL embebible para iframe. */
export function videoUrlToEmbed(url) {
  if (!url || typeof url !== 'string') return '';
  const raw = url.trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
      const embed = parsed.pathname.match(/^\/embed\/([^/]+)/);
      if (embed) return `https://www.youtube.com/embed/${embed[1]}`;
    }
    if (host === 'vimeo.com') {
      const id = parsed.pathname.match(/^\/(\d+)/);
      if (id) return `https://player.vimeo.com/video/${id[1]}`;
    }
    if (host === 'player.vimeo.com') {
      return raw;
    }
    if (host === 'dailymotion.com') {
      const dm = parsed.pathname.match(/\/video\/([^_]+)/);
      if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;
    }
  } catch {
    return '';
  }
  return '';
}

export function detectVideoPlatform(url) {
  if (!url) return 'otro';
  const embed = videoUrlToEmbed(url);
  if (!embed) return 'enlace';
  if (embed.includes('youtube')) return 'youtube';
  if (embed.includes('vimeo')) return 'vimeo';
  if (embed.includes('dailymotion')) return 'dailymotion';
  return 'video';
}
