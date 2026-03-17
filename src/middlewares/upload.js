import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = path.resolve(process.cwd(), 'uploads', 'profiles');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const imageFileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image uploads are allowed.'));
};

export const profilePhotoUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const spreadsheetMimeTypes = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
]);

const spreadsheetFilter = (_req, file, cb) => {
  const lowerName = String(file.originalname || '').toLowerCase();
  const hasAllowedExtension = ['.csv', '.xls', '.xlsx'].some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime = spreadsheetMimeTypes.has(file.mimetype || '');

  if (hasAllowedExtension || hasAllowedMime) {
    cb(null, true);
    return;
  }

  cb(new Error('Only CSV/XLS/XLSX uploads are allowed.'));
};

export const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: spreadsheetFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});
