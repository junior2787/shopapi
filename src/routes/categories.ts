import { Router } from 'express';
import { prisma } from '../index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { createCategorySchema, updateCategorySchema, idParamSchema } from '../validators/schemas.js';
import { validate } from '../middleware/validate.js';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ categories });
  })
);

categoriesRouter.get(
  '/tree',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ categories });
  })
);

categoriesRouter.get(
  '/:id',
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        parent: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
    if (!category) throw new AppError(404, 'Categoria não encontrada');
    res.json({ category });
  })
);

categoriesRouter.post(
  '/',
  authMiddleware,
  requireAdmin,
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const { name, description, parentId, image, sortOrder } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const category = await prisma.category.create({
      data: { name, slug, description, parentId, image, sortOrder },
    });
    res.status(201).json({ category });
  })
);

categoriesRouter.put(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const { name, description, parentId, image, sortOrder, isActive } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (image !== undefined) updateData.image = image;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ category });
  })
);

categoriesRouter.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);