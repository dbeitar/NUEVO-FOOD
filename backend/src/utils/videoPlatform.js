function detectPlatform(url = '') {
  const u = String(url).trim().toLowerCase();
  if (!u) return null;
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('vimeo.com')) return 'Vimeo';
  if (u.includes('dailymotion.com')) return 'Dailymotion';
  return 'External';
}

module.exports = { detectPlatform };
