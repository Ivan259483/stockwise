# StockWise: 5-Minute Presentation and Demo Script

**Presenter:** Ivan Tadena (solo) · **Subjects:** Integrative Programming and Technologies (INF238) and System Integration and Architecture (CTSYSINL) · **Client:** Santos Family Hardware

## Before you start (10 minutes ahead)

1. Make sure the data is fresh: `cd server && npm run seed` (local) — or the live Atlas database was re-seeded — then `npm run check-data` must end with **OK**.
2. Gmail SMTP is configured (`SMTP_USER`, `SMTP_PASS`; optionally `STOCK_ALERT_CC` = your email) on the API you will use. Without it, the reset code is printed in the backend console (local only).
3. Open these tabs, in order:
   1. the web app login page (logged out): https://stockwise-ivan.vercel.app/login or http://localhost:5173/login
   2. `docs/diagrams/architecture.png` and `docs/diagrams/po-workflow.png`
   3. Gmail (ivantadena21@gmail.com) on your phone or a second tab
   4. a terminal in `server/` (for `npm run check-data`)
4. Warm up the API once: open `/api/health`.
5. Zoom the browser to about 110%.

Accounts (all from the seed): owner **roberto.santos@santosfamilyhw-demo.com / Admin123!**; staff **ivantadena21@gmail.com** (your own mailbox, for password recovery).

## Timeline

| Time | Segment | Module shown |
|---|---|---|
| 0:00 – 0:25 | Client and problem | Target client |
| 0:25 – 0:55 | Architecture and integrations | Architecture, Gmail SMTP |
| 0:55 – 1:40 | Forgot password → reset → profile | Account Management |
| 1:40 – 2:45 | Purchase order from request to received | Core business process |
| 2:45 – 3:25 | Add, edit and archive a user | User Management |
| 3:25 – 4:15 | Archive rules and restore | Archive Module |
| 4:15 – 4:45 | Demo data and tests | Data cleanup, quality |
| 4:45 – 5:00 | Closing | |

## Script

### 0:00 – 0:25 · Client and problem
*Login page (shows "Santos Family Hardware").*
> "Good morning. I'm Ivan Tadena. My client is **Santos Family Hardware**, a family-owned hardware store run by Roberto and Maricel Santos with eight staff. They tracked stock in a logbook and ordered from suppliers by phone, so nobody knew what was ordered, who approved it, or whether it arrived. StockWise fixes that."

### 0:25 – 0:55 · Architecture and integrations
*Show `architecture.png`.*
> "StockWise is a MERN system with three tiers and one external service: a React client and an Express REST API, both on Vercel, MongoDB Atlas for data, and **Gmail SMTP** for emails. Every request carries a JWT and goes through middleware, authentication, validation, a controller and shared services. The stock service does every quantity change atomically, and the mailer sends password-reset codes and low-stock alerts."

### 0:55 – 1:40 · Account Management: password recovery and profile
*Click **Forgot password?**, type `ivantadena21@gmail.com`, click **Send reset code**.*
> "If a user forgets their password, the system emails a six-digit code. Only a hash of the code is stored, it expires in 15 minutes, and the request is rate-limited. The answer is the same for unknown emails, so nobody can use it to find accounts."

*Open Gmail, read the code, type it with a new password (e.g. `Demo2026!`) and click **Reset password**. Sign in with the new password.*
*Click your name in the header → **My Profile**.*
> "On My Profile every user can change their name, email and password. Changing the password signs out their other devices."

### 1:40 – 2:45 · Core business process: purchase orders
*Still signed in as Ivan (staff): **Purchase Orders → New purchase order**. Supplier **Quezon Paint Center**, product **Latex Paint White 4 L**, quantity **12** (unit cost fills in). Click **Submit request**.*
> "Staff create a PO request: supplier, items, quantities and unit costs. It starts as **Requested** and the timeline records who requested it."

*Log out, sign in as **Roberto** (owner). Point at the dashboard tile "waiting for your approval", open the new PO, click **Approve**.*
> "Only an owner can approve or reject. Rejecting needs a reason. The status change is atomic, so two people can't approve it twice."

