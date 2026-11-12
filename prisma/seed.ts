import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/middleware/auth.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ShopAPI database...');

  const password = await hashPassword('senha123');

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shopapi.com' },
    update: {},
    create: { email: 'admin@shopapi.com', password, name: 'Admin User', role: 'ADMIN' },
  });

  // Customer user
  const customer = await prisma.user.upsert({
    where: { email: 'cliente@shopapi.com' },
    update: {},
    create: { email: 'cliente@shopapi.com', password, name: 'Cliente Demo', role: 'CUSTOMER', phone: '(11) 99999-9999' },
  });

  // Categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'eletronicos' },
    update: {},
    create: { name: 'Eletrônicos', slug: 'eletronicos', description: 'Produtos eletrônicos e gadgets', sortOrder: 1 },
  });

  const smartphones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: { name: 'Smartphones', slug: 'smartphones', description: 'Celulares inteligentes', parentId: electronics.id, sortOrder: 1 },
  });

  const laptops = await prisma.category.upsert({
    where: { slug: 'notebooks' },
    update: {},
    create: { name: 'Notebooks', slug: 'notebooks', description: 'Computadores portáteis', parentId: electronics.id, sortOrder: 2 },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: 'moda' },
    update: {},
    create: { name: 'Moda', slug: 'moda', description: 'Roupas e acessórios', sortOrder: 2 },
  });

  // Products
  const products = [
    {
      name: 'iPhone 15 Pro',
      description: 'O iPhone mais avançado com chip A17 Pro, câmera de 48MP e design em titânio.',
      shortDescription: 'Smartphone Apple com chip A17 Pro',
      sku: 'IPH15PRO-128',
      price: 7999.00,
      compareAtPrice: 8499.00,
      categoryId: smartphones.id,
      images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800'],
      isFeatured: true,
      trackInventory: true,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Galaxy AI, câmera de 200MP, S Pen integrada e tela Dynamic AMOLED 2X.',
      shortDescription: 'Top de linha Samsung com IA',
      sku: 'SGS24U-256',
      price: 6999.00,
      compareAtPrice: 7499.00,
      categoryId: smartphones.id,
      images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
      isFeatured: true,
      trackInventory: true,
    },
    {
      name: 'MacBook Air M3',
      description: 'Chip M3, até 18h de bateria, tela Liquid Retina de 13.6" e design ultrafino.',
      shortDescription: 'Notebook Apple com chip M3',
      sku: 'MBA-M3-256',
      price: 8999.00,
      categoryId: laptops.id,
      images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'],
      isFeatured: true,
      trackInventory: true,
    },
    {
      name: 'Dell XPS 13 Plus',
      description: 'Processador Intel Core i7 13ª gen, tela 3.5K OLED, 16GB RAM, 512GB SSD.',
      shortDescription: 'Ultrabook premium Windows',
      sku: 'XPS13P-512',
      price: 7499.00,
      compareAtPrice: 8299.00,
      categoryId: laptops.id,
      images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
      isFeatured: false,
      trackInventory: true,
    },
    {
      name: 'Camiseta Básica Premium',
      description: '100% algodão orgânico, corte reto, gola redonda reforçada.',
      shortDescription: 'Camiseta 100% algodão orgânico',
      sku: 'CAM-BAS-P',
      price: 89.90,
      categoryId: fashion.id,
      images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
      isFeatured: false,
      trackInventory: true,
    },
    {
      name: 'Tênis Esportivo Running',
      description: 'Amortecimento responsivo, cabedal respirável, solado de borracha durável.',
      shortDescription: 'Tênis para corrida e treino',
      sku: 'TEN-RUN-42',
      price: 349.90,
      compareAtPrice: 429.90,
      categoryId: fashion.id,
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
      isFeatured: true,
      trackInventory: true,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        ...p,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        price: p.price.toFixed(2),
        compareAtPrice: p.compareAtPrice?.toFixed(2) || null,
        inventory: { create: { quantity: Math.floor(Math.random() * 50) + 10 } },
      },
    });
    console.log(`✅ Product: ${product.name}`);
  }

  // Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: { code: 'WELCOME10', description: '10% de desconto na primeira compra', type: 'PERCENTAGE', value: 10, minAmount: 100, maxDiscount: 50, usageLimit: 100 },
  });

  await prisma.coupon.upsert({
    where: { code: 'FRETEGRATIS' },
    update: {},
    create: { code: 'FRETEGRATIS', description: 'Frete grátis em qualquer pedido', type: 'FREE_SHIPPING', value: 0, usageLimit: 50 },
  });

  // Customer address
  await prisma.address.upsert({
    where: { id: 'demo-address-1' },
    update: {},
    create: { id: 'demo-address-1', userId: customer.id, name: 'Casa', street: 'Rua das Flores', number: '123', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01000-000', isDefault: true, type: 'SHIPPING' },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Admin: admin@shopapi.com / senha123`);
  console.log(`👤 Customer: cliente@shopapi.com / senha123`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });