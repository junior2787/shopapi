import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { productsRouter } from './routes/products.js';
import { cartRouter } from './routes/cart.js';
import { wishlistRouter } from './routes/wishlist.js';
import { ordersRouter } from './routes/orders.js';
import { usersRouter } from './routes/users.js';
import { couponsRouter } from './routes/coupons.js';
import { uploadRouter } from './routes/upload.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições, tente novamente mais tarde' },
});
app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'shopapi' });
});

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);

// Protected routes
app.use('/api/cart', authMiddleware, cartRouter);
app.use('/api/wishlist', authMiddleware, wishlistRouter);
app.use('/api/orders', authMiddleware, ordersRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/coupons', authMiddleware, couponsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🛒 ShopAPI running on http://localhost:${PORT}`);
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});