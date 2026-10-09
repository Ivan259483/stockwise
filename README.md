# StockWise: Inventory Management System

> A full-stack MERN web application that helps small Philippine retail businesses (MSMEs) such as hardware stores, sari-sari stores and supply shops manage products, record stock in and out, and get low-stock alerts.

Final project for **Integrative Programming and Technologies** (Section INF238) by **Ivan Tadena**.

## Live Links

| Resource | URL |
|---|---|
| Web app (Vercel) | https://stockwise-ivan.vercel.app |
| REST API (Vercel serverless functions) | https://stockwise-api-ivan.vercel.app (health: [/api/health](https://stockwise-api-ivan.vercel.app/api/health)) |
| Source code | https://github.com/Ivan259483/stockwise |

## Overview

Many small Philippine stores still track stock in paper logbooks or spreadsheets. This leads to stockouts, overstocking, lost items and no record of who changed what. StockWise replaces the logbook with a simple web app:

- every product, its price and its stock level in one searchable catalog;
- every stock change recorded as a **stock movement** with who, when, why, and the before/after quantity;
- a dashboard that shows stock value in pesos and highlights what needs restocking;
- two roles, **admin** and **staff**, so only the owner can change the catalog.

## Features

| Module | What it does |
|---|---|
| **Authentication & roles** | Register/login with JWT (1-day expiry), bcrypt-hashed passwords, rate-limited auth endpoints. `admin` manages everything; `staff` can view inventory and record stock in/out. Public registration creates staff accounts. |
| **Dashboard** | Stat cards (total products, stock value in ₱, low stock, out of stock), bar chart of stock value by category, line chart of stock in vs. out for the last 7 days, restock list with a one-click "Restock" action, and recent movements. |
| **Products** | Debounced search by name/SKU, filters by category and stock status, sorting, pagination (filters kept in the URL), table on desktop and cards on mobile, color-coded status badges, create/edit with optional image upload (≤ 1 MB), delete with confirmation. |
| **Stock movements** | Stock IN/OUT through atomic MongoDB updates. Stock can never go negative: an OUT larger than the stock returns **409 "Insufficient stock: only X available"**. Full, filterable history (product, type, date range). |
| **Categories & suppliers** | List with product counts, modal create/edit, delete confirmation. A category still in use cannot be deleted (409); deleting a supplier unsets it on its products. |
| **Users (admin)** | Change roles, activate/deactivate, delete. Admins cannot demote, deactivate or delete themselves. |
| **Validation & errors** | express-validator rules on every write route, one central error handler with a consistent JSON shape, inline field errors in every form, a toast for every failed request, automatic logout on 401. |
| **Responsive UI** | Works from 360 px phones to desktops: hamburger drawer navigation, mobile card lists, accessible labels on all inputs. |

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), React Router 7, Axios, Recharts, react-hot-toast, lucide-react |
| Backend | Node.js, Express 5 (ES modules), Mongoose 9, jsonwebtoken, bcryptjs, express-validator, helmet, cors, morgan, express-rate-limit, dotenv |
| Database | MongoDB Atlas (database `stockwise`) |
| Hosting | Vercel: static React build for the client; Express app as Vercel serverless functions for the API |
| Tooling | ESLint, Prettier, a 40-check API smoke test, a 30-step headless-Chrome E2E test (puppeteer-core) |

## Architecture

```
┌────────────────────────┐   HTTPS + JSON (REST)    ┌──────────────────────────────┐   Mongoose    ┌──────────────────┐
│  React SPA (Vite)      │ ───────────────────────► │  Express API                 │ ────────────► │  MongoDB Atlas   │
│  Vercel static hosting │  Authorization: Bearer   │  Vercel serverless functions │               │  db: stockwise   │
│  stockwise-ivan        │ ◄─────────────────────── │  stockwise-api-ivan          │ ◄──────────── │  5 collections   │
└────────────────────────┘   { success, data }      └──────────────────────────────┘               └──────────────────┘
```

**Request flow:** the React app calls the API through one Axios instance that adds `Authorization: Bearer <JWT>`. In Express, each request passes through `helmet` → `cors` → `express.json` → `morgan` → `dbConnect` (opens or reuses the cached Mongoose connection) → the route's `protect` (verifies the JWT and reloads the user) → `authorize(role)` → `validate(rules)` → controller → the central `errorHandler`.

