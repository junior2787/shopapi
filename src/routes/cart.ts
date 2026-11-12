import { Router } from 'express';
import { prisma } from '../index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { cartItemSchema, updateCartItemSchema, idParamSchema } from '../validators/schemas.js';
import { validate } from '../middleware/validate.js';

export const cartRouter = Router();

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } } } },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: { include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } } } },
    });
  }
  return cart;
}

cartRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    const itemsWithTotals = cart.items.map(item => ({
      ...item,
      product: {
        ...item.product,
        price: Number(item.product.price),
        compareAtPrice: item.product.compareAtPrice ? Number(item.product.compareAtPrice) : null,
      },
      variant: item.variant ? {
        ...item.variant,
        price: Number(item.variant.price),
        compareAtPrice: item.variant.compareAtPrice ? Number(item.variant.compareAtPrice) : null,
      } : null,
      total: Number(item.variant?.price || item.product.price) * item.quantity,
    }));
    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
    res.json({ cart: { ...cart, items: itemsWithTotals, subtotal } });
  })
);

cartRouter.post(
  '/items',
  validate(cartItemSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { productId, variantId, quantity } = req.body;
    const cart = await getOrCreateCart(req.user!.id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true, variants: { include: { inventory: true } } },
    });
    if (!product) throw new AppError(404, 'Produto não encontrado');

    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) throw new AppError(404, 'Variação não encontrada');
      const available = (variant.inventory?.quantity || 0) - (variant.inventory?.reserved || 0);
      if (available < quantity) throw new AppError(400, 'Estoque insuficiente para esta variação');
    } else if (product.trackInventory) {
      const available = (product.inventory?.quantity || 0) - (product.inventory?.reserved || 0);
      if (available < quantity) throw new AppError(400, 'Estoque insuficiente');
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId: variantId || null } },
    });

    let item;
    if (existingItem) {
      item = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } },
      });
    } else {
      item = await prisma.cartItem.create({
        data: { cartId: cart.id, productId, variantId, quantity },
        include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } },
      });
    }

    res.status(201).json({ item });
  })
);

cartRouter.put(
  '/items/:id',
  validate(updateCartItemSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { quantity } = req.body;
    const cart = await getOrCreateCart(req.user!.id);

    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.id, cartId: cart.id },
      include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } },
    });
    if (!item) throw new AppError(404, 'Item não encontrado no carrinho');

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
      return res.status(204).send();
    }

    if (item.variantId) {
      const available = (item.variant?.inventory?.quantity || 0) - (item.variant?.inventory?.reserved || 0);
      if (available < quantity) throw new AppError(400, 'Estoque insuficiente');
    } else if (item.product.trackInventory) {
      const available = (item.product.inventory?.quantity || 0) - (item.product.inventory?.reserved || 0);
      if (available < quantity) throw new AppError(400, 'Estoque insuficiente');
    }

    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
      include: { product: { include: { inventory: true } }, variant: { include: { inventory: true } } },
    });
    res.json({ item: updated });
  })
);

cartRouter.delete(
  '/items/:id',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.id, cartId: cart.id },
    });
    if (!item) throw new AppError(404, 'Item não encontrado');
    await prisma.cartItem.delete({ where: { id: item.id } });
    res.status(204).send();
  })
);

cartRouter.delete(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const cart = await getOrCreateCart(req.user!.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    res.status(204).send();
  })
);