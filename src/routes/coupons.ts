import { Router } from 'express';
import { prisma } from '../index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { createCouponSchema, idParamSchema } from '../validators/schemas.js';
import { validate } from '../middleware/validate.js';

export const couponsRouter = Router();

couponsRouter.post(
  '/validate',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { code, cartTotal } = req.body;
    if (!code) throw new AppError(400, 'Código do cupom é obrigatório');

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new AppError(404, 'Cupom inválido');

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new AppError(400, 'Cupom ainda não é válido');
    if (coupon.expiresAt && coupon.expiresAt < now) throw new AppError(400, 'Cupom expirado');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError(400, 'Cupom esgotado');

    const cartTotalDecimal = cartTotal ? Number(cartTotal) : 0;
    if (coupon.minAmount && cartTotalDecimal < Number(coupon.minAmount)) {
      throw new AppError(400, `Valor mínimo do pedido: R$ ${Number(coupon.minAmount).toFixed(2)}`);
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (cartTotalDecimal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = Number(coupon.value);
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        discount: Number(discount.toFixed(2)),
        freeShipping: coupon.type === 'FREE_SHIPPING',
      },
    });
  })
);

couponsRouter.get(
  '/',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ coupons: coupons.map(c => ({ ...c, value: Number(c.value), minAmount: c.minAmount ? Number(c.minAmount) : null, maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null })) });
  })
);

couponsRouter.post(
  '/',
  authMiddleware,
  requireAdmin,
  validate(createCouponSchema),
  asyncHandler(async (req, res) => {
    const { code, description, type, value, minAmount, maxDiscount, usageLimit, startsAt, expiresAt } = req.body;
    const coupon = await prisma.coupon.create({
      data: { code: code.toUpperCase(), description, type, value, minAmount, maxDiscount, usageLimit, startsAt: startsAt ? new Date(startsAt) : null, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    res.status(201).json({ coupon });
  })
);

couponsRouter.put(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const { code, description, type, value, minAmount, maxDiscount, usageLimit, startsAt, expiresAt, isActive } = req.body;
    const updateData: Record<string, unknown> = {};
    if (code) updateData.code = code.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (value !== undefined) updateData.value = value;
    if (minAmount !== undefined) updateData.minAmount = minAmount;
    if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit;
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: updateData });
    res.json({ coupon });
  })
);

couponsRouter.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);