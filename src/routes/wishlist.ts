import { Router } from 'express';
import { prisma } from '../index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { idParamSchema } from '../validators/schemas.js';
import { validate } from '../middleware/validate.js';

export const wishlistRouter = Router();

async function getOrCreateWishlist(userId: string) {
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: { items: { include: { product: { include: { inventory: true, category: true } } } } },
  });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId },
      include: { items: { include: { product: { include: { inventory: true, category: true } } } } },
    });
  }
  return wishlist;
}

wishlistRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const wishlist = await getOrCreateWishlist(req.user!.id);
    const items = wishlist.items.map(item => ({
      ...item,
      product: {
        ...item.product,
        price: Number(item.product.price),
        compareAtPrice: item.product.compareAtPrice ? Number(item.product.compareAtPrice) : null,
      },
    }));
    res.json({ wishlist: { ...wishlist, items } });
  })
);

wishlistRouter.post(
  '/items',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id: productId } = req.params;
    const wishlist = await getOrCreateWishlist(req.user!.id);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError(404, 'Produto não encontrado');

    const existing = await prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    });
    if (existing) throw new AppError(409, 'Produto já está na lista de desejos');

    const item = await prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId },
      include: { product: { include: { inventory: true, category: true } } },
    });
    res.status(201).json({ item });
  })
);

wishlistRouter.delete(
  '/items/:id',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const wishlist = await getOrCreateWishlist(req.user!.id);
    const item = await prisma.wishlistItem.findFirst({
      where: { id: req.params.id, wishlistId: wishlist.id },
    });
    if (!item) throw new AppError(404, 'Item não encontrado');
    await prisma.wishlistItem.delete({ where: { id: item.id } });
    res.status(204).send();
  })
);

wishlistRouter.post(
  '/items/:id/move-to-cart',
  validate(idParamSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const wishlist = await getOrCreateWishlist(req.user!.id);
    const item = await prisma.wishlistItem.findFirst({
      where: { id: req.params.id, wishlistId: wishlist.id },
      include: { product: true },
    });
    if (!item) throw new AppError(404, 'Item não encontrado');

    const cart = await prisma.cart.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id },
      update: {},
    });

    await prisma.cartItem.upsert({
      where: { cartId_productId_variantId: { cartId: cart.id, productId: item.productId, variantId: null } },
      create: { cartId: cart.id, productId: item.productId, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });

    await prisma.wishlistItem.delete({ where: { id: item.id } });
    res.json({ success: true, message: 'Produto movido para o carrinho' });
  })
);