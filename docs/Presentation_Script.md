# StockWise: 5-Minute Presentation and Demo Script

**Presenter:** Ivan Tadena (solo) · **Course:** Integrative Programming and Technologies, INF238

## Before you start (5 minutes ahead)

1. Optional reset for clean demo data: `cd server && npm run seed`.
2. Open these browser tabs, in order:
   1. https://stockwise-ivan.vercel.app/login (logged out)
   2. `docs/diagrams/architecture.png`
   3. https://github.com/Ivan259483/stockwise
3. Open https://stockwise-api-ivan.vercel.app/api/health once so the API is warm (avoids a cold start during the demo).
4. Zoom the browser to about 110% so the audience can read it.

## Timeline

| Time | Segment | What to show |
|---|---|---|
| 0:00 – 0:30 | Problem | Title slide or login page |
| 0:30 – 1:05 | Solution and architecture | Architecture diagram |
| 1:05 – 1:40 | Login and roles | Login page → admin dashboard |
| 1:40 – 2:15 | Dashboard | Stat cards, charts, restock list |
| 2:15 – 3:05 | Products (CRUD + validation) | Search, filter, add product |
| 3:05 – 3:50 | Stock movements | Stock in, insufficient stock out, history |
| 3:50 – 4:20 | Staff role and mobile | Staff login, phone layout |
| 4:20 – 4:50 | Engineering quality | GitHub repo, tests, deployment |
| 4:50 – 5:00 | Closing | Summary, invite questions |

## Script

### 0:00 – 0:30 · Problem
> "Good morning. I'm Ivan Tadena, and this is **StockWise**, an inventory management system for small Philippine businesses such as hardware stores and sari-sari stores. Many of them still track stock in paper logbooks. That leads to stockouts, overstocking, missing items, and no record of who changed what."

### 0:30 – 1:05 · Solution and architecture
*Show the architecture diagram.*
> "StockWise is a MERN application. The React client and the Express REST API are deployed as two Vercel projects, and the data lives in MongoDB Atlas. The client sends JSON over HTTPS with a JWT in the Authorization header. Every request passes through security middleware, authentication, validation and a controller, and any error goes through one central error handler."

### 1:05 – 1:40 · Login and roles
*On the login page, click **Sign in** with empty fields to show the inline errors, then click **Use Admin** and sign in.*
> "Forms are validated on the client and again on the server. There are two roles: an admin manages everything, and staff can view inventory and record stock movements. Passwords are hashed with bcrypt, and the session is a JWT that expires after one day."

### 1:40 – 2:15 · Dashboard
> "The dashboard shows 21 products, about ₱110,000 in stock value at cost, 5 low-stock items and 3 out-of-stock items. The bar chart shows value by category, and the line chart compares stock in and stock out over the last seven days. The *Needs restocking* list puts out-of-stock items first."

*Click the **Low stock** card. It opens the product list already filtered.*

### 2:15 – 3:05 · Products: CRUD and validation
*Type "hammer" in the search box (results update after 300 ms). Clear it, then click **Add product** and press **Create product** with an empty form.*
> "Search is debounced, and the filters live in the URL, so a refresh keeps them. Here, the empty form shows field-level errors."

*Fill in: Name `Demo Pliers 8"`, SKU `HT-PLR-008`, Category `Hand Tools`, cost 150, price 220, opening quantity 5. Click **Create product**.*
> "The opening stock is recorded automatically as the first stock movement, so the history is complete from day one."

### 3:05 – 3:50 · Stock movements and the business rule
*On the new product's page, click **Stock in**, enter 10 (reason Purchase) and save. The quantity becomes 15.*
*Click **Stock out** and enter 100.*
> "This is the key business rule. The server answers **409: Insufficient stock, only 15 available**. The check and the update happen in one atomic MongoDB operation, so even two cashiers at the same moment can't push stock below zero."

*Change the quantity to 3 and save. Scroll to **Movement history** to show previous and new quantities.*

### 3:50 – 4:20 · Staff role and mobile
*Log out, click **Use Staff** and sign in.*
> "Staff don't see the Users page or any edit buttons, and the API rejects those actions with 403 even if someone calls it directly."

*Open DevTools device mode (iPhone) or shrink the window.*
> "The layout is responsive: the sidebar becomes a drawer and tables become cards."

### 4:20 – 4:50 · Engineering quality
*Show the GitHub repository.*
> "The code is modular: models, controllers, routes, middleware and validators on the server; reusable components and hooks on the client. ESLint and Prettier enforce the coding standards. A 40-check API smoke test and a 30-step headless-Chrome end-to-end test both pass against the live site, and every push to GitHub redeploys automatically."

### 4:50 – 5:00 · Closing
> "In summary, StockWise gives small stores an accurate, auditable inventory with low-stock alerts. Next steps are barcode scanning, purchase orders and multi-branch support. Thank you. I'm happy to take questions."

## Likely questions (short answers)

- **Why MongoDB?** Product and movement documents map naturally to JSON, and Atlas gives a free managed cluster. Atomic operators like `$inc` handle the stock rule without transactions.
- **How is the JWT protected?** It is signed with a 96-character random secret stored only in environment variables. The server reloads the user on every request, so a deactivated user is blocked immediately.
- **What if two people sell the last item?** The stock-out is one conditional `findOneAndUpdate`; only one request can succeed. The other gets a 409.
- **Why can't quantity be edited directly?** Every change must go through stock in/out so it appears in the audit trail.
- **What happens when a product is deleted?** Its movements keep a snapshot of the name and SKU, so the history stays readable.