**Serverless notes:** `server.js` exports the Express app (`export default app`), which Vercel runs as a function. `app.listen` is only called locally (when `VERCEL` is not set). The Mongoose connection promise is cached on `globalThis` so warm invocations reuse one connection pool.

### Project structure

```
stockwise/
├── server/                 Express REST API
│   ├── server.js           app entry: middleware, routes, error handler, local listen
│   ├── config/db.js        cached MongoDB connection
│   ├── models/             User, Category, Supplier, Product, StockMovement
│   ├── controllers/        one file per resource
│   ├── routes/             one file per resource
│   ├── middleware/         auth (protect/authorize), validate, errorHandler, notFound, rateLimiter, dbConnect
│   ├── validators/         express-validator rule sets per resource
│   ├── utils/              ApiError, asyncHandler, helpers, dates, constants
│   └── scripts/            seed.js, smoke.js
├── client/                 React + Vite SPA
│   ├── vercel.json         SPA rewrite so deep links work on refresh
│   └── src/
│       ├── api/            axios instance + one module per resource
│       ├── context/        AuthContext (session provider)
│       ├── hooks/          useAuth, useFetch, useDebounce, useForm, useUrlFilters
│       ├── components/     ui/ (Button, Input, Modal, Table…), layout/, forms/, dashboard/, stock/
│       ├── pages/          Login, Register, Dashboard, Products, ProductForm, ProductDetails,
│       │                   StockMovements, Categories, Suppliers, Users, NotFound
│       └── utils/          formatters (₱, dates), validators, constants, errors
├── tools/                  E2E test, screenshot capture, diagrams and documentation builder
└── docs/                   technical documentation, diagrams, screenshots
```

## Database Design

| Collection | Key fields | Relationships |
|---|---|---|
| `users` | name, email (unique), password (bcrypt, hidden), role (`admin`/`staff`), isActive | performs stock movements |
| `categories` | name (unique, case-insensitive), description | has many products |
| `suppliers` | name, contactPerson, phone, email, address | supplies many products (optional) |
| `products` | name, sku (unique, uppercase), category, supplier, unit, costPrice, sellingPrice, quantity, reorderLevel, image; virtuals `stockStatus`, `stockValue` | belongs to one category, optionally one supplier |
| `stockmovements` | product, productName/sku snapshots, type (`IN`/`OUT`), quantity, previousQty, newQty, reason, note, performedBy | belongs to one product and one user |

All collections have `createdAt`/`updatedAt` timestamps.

## Deployment

Both apps are separate Vercel projects connected to this GitHub repository, so every push to `main` redeploys them automatically.

| Vercel project | Root directory | Preset | Environment variables (Production) |
|---|---|---|---|
| `stockwise-api-ivan` | `server` | Express (serverless functions) | `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV=production`, `CLIENT_URL` |
| `stockwise-ivan` | `client` | Vite (static) | `VITE_API_URL=https://stockwise-api-ivan.vercel.app` |

`client/vercel.json` rewrites every path to `index.html`, so refreshing a deep link such as `/products/123` works. Deployment Protection is disabled on both projects so the production URLs are public.

## Getting Started (local)

Requirements: Node.js 20+ and a MongoDB Atlas (or local MongoDB) connection string.

```bash
git clone https://github.com/Ivan259483/stockwise.git
cd stockwise

# 1. API
cd server
cp .env.example .env        # then fill in MONGO_URI and JWT_SECRET
npm install
npm run seed                # resets the database and loads demo data
npm run dev                 # http://localhost:5050

# 2. Client (in a second terminal)
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:5050
npm install
npm run dev                 # http://localhost:5173

# 3. Tests (with both servers running)
cd server && npm run smoke                    # 40 API checks
cd tools && npm install && node e2e.mjs       # 30 headless-Chrome steps
```

## Environment Variables

**Server (`server/.env`)**

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB connection string (database `stockwise`) | `mongodb+srv://user:pass@cluster/stockwise?retryWrites=true&w=majority` |
| `JWT_SECRET` | Long random string used to sign tokens | 96 random hex characters |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CLIENT_URL` | Comma-separated origins allowed by CORS | `http://localhost:5173,https://stockwise-ivan.vercel.app` |
| `PORT` | Local port (macOS AirPlay uses 5000) | `5050` |
| `NODE_ENV` | `development` or `production` | `development` |

