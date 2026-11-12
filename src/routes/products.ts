import { Router } from 'express';
import { prisma } from '../index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { createProductSchema, updateProductSchema, idParamSchema, queryProductsSchema } from '../validators/schemas.js';
import { validate } from '../middleware/validate.js';

export const productsRouter = Router();

productsRouter.get(
  '/',
  validate(queryProductsSchema),
  asyncHandler(async (req, res) => {
    const { category, search, minPrice, maxPrice, isFeatured, inStock, sortBy, sortOrder, page, limit } = req.query;

    const where: Record<string, unknown> = { isActive: true };

    if (category) where.categoryId = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
    if (inStock === 'true') {
      where.inventory = { quantity: { gt: 0 } };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          inventory: true,
          variants: { where: { productId: { not: null } }, include: { inventory: true } },
          _count: { select: { reviews: true } },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

productsRouter.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: true,
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ products });
  })
);

productsRouter.get(
  '/:id',
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        inventory: true,
        variants: { include: { inventory: true } },
        reviews: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: true, wishlistItems: true } },
      },
    });
    if (!product) throw new AppError(404, 'Produto não encontrado');

    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

    res.json({ product: { ...product, avgRating: Number(avgRating.toFixed(1)) } });
  })
);

productsRouter.get(
  '/slug/:slug',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        inventory: true,
        variants: { include: { inventory: true } },
        reviews: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!product) throw new AppError(404, 'Produto não encontrado');
    res.json({ product });
  })
);

productsRouter.post(
  '/',
  authMiddleware,
  requireAdmin,
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    const { variants, inventory: _inventory, ...productData } = req.body;
    const slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const product = await prisma.product.create({
      data: {
        ...productData,
        slug,
        price: new Number(productData.price).toFixed(2),
        compareAtPrice: productData.compareAtPrice ? new Number(productData.compareAtPrice).toFixed(2) : null,
        costPrice: productData.costPrice ? new Number(productData.costPrice).toFixed(2) : null,
        inventory: productData.trackInventory ? { create: { quantity: 0 } } : undefined,
        variants: variants?.length ? {
          create: variants.map((v: Record<string, unknown>) => ({
            ...v,
            price: new Number(v.price).toFixed(2),
            compareAtPrice: v.compareAtPrice ? new Number(v.compareAtPrice).toFixed(2) : null,
            inventory: { create: { quantity: 0 } },
          })),
        } : undefined,
      },
      include: { inventory: true, variants: { include: { inventory: true } } },
    });
    res.status(201).json({ product });
  })
);

productsRouter.put(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate(updateProductSchema),
  asyncHandler(async (req, res) => {
    const { name, price, compareAtPrice, costPrice, ...updateData } = req.body;
    const data: Record<string, unknown> = { ...updateData };

    if (name !== undefined) {
      data.name = name;
      data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (price !== undefined) data.price = new Number(price).toFixed(2);
    if (compareAtPrice !== undefined) data.compareAtPrice = compareAtPrice ? new Number(compareAtPrice).toFixed(2) : null;
    if (costPrice !== undefined) data.costPrice = costPrice ? new Number(costPrice).toFixed(2) : null;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { inventory: true, variants: { include: { inventory: true } } },
    });
    res.json({ product });
  })
);

productsRouter.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

productsRouter.post(
  '/:id/stock',
  authMiddleware,
  requireAdmin,
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const { quantity, variantId } = req.body;
    if (typeof quantity !== 'number') throw new AppError(400, 'Quantidade é obrigatória');

    if (variantId) {
      const inventory = await prisma.inventory.upsert({
        where: { variantId },
        create: { variantId, quantity },
        update: { quantity: { increment: quantity } },
      });
      res.json({ inventory });
    } else {
      const inventory = await prisma.inventory.upsert({
        where: { productId: req.params.id },
        create: { productId: req.params.id, quantity },
        update: { quantity: { increment: quantity } },
      });
      res.json({ inventory });
    }
  })
);