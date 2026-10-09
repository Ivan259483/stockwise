# StockWise Build Progress

| Phase | Status | Notes |
|---|---|---|
| 0. Setup check | ✅ Done | Node 26.11, npm 11.20, git 2.54; `gh` and `vercel` logged in. Folder structure, `.gitignore`, README skeleton. |
| 1. Database | ✅ Done | Reuses the existing ShowCase Atlas cluster with a separate `stockwise` database. `server/.env` written (MONGO_URI + random 96-hex-char JWT_SECRET); values never printed. Atlas CLI not used (session expired). |
| 2. Backend | ✅ Done | Models, middleware, validators, controllers, routes, seed and smoke scripts. Seed: 2 users, 5 categories, 4 suppliers, 21 products, 31 movements. Local smoke test: **40/40 PASS**. |
| 3. Frontend | ✅ Done | All pages and the reusable UI kit. `npm run build`: no warnings. Local headless-Chrome E2E: 30/30 PASS (found and fixed a modal reset bug). |
| 4. Polish & code quality | ✅ Done | ESLint (client + server) and Prettier added; all lint findings fixed (useFetch rewritten without setState-in-effect / ref-in-render, ProductPicker extracted, context split for Fast Refresh, dead constant removed). Full README. Smoke 40/40, E2E 30/30 after refactor. |
| 5. Deploy (Vercel API + Vercel client) | ✅ Done | API: https://stockwise-api-ivan.vercel.app (Express preset, root `server`). Client: https://stockwise-ivan.vercel.app (Vite, root `client`). Both connected to GitHub `Ivan259483/stockwise` (auto-deploy on push), Deployment Protection off, env vars added with `vercel env add` (values never printed). CORS verified. Live smoke **40/40**, live E2E **30/30**. Database re-seeded afterwards. |
| 6. Documentation | ✅ Done | 18 screenshots from the live site (1440 px + 390 px), Mermaid architecture + ERD PNGs, 31-page .docx (Arial, 14 pt headings, 11 pt body, 1.5 spacing, 1-inch margins, page numbers, captions, TOC with page numbers) and a matching PDF printed by headless Chrome. Presentation script in `docs/Presentation_Script.md`. |

## Decisions and deviations from the original brief

- **Database:** the Atlas CLI session had expired, so the API uses the existing ShowCase cluster with its own `stockwise` database (the `showcase` database is never touched).
- **API hosting:** Vercel serverless functions instead of Render. The Express app is exported from `server.js`; `app.listen` runs only when `VERCEL` is not set; the Mongoose connection is cached on `globalThis` across invocations.
- **Product quantity** can be set when a product is created (recorded as an "Opening stock" IN movement) but is not editable afterwards. All later changes go through Stock In/Out so every change is audited.
- **Stock reasons** are limited per direction: IN = Purchase, Return, Adjustment, Other; OUT = Sale, Damaged, Expired, Adjustment, Other.
- **Rate limiting** counts only failed login/register attempts (20 per 15 minutes per IP).
- **TOC:** lists the nine main headings at 1.5 spacing (like all other text) so it fits on page 2. "Live Deliverables" starts a new page so Word and Chrome paginate page 3 identically.
- **ERD:** split into two diagrams (product catalog, stock history) so the labels print at about 11 pt; field constraints are in Tables 2–6.
- **PDF line height:** the HTML used for the PDF sets `line-height: 1.725`, because Word's "1.5 lines" for Arial equals 1.5 × 1.15 em. The two files paginate identically (all 34 TOC entries land on the same pages).
