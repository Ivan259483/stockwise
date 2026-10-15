# StockWise: Inventory and Purchasing System

> A full-stack MERN web application for **Santos Family Hardware**, a family-owned hardware store: products, stock in and out, purchase orders to suppliers, low-stock email alerts, account and user management, and an archive that keeps every record.

Final project for two subjects by **Ivan Tadena**:

| Subject | Code | Version |
|---|---|---|
| Integrative Programming and Technologies | INF238 | tag [`ipt-version`](https://github.com/Ivan259483/stockwise/tree/ipt-version) |
| System Integration and Architecture | CTSYSINL | branch `ctsysinl` (this README) |

## Live Links

| Resource | URL |
|---|---|
| Web app (Vercel) | https://stockwise-ivan.vercel.app |
| REST API (Vercel serverless functions) | https://stockwise-api-ivan.vercel.app (health: [/api/health](https://stockwise-api-ivan.vercel.app/api/health)) |
| Source code | https://github.com/Ivan259483/stockwise |

## Target Client: Santos Family Hardware

Santos Family Hardware is a (fictional) family-owned hardware store run by the spouses **Roberto and Maricel Santos** with eight employees. It sells about 35 kinds of products in eight categories (hand tools, power tools, electrical, plumbing, paints, construction materials, fasteners, safety gear) to walk-in customers and small contractors, and buys from six regular suppliers. Before StockWise, stock was kept in a paper logbook and supplier orders were agreed by phone, so nobody could tell what was ordered, who approved it, or whether it arrived.

The store name is shown as text only (no logo). All demo accounts use the made-up domain `santosfamilyhw-demo.com`, which does not exist (checked with `nslookup`: NXDOMAIN), so the system never sends email to them.

### Users and roles

| People (job) | Role | What they do |
|---|---|---|
| Roberto and Maricel Santos (owners) | **admin** | Manage the catalog, suppliers and users; approve or reject purchase orders; archive and restore records |
| Lorna Mercado (purchasing clerk) | staff | Watches low stock and creates purchase order requests |
| Jomar Dizon, Rodel Bautista (warehouse) | staff | Record damaged stock, request urgent orders, receive deliveries |
| Ferdinand Garcia (receiving) | staff | Marks approved purchase orders as received when deliveries arrive |
| Kristine Mae Villanueva, Angelica Ramos (cashiers); Paolo Navarro, Ivan Tadena (sales) | staff | Record sales as stock-out movements and check stock for customers |

### Core business process: purchase orders

```
 stock at or below reorder level ──► REQUESTED ──admin approves──► APPROVED ──delivery arrives──► RECEIVED (completed)
   (dashboard + email alert)          │   staff creates PO:              │                           one stock IN per item,
                                      │   supplier, items, qty, cost     │                           atomic $inc, reason "Purchase"
                                      ├──admin rejects (reason)──► REJECTED
                                      └──requester/admin cancels──► CANCELLED        closed POs can be archived by an admin
```

1. A staff member (usually the purchasing clerk) creates a PO request with a supplier, items, quantities and unit costs → **Requested**.
2. An owner (admin) **approves** it, or **rejects** it with a reason. The requester or an admin can **cancel** it while it is still Requested.
3. When the delivery arrives, staff or an admin marks the approved PO **Received**. This records a stock IN movement for each item and updates stock with the same atomic update the Stock Movements page uses.
4. Every step is written to the PO timeline (who, what, when). The PO list has status filters and the dashboard shows PO counts.

## Features

| Module | What it does |
|---|---|
| **Authentication & roles** | JWT login (1 day), bcrypt passwords, rate-limited auth endpoints, `admin` and `staff` roles enforced in the API and the UI. Deactivated or archived users cannot log in. |
| **Account management** | *My Profile*: edit own name and email, change password (signs out other sessions via a token version). **Password recovery**: "Forgot password?" emails a 6-digit code (bcrypt-hashed, 15-minute expiry, 5 guesses, 1 code/minute per account, per-IP rate limit), then the user sets a new password. |
| **User management** | Admins add users (role + temporary password), edit name, email and role, activate/deactivate and archive users. Admins cannot demote, deactivate or archive themselves. |
| **Purchase orders** | Requested → Approved / Rejected / Cancelled → Received, with atomic status changes (no double approval or double receipt), timeline, status tabs with counts, search, PO details, dashboard counts and an "Order" shortcut from the restock list. |
| **Archive** | Archive (with a reason) replaces delete for products, suppliers and users; admins also archive received, rejected or cancelled POs. Archived records never appear in active lists, searches, dropdowns, stock forms or PO forms, only on the Archive page (one tab per type) where admins view and restore them. Archiving is blocked for products/suppliers on open POs. History is always kept. |
| **Low-stock email alerts** | When a sale leaves a product at or below its reorder level, every active admin is emailed once; restocking above the reorder level re-arms the alert. |
| **Dashboard** | Stock value, low/out-of-stock counts, PO counts by status, value by category, 7-day stock in/out chart, restock list, recent movements. |
| **Products, stock, categories, suppliers** | Search/filter/sort/paginate products, images ≤ 1 MB, atomic stock in/out that never goes negative (409 "Insufficient stock"), full movement history with PO links. |
| **Validation & errors** | express-validator on every write route, one JSON error shape, inline field errors, a toast for every failed request. |
| **Responsive UI** | 360 px phones to desktops: drawer navigation, mobile cards, scrollable status tabs. |

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router 7, Axios, Recharts, react-hot-toast, lucide-react |
| Backend | Node.js, Express 5 (ES modules), Mongoose 9, jsonwebtoken, bcryptjs, express-validator, helmet, cors, morgan, express-rate-limit, **Nodemailer** |
| Database | MongoDB Atlas (live, database `stockwise`); local MongoDB 8.0 for development (`stockwise_dev`) and tests (`stockwise_test`) |
| Integrations | **Gmail SMTP** (password-reset codes, low-stock alerts) |
| Hosting | Vercel: static React build + Express as serverless functions |
| Tooling | ESLint, Prettier, 115-check API smoke test, 49-step headless-Chrome E2E test, `check-data` |

## Architecture

```
┌────────────────────────┐   HTTPS + JSON (REST)   ┌──────────────────────────────┐   Mongoose    ┌───────────────────────┐
│  React SPA (Vite)      │ ──────────────────────► │  Express API                 │ ────────────► │  MongoDB Atlas        │
│  Vercel static hosting │  Authorization: Bearer  │  Vercel serverless functions │               │  users, categories,   │
│  stockwise-ivan        │ ◄────────────────────── │  stockwise-api-ivan          │ ◄──────────── │  suppliers, products, │
└────────────────────────┘   { success, data }     └──────────────┬───────────────┘               │  stockmovements,      │
                                                                  │ Nodemailer (TLS, App password)│  purchaseorders,      │
                                                                  ▼                               │  counters             │
                                                       ┌──────────────────────┐                   └───────────────────────┘
                                                       │  Gmail SMTP          │
                                                       │  reset codes, alerts │
                                                       └──────────────────────┘
```

**Request flow:** `helmet` → `cors` → `express.json` → `morgan` → `dbConnect` → rate limiter (auth routes) → `protect` (verify JWT, reload user, reject deactivated/archived users and outdated tokens) → `authorize(role)` → `validate(rules)` → controller → services (`stockService`, `stockAlerts`, `mailer`) → central `errorHandler`.

### Project structure

```
stockwise/
├── server/
│   ├── models/             User, Category, Supplier, Product, StockMovement, PurchaseOrder, Counter
│   │   └── plugins/        archivable.js (archived, archivedAt, archivedBy, archiveReason, archiveLog)
│   ├── controllers/        auth, users, categories, suppliers, products, stock, purchaseOrders, archive, dashboard
│   ├── routes/ validators/ middleware/ utils/
│   ├── services/           stockService (atomic stock), stockAlerts, mailer (Gmail SMTP), emailTemplates
│   ├── scripts/            seed.js (presentation data), seed-test.js (test fixtures), smoke.js, check-data.js
│   ├── .env.example        all variables, with comments
│   └── .env.test           committed: local stockwise_test database only, no secrets
├── client/src/
│   ├── pages/              Login, Register, ForgotPassword, ResetPassword, Profile, Dashboard, Products, ProductForm,
│   │                       ProductDetails, StockMovements, PurchaseOrders, PurchaseOrderForm, PurchaseOrderDetails,
│   │                       Categories, Suppliers, Users, Archive, NotFound
│   └── components/         ui/ (incl. ReasonDialog), layout/, forms/ (incl. UserFormModal), purchase-orders/, dashboard/, stock/
├── tools/                  run-tests.mjs, e2e.mjs, screenshots.mjs, build-docs.mjs, docs/content.mjs
└── docs/                   technical documentation (.docx/.pdf), diagrams, screenshots, presentation script
```

## Database Design

| Collection | Key fields | Relationships |
|---|---|---|
| `users` | name, email (unique), password (bcrypt), role, isActive, passwordChangedAt, tokenVersion, resetCodeHash / resetCodeExpires / resetCodeAttempts (hidden), **archive fields** | requests/approves/receives POs, performs movements |
| `categories` | name (unique, case-insensitive), description | has many products |
| `suppliers` | name, contactPerson, phone, email, address, **archive fields** | supplies products, receives POs |
| `products` | name, sku (unique), category, supplier, unit, costPrice, sellingPrice, quantity, reorderLevel, lowStockAlertSentAt, image, **archive fields** | belongs to a category and optionally a supplier |
| `stockmovements` | product, productName/sku snapshots, type, quantity, previousQty, newQty, reason, note, performedBy, purchaseOrder, poNumber | belongs to a product and a user; optionally a PO |
| `purchaseorders` | poNumber (unique), supplier + supplierName, **items[]** {product, productName, sku, unit, quantity, unitCost, lineTotal}, totalAmount, notes, status, requestedBy, approvedBy/At, rejectedBy/At + rejectionReason, receivedBy/At, cancelledBy/At + cancellationReason, **history[]** {action, by, at, note}, **archive fields** | one supplier; many users; items reference products |
| `counters` | _id (sequence name), seq | atomic PO numbering |

**Archive fields** (users, suppliers, products, purchaseorders): `archived`, `archivedAt`, `archivedBy`, `archiveReason`, `archiveLog[]`. Active queries use `{ archived: { $ne: true } }`, so records created before the archive feature count as active without a migration.

## Getting Started (local)

Requirements: Node.js 20+, MongoDB running locally (`brew services start mongodb-community@8.0`), Google Chrome (for the E2E test).

```bash
git clone https://github.com/Ivan259483/stockwise.git && cd stockwise && git checkout ctsysinl

# 1. API
cd server
cp .env.example .env        # MONGO_URI=mongodb://127.0.0.1:27017/stockwise_dev, JWT_SECRET, optional SMTP_*
npm install
npm run seed                # presentation data for Santos Family Hardware (local DB)
npm run check-data          # counts, consistency checks, test/dummy-data flags
npm run dev                 # http://localhost:5050

# 2. Client (second terminal)
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:5050
npm install
npm run dev                 # http://localhost:5173

# 3. All automated tests (isolated stockwise_test database, own servers on :5051/:5174)
cd tools && npm install && npm test
```

`npm run seed` refuses `*_test` databases and refuses any non-local database (e.g. Atlas) unless you add `-- --remote-ok`.

## Environment Variables

**Server (`server/.env`)**

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/stockwise_dev` (local) or the Atlas URI (Vercel) |
| `JWT_SECRET` | Long random string used to sign tokens | 96 random hex characters |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CLIENT_URL` | Comma-separated origins allowed by CORS | `http://localhost:5173,https://stockwise-ivan.vercel.app` |
| `PORT` / `NODE_ENV` | Local port; `development`, `production` or `test` | `5050` / `development` |
| `SMTP_HOST`, `SMTP_PORT` | Gmail SMTP server | `smtp.gmail.com`, `465` |
| `SMTP_USER` | Gmail address that sends the emails | `yourname@gmail.com` |
| `SMTP_PASS` | 16-character Google **App password** (Google Account → Security → 2-Step Verification → App passwords), not your Gmail password | `abcd efgh ijkl mnop` |
| `MAIL_FROM_NAME` | Sender name | `Santos Family Hardware (StockWise)` |
| `STOCK_ALERT_CC` | Optional extra recipients for low-stock alerts (the demo admins use a made-up domain) | your own email |
| `APP_URL` | Optional web-app address for links in alerts | `https://stockwise-ivan.vercel.app` |

If `SMTP_USER`/`SMTP_PASS` are empty, nothing is emailed; in development the email (including the reset code) is printed in the backend console instead.

**Client (`client/.env`)**: `VITE_API_URL` — API base URL, no trailing slash.

## Testing

Tests never touch the demo or live data: they run against a separate local `stockwise_test` database, and both refuse to start if the API reports any database whose name does not end in `_test`. Reset codes are read from a test mail outbox (`server/tmp/outbox.jsonl`) that the API writes only when `NODE_ENV=test`.

| Test | Command | Result |
|---|---|---|
| Everything below in one go (seeds, starts test servers, runs all, stops them) | `cd tools && npm test` | PASS |
| Seed check: presentation seed into a throwaway `stockwise_seedcheck` DB + `check-data` | part of `npm test` | PASS |
| API smoke test (115 checks): auth, profile, password change, recovery with emailed code, user management, CRUD, stock in/out, full PO workflow incl. double-approval/receipt protection, archive rules, low-stock alerts, roles and error codes | `cd server && npm run seed:test && npm run dev:test`, then `npm run smoke` | 115/115 |
| Browser E2E (49 steps): both roles, recovery, profile, users, PO create/approve/receive/cancel, archive/restore, archived login, low-stock alert, 375 px layout | `cd client && npm run dev:test`, then `cd tools && npm run e2e` | 49/49 |
| Data check of the demo database | `cd server && npm run check-data` | OK |
| Lint and formatting | `npm run lint` · `npm run format:check` | 0 errors |

## Documentation

| File | Description |
|---|---|
| [`docs/StockWise_Technical_Documentation.docx`](docs/StockWise_Technical_Documentation.docx) / [`.pdf`](docs/StockWise_Technical_Documentation.pdf) | Technical documentation (both subjects on the cover) |
| [`docs/diagrams/`](docs/diagrams) | Architecture (with Gmail SMTP and purchase orders), PO workflow, three-part ERD (Mermaid sources + PNG) |
| [`docs/screenshots/`](docs/screenshots) | 38 screenshots at 1440 px and 390 px, plus the two emails |
| [`docs/Presentation_Script.md`](docs/Presentation_Script.md) | 5-minute presentation and demo script |

Rebuild: `cd tools && npm run diagrams && node screenshots.mjs && npm run docs` (screenshots need the local demo stack running).

## Demo Accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin (owner) | `roberto.santos@santosfamilyhw-demo.com` | `Admin123!` |
| Admin (owner) | `maricel.santos@santosfamilyhw-demo.com` | `Admin123!` |
| Staff (purchasing) | `lorna.mercado@santosfamilyhw-demo.com` | `Staff123!` |
| Staff (cashier) | `kristine.villanueva@santosfamilyhw-demo.com` | `Staff123!` |
| Staff (receiving) | `ferdinand.garcia@santosfamilyhw-demo.com` | `Staff123!` |

Every seeded staff account uses `Staff123!` and every admin `Admin123!`. One staff account belongs to the presenter's real mailbox so Password Recovery can be shown live.

## API Endpoints

All responses are JSON: `{ "success": true, "data": ... }` or `{ "success": false, "message": "...", "errors": [{ "field", "message" }] }`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | Health check (and DB name outside production) |
| POST | `/api/auth/register` · `/api/auth/login` | public, rate-limited | Create a staff account · log in (JWT) |
| POST | `/api/auth/forgot-password` | public, rate-limited | Email a 6-digit reset code (same answer for unknown emails) |
| POST | `/api/auth/reset-password` | public, rate-limited | `{ email, code, password }` |
| GET / PATCH | `/api/auth/me` | logged in | Current user · edit own name/email |
| PATCH | `/api/auth/me/password` | logged in | `{ currentPassword, newPassword }` → new token |
| GET / POST | `/api/users` | admin | Active users · add a user with a role |
| PATCH | `/api/users/:id` | admin | Edit name, email, role or isActive (not your own role/status) |
| GET / POST | `/api/categories` · PUT / DELETE `/api/categories/:id` | read: logged in; write: admin | Categories (DELETE refused while any product uses it) |
| GET / POST | `/api/suppliers` · PUT `/api/suppliers/:id` | read: logged in; write: admin | Active suppliers |
| GET / POST | `/api/products` · GET / PUT `/api/products/:id` | read: logged in; write: admin | Active products with search/filter/sort/paging |
| POST | `/api/stock/in` · `/api/stock/out` · GET `/api/stock/movements` | logged in | Atomic stock changes · history |
| GET / POST | `/api/purchase-orders` | logged in | `?status=&search=&supplier=&page=` with per-status `counts` · create a request |
| GET | `/api/purchase-orders/:id` | logged in | PO with people, supplier and timeline |
| PATCH | `/api/purchase-orders/:id/approve` · `/reject` | admin | Requested → Approved · Rejected (`reason` required) |
| PATCH | `/api/purchase-orders/:id/cancel` | requester or admin | Requested → Cancelled |
| PATCH | `/api/purchase-orders/:id/receive` | logged in | Approved → Received, one stock IN per item |
| PATCH | `/api/{products,suppliers,users,purchase-orders}/:id/archive` | admin | Archive with `{ reason }` (rules above) |
| PATCH | `/api/{products,suppliers,users,purchase-orders}/:id/restore` | admin | Restore |
| GET | `/api/archive/:type` | admin | Archived `products`, `suppliers`, `users` or `purchase-orders` |
| GET | `/api/dashboard/summary` | logged in | Totals, charts, restock list, recent movements, PO counts |

**Status codes:** 400 validation · 401 missing/invalid/expired/outdated token · 403 wrong role or archived/deactivated login · 404 not found · 409 duplicates, insufficient stock, invalid workflow step, archive blocked · 429 rate limited · 500 unexpected.

## Deployment

Two Vercel projects connected to this repository (`main` auto-deploys):

| Vercel project | Root | Environment variables (Production) |
|---|---|---|
| `stockwise-api-ivan` | `server` | `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV=production`, `CLIENT_URL`, and for email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_NAME`, optional `STOCK_ALERT_CC`, `APP_URL` |
| `stockwise-ivan` | `client` | `VITE_API_URL=https://stockwise-api-ivan.vercel.app` |

## License

MIT © 2026 Ivan Tadena
