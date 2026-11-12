import { Router } from 'express';
import { prisma } from '../index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { idParamSchema } from '../validators/schemas.js';
import { validate } from '../middleware/validate.js';

export const usersRouter = Router();

usersRouter.get(
  '/addresses',
  asyncHandler(async (req: AuthRequest, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: { isDefault: 'desc' },
    });
    res.json({ addresses });
  })
);

usersRouter.post(
  '/addresses',
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, street, number, complement, neighborhood, city, state, zipCode, country, type, isDefault } = req.body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, type },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: { userId: req.user!.id, name, street, number, complement, neighborhood, city, state, zipCode, country: country || 'Brasil', type: type || 'SHIPPING', isDefault: isDefault || false },
    });
    res.status(201).json({ address });
  })
);

usersRouter.put(
  '/addresses/:id',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, street, number, complement, neighborhood, city, state, zipCode, country, type, isDefault } = req.body;

    const address = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!address) throw new AppError(404, 'Endereço não encontrado');

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, type: address.type },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id: req.params.id },
      data: { name, street, number, complement, neighborhood, city, state, zipCode, country, type, isDefault },
    });
    res.json({ address: updated });
  })
);

usersRouter.delete(
  '/addresses/:id',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const address = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!address) throw new AppError(404, 'Endereço não encontrado');
    await prisma.address.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

usersRouter.get(
  '/reviews',
  asyncHandler(async (req: AuthRequest, res) => {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      include: { product: { select: { id: true, name: true, slug: true, images: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reviews });
  })
);

usersRouter.post(
  '/reviews',
  asyncHandler(async (req: AuthRequest, res) => {
    const { productId, rating, title, comment } = req.body;

    if (!productId || !rating || rating < 1 || rating > 5) {
      throw new AppError(400, 'Produto e avaliação (1-5) são obrigatórios');
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError(404, 'Produto não encontrado');

    const hasPurchased = await prisma.orderItem.findFirst({
      where: { productId, order: { userId: req.user!.id, paymentStatus: 'PAID' } },
    });

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId, userId: req.user!.id } },
    });
    if (existing) throw new AppError(409, 'Você já avaliou este produto');

    const review = await prisma.review.create({
      data: { productId, userId: req.user!.id, rating, title, comment, isVerifiedPurchase: !!hasPurchased },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.status(201).json({ review });
  })
);