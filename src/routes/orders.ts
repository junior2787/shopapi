import { Router } from 'express';
import { prisma } from '../index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createOrderSchema, queryOrdersSchema, idParamSchema } from '../validators/schemas.js';
import { validate } from '../middleware/validate.js';
import { Decimal } from '@prisma/client/runtime/library';

export const ordersRouter = Router();

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

async function calculateCartTotals(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { include: { inventory: true } },
          variant: { include: { inventory: true } },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    throw new AppError(400, 'Carrinho vazio');
  }

  let subtotal = new Decimal(0);
  for (const item of cart.items) {
    const price = item.variant ? new Decimal(item.variant.price.toString()) : new Decimal(item.product.price.toString());
    const itemTotal = price.mul(item.quantity);
    subtotal = subtotal.add(itemTotal);
  }

  const taxAmount = subtotal.mul(0.1); // 10% tax
  const shippingAmount = subtotal.gte(299) ? new Decimal(0) : new Decimal('29.90'); // Free shipping over R$299
  const total = subtotal.add(taxAmount).add(shippingAmount);

  return { cart, subtotal, taxAmount, shippingAmount, total, items: cart.items };
}

ordersRouter.get(
  '/',
  validate(queryOrdersSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { status, page, limit } = req.query;
    const where: Record<string, unknown> = { userId: req.user!.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, slug: true, images: true } },
              variant: { select: { id: true, name: true, attributes: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map(o => ({
        ...o,
        subtotal: Number(o.subtotal),
        taxAmount: Number(o.taxAmount),
        shippingAmount: Number(o.shippingAmount),
        discountAmount: Number(o.discountAmount),
        total: Number(o.total),
        items: o.items.map(i => ({
          ...i,
          price: Number(i.price),
          total: Number(i.total),
        })),
      })),
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  })
);

ordersRouter.get(
  '/:id',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, images: true, category: { select: { name: true } } } },
            variant: { select: { id: true, name: true, attributes: true } },
          },
        },
      },
    });
    if (!order) throw new AppError(404, 'Pedido não encontrado');

    res.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        shippingAmount: Number(order.shippingAmount),
        discountAmount: Number(order.discountAmount),
        total: Number(order.total),
        items: order.items.map(i => ({
          ...i,
          price: Number(i.price),
          total: Number(i.total),
        })),
      },
    });
  })
);

ordersRouter.post(
  '/',
  validate(createOrderSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { shippingAddress, billingAddress, couponCode, notes } = req.body;
    const userId = req.user!.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } } } },
    });
    if (!cart || cart.items.length === 0) throw new AppError(400, 'Carrinho vazio');

    let discountAmount = new Decimal(0);
    let coupon = null;

    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.isActive) {
        const now = new Date();
        if ((!coupon.startsAt || coupon.startsAt <= now) && (!coupon.expiresAt || coupon.expiresAt >= now)) {
          if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
            // Validate min amount
            const { subtotal } = await calculateCartTotals(cart.id);
            if (!coupon.minAmount || subtotal.gte(coupon.minAmount)) {
              if (coupon.type === 'PERCENTAGE') {
                discountAmount = subtotal.mul(coupon.value).div(100);
                if (coupon.maxDiscount && discountAmount.gt(coupon.maxDiscount)) {
                  discountAmount = coupon.maxDiscount;
                }
              } else if (coupon.type === 'FIXED_AMOUNT') {
                discountAmount = new Decimal(coupon.value.toString());
              }
              // FREE_SHIPPING handled in shipping calculation
            }
          }
        }
      }
    }

    const { subtotal, taxAmount, shippingAmount, total, items } = await calculateCartTotals(cart.id);

    let finalShipping = shippingAmount;
    if (coupon?.type === 'FREE_SHIPPING') finalShipping = new Decimal(0);

    const finalTotal = subtotal.add(taxAmount).add(finalShipping).sub(discountAmount);

    // Check stock and reserve
    for (const item of items) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { inventory: true },
        });
        if (!variant) throw new AppError(404, `Variação não encontrada`);
        const available = (variant.inventory?.quantity || 0) - (variant.inventory?.reserved || 0);
        if (available < item.quantity) throw new AppError(400, `Estoque insuficiente para ${item.product.name}`);
      } else if (item.product.trackInventory) {
        const available = (item.product.inventory?.quantity || 0) - (item.product.inventory?.reserved || 0);
        if (available < item.quantity) throw new AppError(400, `Estoque insuficiente para ${item.product.name}`);
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          number: generateOrderNumber(),
          userId,
          subtotal,
          taxAmount,
          shippingAmount: finalShipping,
          discountAmount,
          total: finalTotal,
          shippingAddress,
          billingAddress: billingAddress || shippingAddress,
          notes,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.variant ? new Decimal(item.variant.price.toString()) : new Decimal(item.product.price.toString()),
              total: (item.variant ? new Decimal(item.variant.price.toString()) : new Decimal(item.product.price.toString())).mul(item.quantity),
            })),
          },
        },
        include: { items: true },
      });

      // Reserve inventory
      for (const item of items) {
        if (item.variantId) {
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { increment: item.quantity } },
          });
        } else if (item.product.trackInventory) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reserved: { increment: item.quantity } },
          });
        }
      }

      // Update coupon usage
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    res.status(201).json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        shippingAmount: Number(order.shippingAmount),
        discountAmount: Number(order.discountAmount),
        total: Number(order.total),
      },
    });
  })
);

ordersRouter.post(
  '/:id/cancel',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { items: true },
    });
    if (!order) throw new AppError(404, 'Pedido não encontrado');
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new AppError(400, 'Pedido não pode ser cancelado');
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      for (const item of order.items) {
        if (item.variantId) {
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          });
        } else if (item.product.trackInventory) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reserved: { decrement: item.quantity } },
          });
        }
      }
    });

    res.json({ message: 'Pedido cancelado com sucesso' });
  })
);