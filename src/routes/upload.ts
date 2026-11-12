import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'crypto';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(400, 'Formato inválido. Use JPEG, PNG ou WebP'));
  },
});

export const uploadRouter = Router();

uploadRouter.post(
  '/image',
  authMiddleware,
  requireAdmin,
  upload.single('image'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) throw new AppError(400, 'Nenhuma imagem enviada');

    const filename = `${uuidv4()}.webp`;
    const filepath = `uploads/${filename}`;

    await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);

    const url = `/${filepath}`;
    res.json({ url, filename });
  })
);

uploadRouter.post(
  '/images',
  authMiddleware,
  requireAdmin,
  upload.array('images', 10),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.files || req.files.length === 0) throw new AppError(400, 'Nenhuma imagem enviada');

    const urls = await Promise.all(
      (req.files as Express.Multer.File[]).map(async (file) => {
        const filename = `${uuidv4()}.webp`;
        const filepath = `uploads/${filename}`;
        await sharp(file.buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(filepath);
        return `/${filepath}`;
      })
    );
    res.json({ urls });
  })
);