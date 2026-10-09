# StockWise Build Progress

| Phase | Status | Notes |
|---|---|---|
| 0. Setup check | ✅ Done | Node 26.11, npm 11.20, git 2.54; `gh` and `vercel` logged in. Folder structure, `.gitignore`, README skeleton. |
| 1. Database | ✅ Done | Reuses the existing ShowCase Atlas cluster with a separate `stockwise` database. `server/.env` written (MONGO_URI + random 96-hex-char JWT_SECRET); values never printed. Atlas CLI not used (session expired). |
| 2. Backend | ✅ Done | Models, middleware, validators, controllers, routes, seed and smoke scripts. Seed: 2 users, 5 categories, 4 suppliers, 21 products, 31 movements. Local smoke test: **40/40 PASS**. |
| 3. Frontend | ⏳ Pending | |
| 4. Polish & code quality | ⏳ Pending | |
| 5. Deploy (Vercel API + Vercel client) | ⏳ Pending | |
| 6. Documentation | ⏳ Pending | |

## Decisions and deviations from the original brief

- **Database:** the Atlas CLI session had expired, so the API uses the existing ShowCase cluster with its own `stockwise` database (the `showcase` database is never touched).
- **API hosting:** Vercel serverless functions instead of Render. The Express app is exported from `server.js`; `app.listen` runs only when `VERCEL` is not set; the Mongoose connection is cached on `globalThis` across invocations.
- **Product quantity** can be set when a product is created (recorded as an "Opening stock" IN movement) but is not editable afterwards. All later changes go through Stock In/Out so every change is audited.
- **Stock reasons** are limited per direction: IN = Purchase, Return, Adjustment, Other; OUT = Sale, Damaged, Expired, Adjustment, Other.
- **Rate limiting** counts only failed login/register attempts (20 per 15 minutes per IP).
