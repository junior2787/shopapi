import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    phone: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    parentId: z.string().cuid().optional().nullable(),
    image: z.string().url().optional().nullable(),
    sortOrder: z.number().int().default(0),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    parentId: z.string().cuid().optional().nullable(),
    image: z.string().url().optional().nullable(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    shortDescription: z.string().max(500).optional(),
    sku: z.string().min(1).max(50),
    price: z.number().positive(),
    compareAtPrice: z.number().positive().optional().nullable(),
    costPrice: z.number().positive().optional().nullable(),
    weight: z.number().positive().optional().nullable(),
    dimensions: z.record(z.unknown()).optional().nullable(),
    images: z.array(z.string().url()).default([]),
    categoryId: z.string().cuid(),
    variants: z.array(z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      price: z.number().positive(),
      compareAtPrice: z.number().positive().optional().nullable(),
      attributes: z.record(z.unknown()),
    })).optional(),
    trackInventory: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    shortDescription: z.string().max(500).optional().nullable(),
    sku: z.string().min(1).max(50).optional(),
    price: z.number().positive().optional(),
    compareAtPrice: z.number().positive().optional().nullable(),
    costPrice: z.number().positive().optional().nullable(),
    weight: z.number().positive().optional().nullable(),
    dimensions: z.record(z.unknown()).optional().nullable(),
    images: z.array(z.string().url()).optional(),
    categoryId: z.string().cuid().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    trackInventory: z.boolean().optional(),
  }),
});

export const cartItemSchema = z.object({
  body: z.object({
    productId: z.string().cuid(),
    variantId: z.string().cuid().optional(),
    quantity: z.number().int().positive().max(99),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    quantity: z.number().int().min(0).max(99),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    shippingAddress: z.object({
      name: z.string().min(1),
      street: z.string().min(1),
      number: z.string().min(1),
      complement: z.string().optional(),
      neighborhood: z.string().min(1),
      city: z.string().min(1),
      state: z.string().length(2),
      zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
      country: z.string().default('Brasil'),
    }),
    billingAddress: z.object({
      name: z.string().min(1),
      street: z.string().min(1),
      number: z.string().min(1),
      complement: z.string().optional(),
      neighborhood: z.string().min(1),
      city: z.string().min(1),
      state: z.string().length(2),
      zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
      country: z.string().default('Brasil'),
    }).optional(),
    couponCode: z.string().optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(20).toUpperCase(),
    description: z.string().optional(),
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
    value: z.number().positive(),
    minAmount: z.number().positive().optional().nullable(),
    maxDiscount: z.number().positive().optional().nullable(),
    usageLimit: z.number().int().positive().optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
});

export const queryProductsSchema = z.object({
  query: z.object({
    category: z.string().cuid().optional(),
    search: z.string().optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    isFeatured: z.coerce.boolean().optional(),
    inStock: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'price', 'name', 'rating']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(12),
  }),
});

export const queryOrdersSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});