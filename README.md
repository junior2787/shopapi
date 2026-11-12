# ShopAPI - E-commerce REST API

![ShopAPI](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

> API REST completa para e-commerce, construída com **Node.js/Express + TypeScript** e **PostgreSQL com Prisma ORM**. Inclui autenticação JWT, gestão de produtos com variantes, carrinho, wishlist, pedidos, cupons, upload de imagens e roles de usuário (Admin/Customer).

## 🚀 Funcionalidades

### 🔐 Autenticação & Autorização
- **Registro/Login** com validação Zod
- **JWT** com expiração 7 dias + roles (ADMIN/CUSTOMER)
- **Middleware de proteção** de rotas
- **Rate limiting** e headers de segurança (Helmet)

### 📦 Catálogo de Produtos
- **Categorias hierárquicas** (pai/filho, árvore completa)
- **Produtos** com SKU, preço, preço comparativo, imagens
- **Variantes** (cor, tamanho, etc.) com SKU e preço próprio
- **Controle de estoque** por produto e variante
- **Produtos em destaque** (featured)
- **Busca e filtros** (categoria, preço, estoque, ordenação)
- **Slugs SEO-friendly** automáticos

### 🛒 Carrinho & Wishlist
- **Carrinho persistente** por usuário
- **Validação de estoque** em tempo real
- **Wishlist** (lista de desejos)
- **Mover items** wishlist → carrinho

### 📋 Pedidos
- **Checkout completo** com endereço de entrega/cobrança
- **Cálculo automático**: subtotal, imposto (10%), frete (grátis > R$299), desconto
- **Cupons**: porcentagem, valor fixo, frete grátis
- **Reserva de estoque** atômica (transação)
- **Status do pedido**: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
- **Cancelamento** com devolução de estoque
- **Histórico** com paginação

### 👤 Usuários
- **Perfil** (nome, telefone, avatar)
- **Endereços** múltiplos (entrega/cobrança, padrão)
- **Avaliações** de produtos (verificadas se comprou)

### 🎫 Cupons (Admin)
- **Tipos**: PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING
- **Validação**: valor mínimo, limite de uso, datas início/fim
- **Validação em tempo real** no checkout

### 📤 Upload de Imagens (Admin)
- **Upload único/múltiplo** (até 10)
- **Processamento com Sharp**: redimensiona (max 1200px), converte WebP, qualidade 85%
- **Validação**: JPEG, PNG, WebP, max 5MB

## 🛠 Stack Técnica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js | 20+ | Runtime |
| Express | 4.18 | Framework web |
| TypeScript | 5.3 | Tipagem estática |
| Prisma | 5.8 | ORM |
| PostgreSQL | 16 | Banco de dados |
| Zod | 3.22 | Validação de schemas |
| JWT | 9.0 | Autenticação |
| bcryptjs | 2.4 | Hash de senhas |
| Multer + Sharp | 1.4 / 0.33 | Upload/processamento imagens |
| Stripe | 14.12 | Pagamentos (opcional) |
| Vitest | 1.2 | Testes unitários |
| ESLint | 8.56 | Linting |

## 📦 Estrutura do Projeto

```
shopapi/
├── prisma/
│   ├── schema.prisma      # Schema completo do banco
│   └── seed.ts            # Dados iniciais (admin, cliente, categorias, produtos, cupons)
├── src/
│   ├── index.ts           # Entry point + middlewares globais
│   ├── middleware/
│   │   ├── auth.ts        # JWT, roles, password utils
│   │   ├── errorHandler.ts # Erros padronizados + Prisma errors
│   │   └── validate.ts    # Middleware de validação Zod
│   ├── routes/
│   │   ├── auth.ts        # Register, login, me
│   │   ├── categories.ts  # CRUD categorias (admin), list/tree (public)
│   │   ├── products.ts    # CRUD produtos (admin), list/detail (public)
│   │   ├── cart.ts        # Carrinho do usuário
│   │   ├── wishlist.ts    # Lista de desejos
│   │   ├── orders.ts      # Pedidos + checkout + cancelamento
│   │   ├── users.ts       # Perfil, endereços, reviews
│   │   ├── coupons.ts     # CRUD cupons (admin), validação (public)
│   │   └── upload.ts      # Upload imagens (admin)
│   └── validators/
│       └── schemas.ts     # Todos os schemas Zod
├── Dockerfile
├── .env.example
├── tsconfig.json
├── package.json
└── README.md
```

## ⚡ Quick Start

### Pré-requisitos
- **Node.js 20+** e **npm 10+**
- **Docker** e **Docker Compose** (para PostgreSQL)
- **PostgreSQL 16+** (se não usar Docker)

### 1. Instale dependências
```bash
cd shopapi
npm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Inicie o banco (Docker)
```bash
docker run -d \
  --name shopapi-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=shopapi \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Configure o banco
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Inicie em desenvolvimento
```bash
npm run dev
```

### 6. Teste a API
- **API**: http://localhost:3002
- **Health**: http://localhost:3002/health
- **Prisma Studio**: `npx prisma studio`

### Credenciais de demo
```
Admin:    admin@shopapi.com    / senha123
Cliente:  cliente@shopapi.com  / senha123
```

## 🐳 Docker

```bash
# Build
docker build -t shopapi .

# Run (precisa de banco PostgreSQL rodando)
docker run -d \
  -p 3002:3002 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/shopapi" \
  -e JWT_SECRET="sua-chave-secreta" \
  shopapi
```

## 📚 API Endpoints

### Autenticação (Público)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Perfil (auth) |
| PUT | `/api/auth/me` | Atualizar perfil (auth) |

### Categorias (Público + Admin)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/categories` | Listar ativas |
| GET | `/api/categories/tree` | Árvore completa |
| GET | `/api/categories/:id` | Detalhes |
| POST | `/api/categories` | Criar (admin) |
| PUT | `/api/categories/:id` | Atualizar (admin) |
| DELETE | `/api/categories/:id` | Excluir (admin) |

### Produtos (Público + Admin)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/products` | Listar (filtros, paginação) |
| GET | `/api/products/featured` | Em destaque |
| GET | `/api/products/:id` | Detalhes por ID |
| GET | `/api/products/slug/:slug` | Detalhes por slug |
| POST | `/api/products` | Criar (admin) |
| PUT | `/api/products/:id` | Atualizar (admin) |
| DELETE | `/api/products/:id` | Excluir (admin) |
| POST | `/api/products/:id/stock` | Ajustar estoque (admin) |

### Carrinho (Auth)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/cart` | Ver carrinho |
| POST | `/api/cart/items` | Adicionar item |
| PUT | `/api/cart/items/:id` | Atualizar quantidade |
| DELETE | `/api/cart/items/:id` | Remover item |
| DELETE | `/api/cart` | Limpar carrinho |

### Wishlist (Auth)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/wishlist` | Ver wishlist |
| POST | `/api/wishlist/items/:productId` | Adicionar |
| DELETE | `/api/wishlist/items/:id` | Remover |
| POST | `/api/wishlist/items/:id/move-to-cart` | Mover p/ carrinho |

### Pedidos (Auth)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/orders` | Listar meus pedidos |
| GET | `/api/orders/:id` | Detalhes do pedido |
| POST | `/api/orders` | Criar pedido (checkout) |
| POST | `/api/orders/:id/cancel` | Cancelar |

### Usuários (Auth)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/users/addresses` | Meus endereços |
| POST | `/api/users/addresses` | Adicionar endereço |
| PUT | `/api/users/addresses/:id` | Atualizar endereço |
| DELETE | `/api/users/addresses/:id` | Remover endereço |
| GET | `/api/users/reviews` | Minhas avaliações |
| POST | `/api/users/reviews` | Avaliar produto |

### Cupons (Auth + Admin)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/coupons/validate` | Validar cupom (auth) |
| GET | `/api/coupons` | Listar (admin) |
| POST | `/api/coupons` | Criar (admin) |
| PUT | `/api/coupons/:id` | Atualizar (admin) |
| DELETE | `/api/coupons/:id` | Excluir (admin) |

### Upload (Admin)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/upload/image` | Upload single |
| POST | `/api/upload/images` | Upload multiple (max 10) |

## 🔍 Query Parameters

### GET /api/products
| Param | Tipo | Exemplo | Descrição |
|-------|------|---------|-----------|
| category | UUID | `?category=abc123` | Filtrar por categoria |
| search | string | `?search=iphone` | Busca textual |
| minPrice | number | `?minPrice=100` | Preço mínimo |
| maxPrice | number | `?maxPrice=5000` | Preço máximo |
| isFeatured | boolean | `?isFeatured=true` | Apenas destaques |
| inStock | boolean | `?inStock=true` | Apenas com estoque |
| sortBy | enum | `?sortBy=price` | createdAt, price, name, rating |
| sortOrder | enum | `?sortOrder=asc` | asc, desc |
| page | int | `?page=1` | Página |
| limit | int | `?limit=12` | Itens/página (max 50) |

## 🧪 Testes

```bash
npm run test          # Rodar testes
npm run test:watch    # Watch mode
npm run test:coverage # Com coverage
```

## 📝 Scripts

```bash
npm run dev           # tsx watch
npm run build         # tsc
npm run start         # node dist/index.js
npm run test          # vitest
npm run lint          # eslint
npm run db:migrate    # prisma migrate dev
npm run db:seed       # tsx prisma/seed.ts
npm run db:studio     # prisma studio
npm run db:generate   # prisma generate
```

## 🔒 Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/shopapi?schema=public"

# JWT (mínimo 32 chars em produção!)
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"

# Server
PORT=3002
NODE_ENV=development

# CORS
CLIENT_URL="http://localhost:5173"

# Stripe (opcional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 🎯 Roadmap

- [ ] Integração Stripe completa (PaymentIntents, Webhooks)
- [ ] Testes E2E com Playwright
- [ ] CI/CD GitHub Actions
- [ ] Notificações email (nodemailer/SendGrid)
- [ ] Webhooks para status de pedido
- [ ] Cache Redis para produtos/categorias
- [ ] Logs estruturados (Pino/Winston)
- [ ] Documentação OpenAPI/Swagger
- [ ] Rate limiting por usuário (não só IP)
- [ ] Soft delete para produtos/pedidos

## 📄 Licença

MIT License

## 👨‍💻 Autor

**Junior Moura**
- GitHub: [@junior2787](https://github.com/junior2787)
- Email: juniormoura746@gmail.com