*Go back to **Purchase Orders → Approved** tab, open the Quezon PO with **Paint Thinner** (out of stock) and click **Mark as received**.*
> "When the delivery arrives, the PO is marked **Received**, the completed state. The system records a stock-in movement for each item using the same atomic update as the stock page."

*Click **Paint Thinner** in the items → its quantity went from 0 to 24 and the movement shows the PO number. Back on the PO, point at the timeline.*

### 2:45 – 3:25 · User Management
*Open **Users** → **Add user**: name `Joel Pascual`, email `joel.pascual@santosfamilyhw-demo.com`, role Staff, password `Welcome2026`. Save. Click the pencil, change the role to **Admin**, save.*
> "Admins add users, edit their info and role, and switch accounts off. Role checks are in both the API and the UI, and my own controls are disabled so I can't lock myself out."

*Click the archive icon on Joel, reason `Demo account`, **Archive**.*
> "People who leave are archived, not deleted. An archived user can't log in, but their history stays."

### 3:25 – 4:15 · Archive Module
*Open **Products**, search `Deformed Bar`, click its archive icon, give a reason, **Archive**.*
> "This is blocked: the product is on an open purchase order, so the system tells me which PO to finish first."

*Archive **Brass Padlock 40 mm** instead (reason `Discontinued`). Show it is gone from the list and from the PO form's product dropdown. Open **Archive**: tabs for products, suppliers, users and purchase orders, with who archived each record, when and why. Click **View** on the padlock, then **Restore**.*
> "Archived records never appear in lists, searches or forms, only here, and they can be restored. Received, rejected and cancelled POs can be archived too."

### 4:15 – 4:45 · Demo data and quality
*Terminal: `npm run check-data`.*
> "All data you saw is presentation data for the client: ten users, 33 products, more than thirty received purchase orders with matching stock movements, and sales. This command checks that every stock level equals its movement history and flags anything that looks like test data. The automated tests, 115 API checks and a 49-step browser test, run only on a separate test database, so they never touch this data."

### 4:45 – 5:00 · Closing
> "StockWise now integrates a React client, a REST API, MongoDB Atlas and Gmail into one system for Santos Family Hardware: accounts, users, purchase orders and an archive that keeps every record. Next would be partial deliveries and emailing POs to suppliers. Thank you, I'm happy to take questions."

## If something goes wrong

- **No reset email:** check spam; locally, read the code from the backend console. Codes can be requested once a minute.
- **Locked out after resetting:** the presenter account's password is whatever you set during the demo; re-run the seed to restore `Staff123!`.
- **Want to show the low-stock email:** with `STOCK_ALERT_CC` set, pick a product just above its reorder level on the Products page (after a fresh seed, **Brass Faucet 1/2"** has 7 with reorder level 6) and record a **Stock out** of 1. The notice "The admins were emailed" appears and the alert arrives in your inbox. (Exact quantities can differ by a unit or two depending on the time of day the seed ran.)

## Likely questions (short answers)

- **What is "integration" here?** Four parts talk over defined interfaces: the React client and the REST API (JSON over HTTPS with JWT), the API and MongoDB Atlas (Mongoose), and the API and Gmail (SMTP over TLS). Receiving a PO also integrates two modules: purchase orders and stock movements share one stock service.
- **How do you stop double approval or double receiving?** Each status change is one database update that only matches while the PO is still in the expected status; the second click gets a 409.
- **What if receiving fails half-way?** The items already added are reverted and the PO goes back to Approved.
- **Why archive instead of delete?** Movements and POs point to products, suppliers and users; deleting them would break the history. Archive hides them but keeps every reference.
- **How is the reset code protected?** bcrypt hash only, 15-minute expiry, five guesses, one code per minute per account, a per-IP rate limit, and the same response for unknown emails.
- **Is the demo data real?** No. The store and people are fictional, and the email domain does not exist (checked with nslookup), except my own account for the recovery demo.
