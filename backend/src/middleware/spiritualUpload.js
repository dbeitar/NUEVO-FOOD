const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/spiritual');
const STUDIES_DIR = path.join(UPLOAD_DIR, 'studies');
const IMPORTS_DIR = path.join(UPLOAD_DIR, 'imports');

for (const dir of [UPLOAD_DIR, STUDIES_DIR, IMPORTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const ALLOWED_STUDY = new Set([
  'application/pdf', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav',
  'image/jpeg', 'image/png',
]);

const studyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STUDIES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  },
});

const importStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMPORTS_DIR),
  filename: (_req, file, cb) => cb(null, `bible-${Date.now()}.json`),
});

const studyUpload = multer({
  storage: studyStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_STUDY.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Tipo de archivo no permitido'));
  },
});

const importUpload = multer({
  storage: importStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) return cb(null, true);
    return cb(new Error('Solo JSON'));
  },
});

module.exports = {
  uploadStudyFile: studyUpload.single('file'),
  uploadBibleJson: importUpload.single('file'),
  STUDIES_DIR,
};