**Client (`client/.env`)**

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | API base URL, no trailing slash | `http://localhost:5050` |

## Testing

| Test | Command | Result (local and live) |
|---|---|---|
| API smoke test: 40 checks covering auth, CRUD, stock in/out, 409 insufficient stock, 400 invalid ID, 403 staff on admin route, 401 no token, 409 duplicate SKU | `cd server && npm run smoke` (set `API_URL=https://stockwise-api-ivan.vercel.app/api` for live) | 40/40 PASS |
| Browser E2E test: 30 headless-Chrome steps for admin and staff, covering validation errors, CRUD, stock movements, insufficient stock, the 375 px mobile layout, refreshing a nested route and session expiry | `cd tools && node e2e.mjs [baseUrl]` | 30/30 PASS |
| Lint and formatting | `npm run lint` · `npm run format:check` | 0 errors |
| Production build | `cd client && npm run build` | no warnings |

## Documentation

| File | Description |
|---|---|
| [`docs/StockWise_Technical_Documentation.docx`](docs/StockWise_Technical_Documentation.docx) | Technical documentation (Word) |
| [`docs/StockWise_Technical_Documentation.pdf`](docs/StockWise_Technical_Documentation.pdf) | Same document as PDF |
| [`docs/screenshots/`](docs/screenshots) | Screenshots of the live site at 1440 px and 390 px |
| [`docs/diagrams/`](docs/diagrams) | System architecture and a two-part ERD: product catalog and stock history (Mermaid sources + PNG) |
| [`docs/Presentation_Script.md`](docs/Presentation_Script.md) | 5-minute presentation outline and demo script |

The documents are generated from `tools/docs/content.mjs`: `cd tools && npm install && npm run screenshots && npm run diagrams && npm run docs`.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@stockwise.com` | `Admin123!` |
| Staff | `staff@stockwise.com` | `Staff123!` |

## API Endpoints

All responses are JSON. Success: `{ "success": true, "data": ... }`. Error: `{ "success": false, "message": "...", "errors": [{ "field": "sku", "message": "SKU already exists" }] }`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | Health check (also confirms the DB connection) |
| POST | `/api/auth/register` | public, rate-limited | Create a staff account; returns token + user |
| POST | `/api/auth/login` | public, rate-limited | Log in; returns JWT (1 day) + user |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/users` | admin | List users |
| PATCH | `/api/users/:id` | admin | Change role / isActive (not for yourself) |
| DELETE | `/api/users/:id` | admin | Delete a user (not yourself) |
| GET | `/api/categories` | logged in | List categories with product counts |
| POST | `/api/categories` | admin | Create a category |
| PUT | `/api/categories/:id` | admin | Update a category |
| DELETE | `/api/categories/:id` | admin | Delete (409 if products still use it) |
| GET | `/api/suppliers` | logged in | List suppliers with product counts |
| POST | `/api/suppliers` | admin | Create a supplier |
| PUT | `/api/suppliers/:id` | admin | Update a supplier |
| DELETE | `/api/suppliers/:id` | admin | Delete and unset it on its products |
| GET | `/api/products` | logged in | List: `?search=&category=&status=in_stock\|low_stock\|out_of_stock&sort=name\|-quantity\|price\|-createdAt&page=&limit=` → `{ data, page, totalPages, total }` |
| GET | `/api/products/:id` | logged in | One product (populated) + its last 20 movements |
| POST | `/api/products` | admin | Create (opening quantity is recorded as a movement) |
| PUT | `/api/products/:id` | admin | Update (quantity changes only through stock movements) |
| DELETE | `/api/products/:id` | admin | Delete (movement history is kept) |
| POST | `/api/stock/in` | logged in | `{ productId, quantity, reason, note }` |
| POST | `/api/stock/out` | logged in | Same body; 409 if stock is insufficient |
| GET | `/api/stock/movements` | logged in | History: `?product=&type=&from=&to=&page=&limit=` |
| GET | `/api/dashboard/summary` | logged in | Totals, low-stock list, recent movements, value by category, 7-day IN/OUT |

**Status codes:** 400 validation error or invalid ID · 401 missing/invalid/expired token · 403 wrong role · 404 not found · 409 duplicate SKU/email/category or insufficient stock · 429 too many failed login attempts · 500 unexpected error (details logged server-side only).

## License

MIT © 2026 Ivan Tadena
