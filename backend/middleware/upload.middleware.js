import multer from 'multer';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }
});
